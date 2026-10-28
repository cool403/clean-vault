import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { encryptDatabase, decryptDatabase, passwordBytes } from '../dist/crypto.js';

test('extension updates/imports with confirmation, verifies backups, stops stale fills and reloads', async (context) => {
  const dom = new JSDOM(
    await readFile(new URL('../extension/panel.html', import.meta.url), 'utf8'),
    { url: 'https://extension.test/?lang=en' },
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    DOMParser: dom.window.DOMParser,
    XMLSerializer: dom.window.XMLSerializer,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['en'] },
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  const realInterval = globalThis.setInterval,
    realTimeout = globalThis.setTimeout;
  globalThis.setInterval = () => 0;
  globalThis.setTimeout = (callback, duration) => {
    const timer = realTimeout(callback, duration);
    timer.unref?.();
    return timer;
  };
  context.after(() => {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  });
  const password = 'synthetic-extension-workflows';
  const original = await encryptDatabase(
    '<database><unknown>keep</unknown><card id="1" title="Example"><field type="website">https://example.com</field><field type="login">alice</field><field type="password" hash="old" score="old">old-value</field></card></database>',
    passwordBytes(password, 1),
    1,
  );
  let content = original.slice(),
    current = { id: 5, url: 'https://example.com/login' },
    injected = [],
    cancelBackup = true;
  const file = {
    name: 'synthetic.db',
    queryPermission: async () => 'granted',
    getFile: async () => ({
      name: 'synthetic.db',
      size: content.length,
      arrayBuffer: async () => content.slice().buffer,
    }),
    createWritable: async () => ({
      write: async (bytes) => {
        content = bytes.slice();
      },
      close: async () => {},
      abort: async () => {},
    }),
  };
  const backups = [];
  const directory = {
    name: 'backups',
    getFileHandle: async (name, options) => {
      if (!options?.create) throw new dom.window.DOMException('Not found', 'NotFoundError');
      let bytes;
      const backup = {
        getFile: async () => ({
          size: bytes?.length || 0,
          arrayBuffer: async () => bytes.slice().buffer,
        }),
        createWritable: async () => ({
          write: async (value) => {
            bytes = value.slice();
          },
          close: async () => {},
          abort: async () => {},
        }),
      };
      backups.push(backup);
      return backup;
    },
  };
  dom.window.showOpenFilePicker = async () => [file];
  dom.window.showDirectoryPicker = async () => {
    if (cancelBackup) throw new dom.window.DOMException('Canceled', 'AbortError');
    return directory;
  };
  globalThis.chrome = {
    tabs: {
      query: async () => [current],
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
    },
    scripting: {
      executeScript: async (options) => {
        injected.push(options);
        return [
          {
            result:
              options.func.name === 'readNewPassword'
                ? { status: 'captured', password: 'new-value' }
                : 'filled',
          },
        ];
      },
    },
  };
  const element = (selector) => {
    const found = document.querySelector(selector);
    assert.ok(found, selector);
    return found;
  };
  const wait = async (check) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      if (check()) return;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.fail('Extension UI timeout');
  };
  const event = () => new dom.window.Event('submit', { cancelable: true });
  await import('../extension/panel.js');
  await element('#open').onclick();
  element('#password').value = password;
  await element('#unlock').onsubmit(event());
  await element('.entry .secondary').onclick();
  assert.equal(injected.length, 0, 'opening update form must not read the website');
  await element('#capture-password').onclick();
  assert.equal(element('#update-password [name=password]').value, 'new-value');
  element('[data-close]').click();
  await element('.entry .primary').onclick();
  assert.equal(injected.at(-1).args[2], 'old-value', 'cancel must leave the old password');
  element('.entry .secondary').click();
  element('#update-password [name=password]').value = 'new-value';
  element('#update-password [name=confirm]').value = 'different';
  element('#update-password').onsubmit(event());
  assert.match(element('.form-error').textContent, /match/);
  element('#update-password [name=confirm]').value = 'new-value';
  element('#update-password').onsubmit(event());
  assert.match(element('#save-status').textContent, /unsaved/);
  await element('#save').onclick();
  assert.deepEqual(content, original, 'canceling the first backup must prevent writing');
  cancelBackup = false;
  await element('#save').onclick();
  assert.equal(backups.length, 1);
  assert.deepEqual(new Uint8Array(await (await backups[0].getFile()).arrayBuffer()), original);
  let result = await decryptDatabase(content, password);
  assert.equal(result.version, 1);
  assert.match(result.xml, /new-value/);
  assert.match(result.xml, /<unknown>keep<\/unknown>/);
  assert.ok(!result.xml.includes('hash="old"'));
  result.credential.fill(0);
  await element('#lock').onclick();
  await wait(() => document.querySelector('[data-action=recent-session]'));
  assert.equal(document.querySelector('[data-action=recent-directory]'), null);
  assert.equal(document.querySelectorAll('.recent-row').length, 1);
  await wait(() => !element('#unlock-button').disabled);
  element('#password').value = password;
  await element('#unlock').onsubmit(event());
  current = { id: 5, url: 'https://accounts.example.com/login' };
  await element('#add-site').onclick();
  await element('#add-site-form').onsubmit(event());
  await wait(() => document.querySelector('.entry .primary'));
  assert.equal(element('.entry .primary').disabled, false);
  await element('#save').onclick();
  result = await decryptDatabase(content, password);
  assert.match(result.xml, /https:\/\/accounts.example.com/);
  result.credential.fill(0);
  element('#import').click();
  const canceledForm = element('#import-form');
  canceledForm.elements.format.value = 'bitwarden-json';
  canceledForm.elements.file.dispatchEvent(new dom.window.Event('cancel', { bubbles: true }));
  assert.equal(
    document.querySelector('#import-form'),
    canceledForm,
    'canceling the file picker must preserve the extension import form',
  );
  assert.equal(element('#modal').open, true);
  assert.equal(canceledForm.elements.format.value, 'bitwarden-json');
  element('#modal').dispatchEvent(new dom.window.Event('cancel', { cancelable: true }));
  assert.equal(element('#modal').open, false);
  assert.equal(element('#modal').childElementCount, 0);
  element('#import').click();
  const form = element('#import-form'),
    source = 'name,url,username,password\nOther,https://accounts.example.com,bob,import-secret\n';
  Object.defineProperty(form.elements.file, 'files', {
    value: [{ size: source.length, text: async () => source }],
  });
  await form.onsubmit(event());
  assert.ok(!element('#modal').innerHTML.includes('import-secret'));
  await element('#import-confirm').onsubmit(event());
  assert.equal(document.querySelectorAll('.entry').length, 2);
  await element('#lock').onclick();
  assert.equal(document.querySelectorAll('.entry').length, 0);
  await wait(() => document.querySelector('[data-action=recent-session]'));
  assert.equal(document.querySelector('#resume'), null);
  assert.match(element('[data-action=recent-session]').textContent, /continue unsaved changes/);
  element('[data-action=recent-session]').click();
  assert.equal(document.activeElement, element('#password'));
  element('#password').value = password;
  await element('#unlock').onsubmit(event());
  assert.equal(
    document.querySelectorAll('.entry').length,
    2,
    'unsaved import survives an in-page lock',
  );
  await element('#save').onclick();
  const saved = content.slice();
  content = await encryptDatabase(
    '<database><card id="9" title="External"><field type="website">https://accounts.example.com</field><field type="password">external-value</field></card></database>',
    passwordBytes(password),
  );
  injected = [];
  await element('.entry .primary').onclick();
  assert.equal(injected.length, 0, 'external changes stop injection');
  assert.match(element('#status').textContent, /original file changed/i);
  await element('#save').onclick();
  assert.match(element('#status').textContent, /modified|changed/i);
  assert.notDeepEqual(content, saved, 'conflict must preserve the external version');
  await element('#reload').onclick();
  assert.equal(element('#locked').hidden, false);
  for (const [code, message] of [
    ['de', 'Datei neu geladen. Geben Sie Ihr Hauptpasswort ein.'],
    ['ja', 'ファイルを再読み込みしました。マスターパスワードを入力してください。'],
    ['es', 'Archivo recargado. Introduzca la contraseña maestra.'],
  ]) {
    element('#language').value = code;
    element('#language').onchange();
    assert.equal(
      element('#status').textContent,
      message,
      'existing status follows language changes',
    );
  }
  element('#language').value = 'en';
  element('#language').onchange();
  element('#password').value = password;
  await element('#unlock').onsubmit(event());
  assert.match(element('.entry strong').textContent, /External/);
  assert.equal(document.querySelectorAll('.entry').length, 1);
  for (const [code, label] of [
    ['de', '.db-Tresor auswählen'],
    ['ja', '.db 保管庫を選択'],
    ['es', 'Elegir bóveda .db'],
  ]) {
    element('#language').value = code;
    element('#language').onchange();
    assert.equal(document.documentElement.lang, code);
    assert.equal(element('#open').textContent, label);
    await wait(() => document.querySelector('.entry strong')?.textContent === 'External');
    assert.equal(document.querySelectorAll('#language option').length, 5);
  }
  element('#language').value = 'en';
  element('#language').onchange();
  await wait(() => document.querySelector('[data-action=recent-open]'));
  await element('#lock').onclick();
  await wait(() => !element('#unlock-button').disabled);
  element('[data-action=recent-open]').click();
  await wait(() => element('#selected-file').textContent === 'synthetic.db');
  element('#language').value = 'zh-CN';
  element('#language').onchange();
  assert.equal(element('#open').textContent, '选择 .db 密码库');
  await wait(() => element('#recent-files').textContent.includes('最近密码库'));
  assert.match(element('#recent-files').textContent, /最近密码库/);
  dom.window.showOpenFilePicker = undefined;
  Object.defineProperty(element('#file'), 'files', {
    configurable: true,
    value: [
      {
        name: 'fallback.db',
        size: content.length,
        arrayBuffer: async () => content.slice().buffer,
      },
    ],
  });
  await element('#file').onchange();
  element('#password').value = password;
  await element('#unlock').onsubmit(event());
  element('.entry .secondary').click();
  element('#update-password [name=password]').value = 'unsaved-value';
  element('#update-password [name=confirm]').value = 'unsaved-value';
  element('#update-password').onsubmit(event());
  await element('#reload').onclick();
  assert.ok(element('#reload-confirm'));
  element('[data-close]').click();
  assert.match(element('#save-status').textContent, /未保存/);
  let fileClicks = 0;
  element('#file').addEventListener('click', () => fileClicks++);
  await element('#reload').onclick();
  element('#reload-confirm').onsubmit(event());
  await wait(() => fileClicks === 1);
  assert.equal(element('#file').disabled, false);
  await element('#file').onchange();
  assert.equal(element('#locked').hidden, false);
  element('#password').value = password;
  await element('#unlock').onsubmit(event());
  assert.match(element('.entry strong').textContent, /External/);
});
