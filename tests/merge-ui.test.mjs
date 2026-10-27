import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { decryptDatabase, encryptDatabase, passwordBytes } from '../dist/crypto.js';

test('merge preview applies independent field choices and saves the merged vault', async (t) => {
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

  const password = 'synthetic-merge-ui-2026';
  const original = await encryptDatabase(
    '<database><label id="9" name="Work"/><card id="1" title="Base title" time_stamp="100"><field name="账号" type="login">alice</field><field name="密码" type="password">base-pass</field><notes>base-note</notes></card></database>',
    passwordBytes(password, 1),
    1,
  );
  let content = original.slice();
  const handle = {
    name: 'sync.db',
    getFile: async () => ({
      name: 'sync.db',
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
  const backups = new Map();
  function memoryFile(name) {
    let bytes = new Uint8Array();
    return {
      kind: 'file',
      name,
      isSameEntry: async () => false,
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
  dom.window.showDirectoryPicker = async () => directory;
  await import('../dist/app.js');

  const click = (selector) => {
    const element = document.querySelector(selector);
    assert.ok(element, selector);
    element.click();
  };
  const submit = (selector) =>
    document
      .querySelector(selector)
      .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const waitFor = async (condition) => {
    for (let i = 0; i < 400; i++) {
      if (condition()) return;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.fail('Timed out waiting for UI');
  };

  click('[data-action=open]');
  await waitFor(() => !!document.querySelector('#password-form'));
  document.querySelector('#password-form').elements.password.value = password;
  submit('#password-form');
  await waitFor(() => !!document.querySelector('[data-action=new]'));

  click('[data-select]');
  await waitFor(() => !!document.querySelector('[data-action=edit]'));
  click('[data-action=edit]');
  const form = document.querySelector('#editor-form');
  assert.ok(form);
  form.elements.title.value = 'Local title';
  const fields = [...form.querySelectorAll('.editor-field .field-input')];
  assert.equal(fields.length, 2);
  fields[0].value = 'alice';
  fields[1].value = 'local-pass';
  form.elements.notes.value = 'local-note';

  const external = await encryptDatabase(
    `<database><label id="9" name="Work"/><card id="1" title="External title" time_stamp="${Date.now() + 60000}"><field name="账号" type="login">alice</field><field name="密码" type="password">external-pass</field><notes>external-note</notes></card></database>`,
    passwordBytes(password, 1),
    1,
  );
  content = external;
  submit('#editor-form');
  await waitFor(() =>
    document.querySelector('#modal').textContent.includes('原文件已被其他应用修改'),
  );
  click('[data-action=merge-external]');
  await waitFor(() => document.querySelectorAll('.merge-field').length === 3);

  const fieldGroup = (label) =>
    [...document.querySelectorAll('.merge-field')].find(
      (row) => row.querySelector('strong').textContent === label,
    );
  const titleGroup = fieldGroup('条目名称');
  const passwordGroup = fieldGroup('密码');
  const notesGroup = fieldGroup('备注');
  assert.ok(titleGroup && passwordGroup && notesGroup);
  assert.equal(titleGroup.querySelector('input[value=external]').checked, true);
  assert.equal(titleGroup.querySelector('input[value=local]').checked, false);
  assert.equal(passwordGroup.querySelector('.merge-secret').textContent, '••••••');
  assert.equal(notesGroup.querySelector('.merge-secret'), null);

  click('[data-action=merge-reveal]');
  assert.equal(document.querySelectorAll('.merge-secret').length, 0);
  assert.ok(
    [...document.querySelectorAll('.merge-options code')].some(
      (element) => element.textContent === 'local-pass',
    ),
  );

  titleGroup.querySelector('input[value=local]').click();
  passwordGroup.querySelector('input[value=local]').click();
  notesGroup.querySelector('input[value=external]').click();
  click('[data-action=merge-apply]');
  await waitFor(() => !document.querySelector('#modal').open);
  click('[data-action=save]');
  await waitFor(() => document.querySelector('.status-line').textContent.includes('已验证保存'));

  const decoded = await decryptDatabase(content, password);
  assert.match(decoded.xml, /title="Local title"/);
  assert.match(decoded.xml, />local-pass</);
  assert.doesNotMatch(decoded.xml, /external-pass|local-note/);
  assert.match(decoded.xml, />external-note</);
  assert.match(decoded.xml, />alice</);
  assert.equal(backups.size, 1);
});
