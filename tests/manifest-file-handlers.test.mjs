import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('all PWA manifests associate .db files and reuse an existing window', async () => {
  for (const name of [
    'manifest.webmanifest',
    'manifest.en.webmanifest',
    'manifest.de.webmanifest',
    'manifest.ja.webmanifest',
    'manifest.es.webmanifest',
  ]) {
    const manifest = JSON.parse(await readFile(new URL(`../dist/${name}`, import.meta.url)));
    assert.deepEqual(manifest.file_handlers, [
      { action: './', accept: { 'application/octet-stream': ['.db'] } },
    ]);
    assert.deepEqual(manifest.launch_handler, { client_mode: 'navigate-existing' });
  }
});
