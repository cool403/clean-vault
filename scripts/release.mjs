// Run the release packager with whichever Python 3 executable is available.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'release.py');
const candidates =
  process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
const python = candidates.find(
  (command) => spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0,
);
if (!python) {
  console.error('Python 3.10+ is required to build release artifacts.');
  process.exit(1);
}
const result = spawnSync(python, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
