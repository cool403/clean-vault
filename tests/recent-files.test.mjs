import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createRecentFiles, allowFile, fileError } from '../dist/recent-files.js';
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
          if (Object.hasOwn(entry, 'folder')) keys.push('folder');
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

test('history persists names and handles only, deduplicates by handle and caps at five', async () => {
  const factory = storage(),
    history = createRecentFiles(factory);
  const handle = { isSameEntry: async (other) => other === handle };
  await history.remember('same.db', handle);
  await history.remember('renamed.db', handle);
  assert.equal((await history.list()).length, 1);
  await history.remember('renamed.db', { isSameEntry: async () => false });
  assert.equal((await history.list()).length, 2);
  for (let index = 0; index < 7; index++) await history.remember(`file${index}.db`);
  assert.equal(factory.data.size, 5);
  const reopened = createRecentFiles(factory);
  assert.equal((await reopened.list()).length, 5);
  const first = (await reopened.list())[0];
  await reopened.remove(first.id);
  assert.equal((await reopened.list()).length, 4);
  await reopened.clear();
  assert.equal((await history.list()).length, 0);
});

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

test('confirmed folders resolve the actual handle, persist as text and remain separate for same-name vaults', async () => {
  const factory = storage(),
    history = createRecentFiles(factory);
  const first = { isSameEntry: async (other) => other === first };
  const second = { isSameEntry: async (other) => other === second };
  const entry = await history.remember('same.db', first);
  const other = await history.remember('same.db', second);
  await history.setDirectory(entry.id, {
    name: 'Vaults',
    resolve: async (handle) => {
      assert.equal(handle, first);
      return ['Work', 'same.db'];
    },
  });
  assert.equal(factory.data.get(entry.id).folder, 'Vaults/Work');
  assert.equal(factory.data.get(other.id).folder, undefined);
  assert.equal(factory.data.get(entry.id).time, entry.time);
  await history.remember('renamed.db', first);
  assert.equal((await history.list()).find((item) => item.id === entry.id).folder, 'Vaults/Work');
  const reopened = createRecentFiles(factory);
  assert.equal((await reopened.list()).find((item) => item.id === entry.id).folder, 'Vaults/Work');
  await assert.rejects(
    history.setDirectory(entry.id, { name: 'Wrong', resolve: async () => null }),
    /does not contain/,
  );
  assert.equal(factory.data.get(entry.id).folder, 'Vaults/Work');
  await history.setDirectory(entry.id, { name: 'Parent', resolve: async () => ['renamed.db'] });
  assert.equal(factory.data.get(entry.id).folder, 'Parent');
  await history.remove(entry.id);
  await assert.rejects(
    history.setDirectory(entry.id, { resolve: async () => ['same.db'] }),
    /no longer available/,
  );
  const withoutHandle = await history.remember('input.db');
  await assert.rejects(history.setDirectory(withoutHandle.id, {}), /no longer available/);
});

test('recent rows show escaped folder labels and an explicit unavailable fallback', () => {
  const entries = [
    {
      id: 'first',
      name: 'same.db',
      handle: {},
      folder: 'Vaults/<img src=x onerror=alert(1)>',
      time: 1,
    },
    { id: 'second', name: 'same.db', handle: {}, time: 2 },
  ];
  const dom = new JSDOM(recentMarkup(entries, true, true));
  const rows = dom.window.document.querySelectorAll('.recent-row');
  assert.equal(rows.length, 2);
  assert.equal(
    rows[0].querySelector('.recent-directory').textContent,
    'Last confirmed folder: ' + entries[0].folder,
  );
  assert.equal(rows[0].querySelector('img'), null);
  assert.equal(rows[1].querySelector('.recent-directory').textContent, 'Folder not yet confirmed');
  assert.equal(dom.window.document.querySelectorAll('[data-action=recent-directory]').length, 2);
  const unsupported = new JSDOM(recentMarkup([{ id: 'input', name: 'input.db', time: 1 }], false));
  assert.equal(unsupported.window.document.querySelector('[data-action=recent-directory]'), null);
  assert.match(
    unsupported.window.document.querySelector('.recent-directory-help').textContent,
    /system file picker/,
  );
  dom.window.close();
  unsupported.window.close();
});

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
