import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint, saveSafely, listBackups } from '../dist/safe-save.js';

function file(name, initial = new Uint8Array(), options = {}) {
  let bytes = initial.slice();
  const handle = {
    name,
    kind: 'file',
    isSameEntry: async (other) => other === handle,
    getFile: async () => ({
      size: bytes.length,
      lastModified: 1,
      arrayBuffer: async () => bytes.slice().buffer,
    }),
    createWritable: async () => {
      if (options.denied) throw new Error('permission denied');
      let pending;
      return {
        write: async (value) => {
          pending = value.slice();
        },
        close: async () => {
          bytes = options.corrupt ? new Uint8Array([99]) : pending;
        },
        abort: async () => {},
      };
    },
    bytes: () => bytes,
    change: (value) => {
      bytes = value;
    },
  };
  return handle;
}
function directory() {
  const entries = new Map();
  return {
    entries: async function* () {
      yield* entries;
    },
    getFileHandle: async (name) => {
      if (!entries.has(name)) entries.set(name, file(name));
      return entries.get(name);
    },
    removeEntry: async (name) => {
      entries.delete(name);
    },
    all: entries,
  };
}
// 验证保存前备份原始密文、保存后校验内容，且备份保留策略仅作用于当前密码库。
test('backs up original ciphertext, verifies save, scopes retention to this vault', async () => {
  const old = Uint8Array.of(5, 5, 2, 4),
    current = file('vault.db', old),
    dir = directory();
  dir.all.set('personal.db', file('personal.db', old));
  const next = Uint8Array.of(5, 5, 2, 8);
  const result = await saveSafely({
    handle: current,
    bytes: next,
    expectedHash: await fingerprint(old),
    directory: dir,
    name: 'vault.db',
    retention: 1,
  });
  assert.deepEqual(current.bytes(), next);
  assert.equal(result.backup, true);
  const backups = await listBackups(dir, 'vault.db');
  assert.equal(backups.length, 1);
  assert.deepEqual(backups[0].handle.bytes(), old);
  await saveSafely({
    handle: current,
    bytes: old,
    expectedHash: result.hash,
    directory: dir,
    name: 'vault.db',
    retention: 1,
  });
  assert.equal((await listBackups(dir, 'vault.db')).length, 1);
  assert.ok(dir.all.has('personal.db'));
});
// 验证文件大小和修改时间未变时，仍能根据内容发现外部修改冲突。
test('content conflict is detected even when size and modification time match', async () => {
  const original = Uint8Array.of(1, 2, 3),
    current = file('vault.db', Uint8Array.of(1, 2, 4));
  await assert.rejects(
    saveSafely({
      handle: current,
      bytes: original,
      expectedHash: await fingerprint(original),
      name: 'vault.db',
      directory: directory(),
    }),
    (error) => error.code === 'conflict' && /原文件已/.test(error.message),
  );
  assert.deepEqual(current.bytes(), Uint8Array.of(1, 2, 4));
});
// 验证清理备份时不会删除其他来源的同名密码库备份。
test('retention never removes another source with the same filename', async () => {
  const dir = directory(),
    a = file('SafeInCloud.db', Uint8Array.of(1)),
    b = file('SafeInCloud.db', Uint8Array.of(2));
  await saveSafely({
    handle: a,
    bytes: Uint8Array.of(3),
    directory: dir,
    name: a.name,
    retention: 1,
  });
  await saveSafely({
    handle: b,
    bytes: Uint8Array.of(4),
    directory: dir,
    name: b.name,
    retention: 1,
  });
  await saveSafely({
    handle: a,
    bytes: Uint8Array.of(5),
    directory: dir,
    name: a.name,
    retention: 1,
  });
  const backups = await listBackups(dir, a.name);
  assert.equal(backups.length, 2);
  assert.ok(backups.some((item) => item.handle.bytes()[0] === 2));
});
// 验证备份失败时阻止覆盖原文件，目标写入失败时仍保留有效备份。
test('backup failure prevents overwrite; target write failure keeps valid backup', async () => {
  const old = Uint8Array.of(1, 2),
    current = file('vault.db', old);
  await assert.rejects(
    saveSafely({
      handle: current,
      bytes: Uint8Array.of(3),
      name: 'vault.db',
      directory: {
        getFileHandle: async () => {
          throw new Error('denied');
        },
      },
    }),
    /denied/,
  );
  assert.deepEqual(current.bytes(), old);
  const denied = file('vault.db', old, { denied: true }),
    dir = directory();
  await assert.rejects(
    saveSafely({ handle: denied, bytes: Uint8Array.of(3), name: 'vault.db', directory: dir }),
    /denied/,
  );
  assert.deepEqual((await listBackups(dir, 'vault.db'))[0].handle.bytes(), old);
});
// 验证能够发现备份期间的外部修改及写入后的内容损坏。
test('detects external changes during backup and corrupted writes', async () => {
  const current = file('vault.db', Uint8Array.of(1, 2)),
    dir = directory(),
    get = dir.getFileHandle;
  dir.getFileHandle = async (name) => {
    const h = await get(name),
      create = h.createWritable;
    h.createWritable = async () => {
      const s = await create();
      const close = s.close;
      s.close = async () => {
        await close();
        current.change(Uint8Array.of(4, 5));
      };
      return s;
    };
    return h;
  };
  await assert.rejects(
    saveSafely({ handle: current, bytes: Uint8Array.of(3), name: 'vault.db', directory: dir }),
    /原文件已/,
  );
  assert.deepEqual(current.bytes(), Uint8Array.of(4, 5));
  await assert.rejects(
    saveSafely({
      handle: file('new.db', new Uint8Array(), { corrupt: true }),
      bytes: Uint8Array.of(8),
      name: 'new.db',
    }),
    /验证失败/,
  );
});
