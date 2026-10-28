import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  createRecentFiles,
  mergeRecentSession,
  allowFile,
  fileError,
} from '../dist/recent-files.js';
import { recentMarkup } from '../dist/workflow-ui.js';
import { setLanguage } from '../dist/i18n.js';

setLanguage('en');
function storage() {
  const data = new Map();
  const database = {
    close() {},
    createObjectStore() {},
    transaction() {
      const transaction = {};
      const store = {
        getAll: () => ({ result: [...data.values()] }),
        put: (entry) => {
          const keys = ['handle', 'id', 'name', 'time'];
          assert.deepEqual(Object.keys(entry).sort(), keys.sort());
          data.set(entry.id, entry);
        },
        delete: (id) => data.delete(id),
        clear: () => data.clear(),
      };
      transaction.objectStore = () => store;
      setTimeout(() => transaction.oncomplete?.(), 0);
      return transaction;
    },
  };
  return {
    data,
    open() {
      const request = { result: database };
      setTimeout(() => request.onsuccess(), 0);
      return request;
    },
  };
}

// 验证历史记录只持久化名称和访问权限、按访问权限去重，并只保留最后打开的密码库。
test('history persists names and file access only, deduplicates by file access and keeps only the last opened vault', async () => {
  const factory = storage(),
    history = createRecentFiles(factory);
  const handle = { isSameEntry: async (other) => other === handle };
  await history.remember('same.db', handle);
  await history.remember('renamed.db', handle);
  assert.equal((await history.list()).length, 1);
  await history.remember('renamed.db', { isSameEntry: async () => false });
  assert.equal((await history.list()).length, 1);
  for (let index = 0; index < 7; index++) await history.remember(`file${index}.db`);
  assert.equal(factory.data.size, 1);
  const reopened = createRecentFiles(factory);
  assert.equal((await reopened.list()).length, 1);
  assert.equal((await reopened.list())[0].name, 'file6.db');
  const first = (await reopened.list())[0];
  await reopened.remove(first.id);
  assert.equal((await reopened.list()).length, 0);
  await reopened.clear();
  assert.equal((await history.list()).length, 0);
});

// 验证持久化存储不可用或被拒绝时，降级使用当前会话历史。
test('unavailable or denied storage degrades to session history', async () => {
  for (const factory of [
    undefined,
    {
      open() {
        throw new Error('disabled');
      },
    },
  ]) {
    const history = createRecentFiles(factory);
    await history.remember('local.db');
    assert.equal((await history.list())[0].name, 'local.db');
    assert.equal(history.persistent, false);
    await history.clear();
    assert.equal((await history.list()).length, 0);
  }
});

// 验证当前会话按已核实的文件身份合并，且不修改持久化记录。
test('current sessions merge with verified file identities without changing persisted records', async () => {
  const handle = { isSameEntry: async (other) => other === handle };
  const entries = [
    { id: 'other', name: 'same.db', handle: {}, time: 2 },
    { id: 'current', name: 'same.db', handle, folder: 'Vaults/Work', time: 1 },
  ];
  const merged = await mergeRecentSession(entries, { name: 'renamed.db', handle, dirty: true });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'current');
  assert.equal(merged[0].name, 'renamed.db');
  assert.equal(merged[0].folder, 'Vaults/Work');
  assert.equal(merged[0].unsaved, true);
  assert.equal(entries[1].current, undefined);
  assert.equal(entries[1].name, 'same.db');
  assert.equal((await mergeRecentSession(entries, { id: 'current', name: 'same.db' })).length, 1);
  assert.deepEqual(await mergeRecentSession(entries, null), entries.slice(0, 1));
});

// 验证历史为空或被清空后，未保存和当前选中的会话仍可访问。
test('unsaved and selected sessions remain accessible when recent history is empty or cleared', async () => {
  const merged = await mergeRecentSession([], { name: 'new.db', dirty: true });
  const dom = new JSDOM(recentMarkup(merged, true));
  assert.equal(merged[0].ephemeral, true);
  assert.match(
    dom.window.document.querySelector('[data-action=recent-session]').textContent,
    /continue unsaved changes/,
  );
  assert.equal(dom.window.document.querySelector('[data-action=recent-remove]'), null);
  assert.equal(dom.window.document.querySelector('[data-action=recent-clear]'), null);
  assert.match(
    dom.window.document.querySelector('.workflow-notice').textContent,
    /unsaved changes/,
  );
  const sameName = [{ id: 'old', name: 'new.db', time: 1 }];
  assert.equal(
    (await mergeRecentSession(sameName, { name: 'new.db' })).length,
    1,
    'only the current session is shown',
  );
  assert.equal(
    (await mergeRecentSession(sameName, { name: 'new.db' }))[0].ephemeral,
    true,
    'a name alone cannot prove file identity',
  );
  dom.window.close();
});

// 验证旧版历史迁移只保留最新记录，并移除已存储的文件夹标签。
test('legacy history keeps the newest record and removes stored folder labels', async () => {
  const factory = storage();
  factory.data.set('old', { id: 'old', name: 'old.db', handle: null, time: 1 });
  factory.data.set('latest', {
    id: 'latest',
    name: 'latest.db',
    handle: {},
    time: 2,
    folder: 'Private/Work',
  });
  const history = createRecentFiles(factory);
  const entries = await history.list();
  assert.deepEqual(
    entries.map((entry) => entry.name),
    ['latest.db'],
  );
  assert.equal(factory.data.size, 1);
  assert.equal(Object.hasOwn(factory.data.get('latest'), 'folder'), false);
  assert.equal(history.setDirectory, undefined);
  await history.remove('latest');
  assert.deepEqual(await createRecentFiles(factory).list(), [], 'older history must not reappear');
});

// 验证最近文件界面只展示经过转义的文件名，不显示目录控件或目录标签。
test('recent markup displays a single escaped name without directory controls or labels', () => {
  const entries = [
    {
      id: 'first',
      name: '<img src=x onerror=alert(1)>.db',
      handle: {},
      folder: 'Private/Work',
      time: 2,
    },
    { id: 'second', name: 'older.db', handle: {}, time: 1 },
  ];
  const dom = new JSDOM(recentMarkup(entries, true));
  const document = dom.window.document;
  assert.equal(document.querySelectorAll('.recent-row').length, 1);
  assert.equal(document.querySelector('strong').textContent, entries[0].name);
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('[data-action=recent-directory]'), null);
  assert.equal(document.querySelector('.recent-directory'), null);
  assert.ok(!document.body.textContent.includes('Private/Work'));
  dom.window.close();
});

// 验证重开文件仅在需要时申请权限，并报告权限拒绝或文件丢失。
test('reopening requests permission only when needed and reports denied or missing files', async () => {
  let requested = 0;
  const handle = {
    queryPermission: async ({ mode }) => {
      assert.equal(mode, 'read');
      return 'prompt';
    },
    requestPermission: async () => {
      requested++;
      return 'granted';
    },
  };
  await allowFile(handle);
  assert.equal(requested, 1);
  handle.requestPermission = async () => 'denied';
  await assert.rejects(allowFile(handle), /access/);
  handle.queryPermission = async () => 'granted';
  await allowFile(handle);
  assert.equal(requested, 1);
  assert.match(fileError({ name: 'NotFoundError' }), /moved or deleted/);
  assert.match(fileError({ name: 'SecurityError' }), /access/);
});
