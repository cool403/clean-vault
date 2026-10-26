import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { decryptDatabase, encryptDatabase, passwordBytes } from '../dist/crypto.js';

test('existing .db: save entry writes back, backs up, and survives opening the file again', async (t) => {
  const dom = new JSDOM(
    '<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div><input id="file-input" type="file"><input id="qr-input" type="file">',
    { url: 'http://localhost/' },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new dom.window.Event('close'));
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['zh-CN'] },
  });
  const realInterval = globalThis.setInterval,
    realTimeout = globalThis.setTimeout;
  globalThis.setInterval = () => 0;
  globalThis.setTimeout = (fn, duration) => {
    const timer = realTimeout(fn, duration);
    timer.unref?.();
    return timer;
  };
  t.after(() => {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  });
  const password = 'synthetic-save-123';
  const original = await encryptDatabase(
    '<database><card id="1" title="Existing"><field name="Account" type="login">alice</field><unknown>preserve me</unknown></card></database>',
    passwordBytes(password, 1),
    1,
  );
  let content = original.slice(),
    failWrite = false,
    cancelDirectory = true,
    directoryPrompts = 0;
  function memoryFile(name, initial = new Uint8Array()) {
    let bytes = initial.slice();
    return {
      kind: 'file',
      name,
      getFile: async () => ({
        name,
        size: bytes.length,
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
  }
  const handle = {
    name: 'existing.db',
    getFile: async () => ({
      name: 'existing.db',
      size: content.length,
      arrayBuffer: async () => content.slice().buffer,
    }),
    createWritable: async () => {
      if (failWrite) throw new Error('Write denied');
      return {
        write: async (bytes) => {
          content = bytes.slice();
        },
        close: async () => {},
        abort: async () => {},
      };
    },
  };
  const backups = new Map();
  const directory = {
    name: 'Backups',
    getFileHandle: async (name, options) => {
      if (!backups.has(name)) {
        if (!options?.create) throw new Error('NotFound');
        backups.set(name, memoryFile(name));
      }
      return backups.get(name);
    },
  };
  dom.window.showOpenFilePicker = async () => [handle];
  dom.window.showDirectoryPicker = async () => {
    directoryPrompts++;
    if (cancelDirectory) throw new dom.window.DOMException('Cancelled', 'AbortError');
    return directory;
  };
  await import('../dist/app.js');
  const click = (selector) => {
    const el = document.querySelector(selector);
    assert.ok(el, selector);
    el.click();
  };
  const submit = (selector) =>
    document
      .querySelector(selector)
      .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const waitFor = async (condition) => {
    for (let i = 0; i < 300; i++) {
      if (condition()) return;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.fail('Timed out waiting for UI');
  };
  async function open() {
    click('[data-action=open]');
    await waitFor(() => !!document.querySelector('#password-form'));
    document.querySelector('#password-form').elements.password.value = password;
    submit('#password-form');
    await waitFor(() => !!document.querySelector('[data-action=new]'));
  }
  function add(title) {
    click('[data-action=new]');
    document.querySelector('#editor-form').elements.title.value = title;
    submit('#editor-form');
  }
  await open();
  add('Persisted item');
  await waitFor(() => document.querySelector('.status-line').textContent.includes('保存未完成'));
  assert.deepEqual(content, original, 'cancelling backup must leave original untouched');
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  assert.equal(document.querySelector('.identity h2').textContent, 'Persisted item');
  cancelDirectory = false;
  click('[data-action=save]');
  await waitFor(() => document.querySelector('.status-line').textContent.includes('已验证保存'));
  assert.equal(directoryPrompts, 2);
  assert.equal(backups.size, 1);
  assert.deepEqual(
    new Uint8Array(await (await [...backups.values()][0].getFile()).arrayBuffer()),
    original,
  );
  let decoded = await decryptDatabase(content, password);
  assert.equal(decoded.version, 1);
  assert.match(decoded.xml, /Persisted item/);
  assert.match(decoded.xml, /preserve me/);
  await open();
  assert.ok(
    [...document.querySelectorAll('[data-select]')].some((el) =>
      el.textContent.includes('Persisted item'),
    ),
  );
  add('Second item');
  await waitFor(() => document.querySelector('.status-line').textContent.includes('已验证保存'));
  assert.equal(directoryPrompts, 2, 'reuse backup permission within session');
  await open();
  assert.ok(
    [...document.querySelectorAll('[data-select]')].some((el) =>
      el.textContent.includes('Second item'),
    ),
  );
  // A failed automatic write keeps the edit available for retry.
  const beforeFailure = content.slice();
  failWrite = true;
  add('Retry item');
  await waitFor(() => document.querySelector('#toast').textContent.includes('Write denied'));
  assert.deepEqual(content, beforeFailure);
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  failWrite = false;
  click('[data-action=save]');
  await waitFor(() => document.querySelector('.status-line').textContent.includes('已验证保存'));
  decoded = await decryptDatabase(content, password);
  assert.match(decoded.xml, /Retry item/);
  // External modifications must not be overwritten by automatic entry saves.
  content = original.slice();
  add('Conflicting item');
  await waitFor(() =>
    document.querySelector('#modal').textContent.includes('原文件已被其他应用修改'),
  );
  assert.ok(document.querySelector('.conflict-banner'));
  assert.deepEqual(content, original);
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  click('[data-action=close-modal]');
  // File-input browsers can only export a copy; keep the unsaved warning.
  delete dom.window.showOpenFilePicker;
  click('[data-action=open]');
  click('[data-action=confirm-discard]');
  await new Promise((resolve) => realTimeout(resolve, 0));
  const input = document.querySelector('#file-input');
  Object.defineProperty(input, 'files', { value: [await handle.getFile()] });
  input.dispatchEvent(new dom.window.Event('change'));
  await waitFor(() => !!document.querySelector('#password-form'));
  document.querySelector('#password-form').elements.password.value = password;
  submit('#password-form');
  await waitFor(() => !!document.querySelector('[data-action=new]'));
  add('Exported item');
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  const originalCreateURL = URL.createObjectURL;
  let exported;
  URL.createObjectURL = (blob) => {
    exported = blob;
    return 'blob:synthetic';
  };
  dom.window.HTMLAnchorElement.prototype.click = () => {};
  t.after(() => {
    URL.createObjectURL = originalCreateURL;
  });
  click('[data-action=save]');
  await waitFor(() => document.querySelector('#toast').textContent.includes('原文件未被写回'));
  assert.deepEqual(content, original);
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  assert.match(document.querySelector('.status-line').textContent, /未保存/);
  assert.match(
    (await decryptDatabase(new Uint8Array(await exported.arrayBuffer()), password)).xml,
    /Exported item/,
  );
});
