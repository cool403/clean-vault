// Encrypted snapshots live in the origin-private file system. They are always
// ciphertext .db bytes and never contain decrypted vault data.
const DIRECTORY = 'clearvault-snapshots';
const encoder = new TextEncoder();
async function defaultDirectory() {
  return globalThis.navigator?.storage?.getDirectory?.() || null;
}
async function prefixFor(name) {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', encoder.encode(String(name || 'unnamed'))),
  );
  return (
    'clearvault-' +
    [...digest.slice(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('') +
    '-'
  );
}
function parseTime(name) {
  const match = /^clearvault-[\da-f]+-(\d{13})-/.exec(name);
  return match ? Number(match[1]) : 0;
}
export function snapshotsSupported() {
  return Boolean(globalThis.navigator?.storage?.getDirectory);
}
export function createSnapshotStore({
  getDirectory = defaultDirectory,
  now = () => Date.now(),
  uuid = () => crypto.randomUUID(),
  retention = 10,
} = {}) {
  async function directory() {
    try {
      const root = await getDirectory();
      if (!root) return null;
      return await root.getDirectoryHandle(DIRECTORY, { create: true });
    } catch {
      return null;
    }
  }
  async function entries(prefix) {
    const dir = await directory();
    if (!dir) return { dir: null, list: [] };
    const list = [];
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file' && name.startsWith(prefix)) list.push(name);
    }
    return { dir, list };
  }
  async function write(name, bytes, limit = retention) {
    const dir = await directory();
    if (!dir) return false;
    const prefix = await prefixFor(name);
    const fileName = prefix + now() + '-' + uuid() + '.db';
    const handle = await dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(bytes);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => {});
      throw error;
    }
    const written = await handle.getFile();
    if (written.size !== bytes.length) {
      await dir.removeEntry(fileName).catch(() => {});
      throw new Error('snapshot length verification failed');
    }
    const { list: files } = await entries(prefix);
    files.sort((a, b) => parseTime(b) - parseTime(a) || b.localeCompare(a));
    for (const old of files.slice(Math.max(1, limit))) await dir.removeEntry(old).catch(() => {});
    return true;
  }
  async function list(name) {
    const { list: files } = await entries(await prefixFor(name));
    return files
      .map((entry) => ({ name: entry, time: parseTime(entry) }))
      .sort((a, b) => b.time - a.time || b.name.localeCompare(a.name));
  }
  async function read(fileName) {
    const dir = await directory();
    if (!dir) return null;
    const handle = await dir.getFileHandle(fileName);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
  async function remove(fileName) {
    const dir = await directory();
    if (!dir) return false;
    await dir.removeEntry(fileName);
    return true;
  }
  async function clear(name) {
    const { dir, list: files } = await entries(await prefixFor(name));
    if (!dir) return 0;
    for (const file of files) await dir.removeEntry(file).catch(() => {});
    return files.length;
  }
  return { write, list, read, remove, clear };
}
