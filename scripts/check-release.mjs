import { buildInfo } from './project.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from 'prettier/plugins/babel';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(root, 'release');
const stage = await mkdtemp(path.join(release, 'verify-'));

async function checkJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'vendor') await checkJavaScript(target);
    } else if (entry.name.endsWith('.map')) {
      assert.fail('Source maps must not be included in production artifacts');
    } else if (entry.name.endsWith('.js')) {
      const source = await readFile(target, 'utf8');
      assert.ok(source.length > 0, target);
      assert.ok(!source.includes('sourceMappingURL='), target);
      const ast = await parsers.babel.parse(source, {});
      const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (['CallExpression', 'NewExpression'].includes(node.type)) {
          assert.ok(
            !(
              node.callee?.type === 'Identifier' && ['eval', 'Function'].includes(node.callee.name)
            ),
            'Production code must work without unsafe-eval: ' + target,
          );
        }
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') visit(value);
        }
      };
      visit(ast);
    }
  }
}

try {
  await cp(path.join(release, 'web'), path.join(stage, 'dist'), { recursive: true });
  await cp(path.join(release, 'extension'), path.join(stage, 'extension'), { recursive: true });
  await cp(path.join(root, 'tests'), path.join(stage, 'tests'), { recursive: true });
  await writeFile(path.join(stage, 'package.json'), '{"type":"module"}\n');
  await checkJavaScript(path.join(stage, 'dist'));
  await checkJavaScript(path.join(stage, 'extension'));
  assert.equal(
    await readFile(path.join(root, 'out', 'app.js'), 'utf8'),
    await readFile(path.join(stage, 'dist', 'app.js'), 'utf8'),
  );
  for (const name of ['app.js', 'crypto.js', 'safe-save.js']) {
    const source = await readFile(path.join(root, 'dist', name), 'utf8');
    const runtime = await readFile(path.join(stage, 'dist', name), 'utf8');
    assert.equal(runtime, source, `${name} must match the readable source byte for byte`);
    assert.ok(!runtime.includes('sourceMappingURL='), 'Do not publish source maps');
  }
  const manifest = JSON.parse(
    await readFile(path.join(release, 'web', 'ASSET-SHA256SUMS.json'), 'utf8'),
  );
  async function deployedFiles(directory, prefix = '') {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory())
        result.push(...(await deployedFiles(path.join(directory, entry.name), relative + '/')));
      else result.push(relative);
    }
    return result;
  }
  const webRoot = path.join(release, 'web');
  const deployed = (await deployedFiles(webRoot)).filter(
    (file) => file !== 'ASSET-SHA256SUMS.json',
  );
  assert.deepEqual(
    Object.keys(manifest).sort(),
    deployed.sort(),
    'Manifest must cover every deployed asset',
  );
  for (const file of deployed.filter((file) => file.endsWith('.js'))) {
    assert.equal(
      await readFile(path.join(webRoot, file), 'utf8'),
      await readFile(path.join(root, 'dist', file), 'utf8'),
      file,
    );
  }
  for (const name of ['LICENSE', 'NOTICE']) {
    for (const directory of ['web', 'extension']) {
      assert.equal(
        await readFile(path.join(release, directory, name), 'utf8'),
        await readFile(path.join(root, name), 'utf8'),
      );
    }
  }
  const metadata = JSON.parse(await readFile(path.join(webRoot, 'build-info.json'), 'utf8'));
  assert.deepEqual(metadata, buildInfo);
  if (process.env.GITHUB_SHA) {
    assert.equal(metadata.revision, process.env.GITHUB_SHA);
    assert.equal(metadata.source, metadata.repository + '/tree/' + metadata.revision);
    assert.equal(
      metadata.workflow,
      metadata.repository + '/actions/runs/' + process.env.GITHUB_RUN_ID,
    );
  }
  for (const [file, expected] of Object.entries(manifest)) {
    const bytes = await readFile(path.join(release, 'web', file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, file);
  }
  const tests = (await readdir(path.join(stage, 'tests')))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => path.join(stage, 'tests', name));
  // Check the actual production modules, including crypto interoperability and
  // Chrome's serialized fill function, using the complete existing suite.
  execFileSync(process.execPath, ['--test', ...tests], { cwd: stage, stdio: 'inherit' });
  console.log('Production artifact checks passed.');
} finally {
  assert.equal(path.dirname(path.resolve(stage)), path.resolve(release));
  await rm(stage, { recursive: true, force: true });
}
