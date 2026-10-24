import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const repository =
  process.env.GITHUB_REPOSITORY ||
  pkg.repository?.url?.replace(/^https:\/\/github.com\//, '').replace(/\.git$/, '') ||
  '';
if (repository && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
  throw new Error('Expected GitHub owner/repo');
const revision = process.env.GITHUB_SHA || '';
if (revision && !/^[a-f0-9]{40}$/.test(revision)) throw new Error('Expected full commit SHA');
export const buildInfo = {
  version: pkg.version,
  repository: repository ? `https://github.com/${repository}` : '',
  revision,
  source: repository
    ? `https://github.com/${repository}${revision ? `/tree/${revision}` : ''}`
    : '',
  workflow:
    repository && process.env.GITHUB_RUN_ID
      ? `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '',
  license: 'MIT',
};
