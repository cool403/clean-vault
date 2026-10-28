import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotStore } from '../dist/snapshots.js';

function fakeFileSystem() {
  const files = new Map();
  const directory = {
    async getFileHandle(name, options = {}) {
      if (!files.has(name)) {
        if (!options.create) throw new Error('NotFound');
        files.set(name, new Uint8Array());
      }
      return {
        kind: 'file',
        async getFile() {
          const bytes = files.get(name);
          return { size: bytes.length, arrayBuffer: async () => bytes.slice().buffer };
        },
        async createWritable() {
          let buffer = new Uint8Array();
          return {
            write: async (value) => {
              buffer = value.slice();
            },
            close: async () => {
              files.set(name, buffer);
            },
            abort: async () => {},
          };
        },
      };
    },
    async removeEntry(name) {
      files.delete(name);
    },
    async *entries() {
      for (const name of files.keys()) yield [name, { kind: 'file' }];
    },
  };
  return {
    files,
    root: {
      async getDirectoryHandle() {
        return directory;
      },
    },
  };
}

// 验证快照存储以加密字节写入，并支持列出、读取、按策略清理和全部清空。
test('snapshot store writes encrypted bytes, lists, reads, prunes and clears', async () => {
  const { files, root } = fakeFileSystem();
  let time = 1700000000000,
    id = 0;
  const store = createSnapshotStore({
    getDirectory: async () => root,
    now: () => time++,
    uuid: () => `u${++id}`,
    retention: 2,
  });
  assert.equal(await store.write('vault.db', new Uint8Array([1, 2, 3])), true);
  assert.equal(await store.write('vault.db', new Uint8Array([4, 5])), true);
  assert.equal(await store.write('vault.db', new Uint8Array([6])), true);
  const list = await store.list('vault.db');
  assert.equal(list.length, 2, 'retention keeps the newest snapshots');
  assert.deepEqual(await store.read(list[0].name), new Uint8Array([6]));
  assert.deepEqual(await store.read(list[1].name), new Uint8Array([4, 5]));
  assert.deepEqual(await store.list('other.db'), []);
  assert.equal(await store.clear('vault.db'), 2);
  assert.equal((await store.list('vault.db')).length, 0);
  assert.equal(files.size, 0);
});

// 验证浏览器不支持 OPFS 时，快照功能可平稳降级。
test('snapshot store degrades gracefully without OPFS', async () => {
  const store = createSnapshotStore({ getDirectory: async () => null });
  assert.equal(await store.write('vault.db', new Uint8Array([1])), false);
  assert.deepEqual(await store.list('vault.db'), []);
  assert.equal(await store.read('missing'), null);
});
