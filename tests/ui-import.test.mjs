import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { encryptDatabase, decryptDatabase, passwordBytes } from '../dist/crypto.js';

test('app imports, saves and resumes its locked session through the recent vault list', async (context) => {
  const dom = new JSDOM(
    '<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div><input id="file-input" type="file"><input id="qr-input" type="file">',
    { url: 'http://localhost/?lang=en' },
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
  const password = 'synthetic-import-ui';
  let bytes = await encryptDatabase(
    '<database><unknown flag="keep"/></database>',
    passwordBytes(password),
  );
  let requests = 0,
    denied = false;
  const handle = {
    name: 'test.db',
    queryPermission: async () => 'prompt',
    requestPermission: async () => {
      requests++;
      return denied ? 'denied' : 'granted';
    },
    getFile: async () => ({
      name: 'test.db',
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
  const backups = [];
  const directory = {
    name: 'backups',
    getFileHandle: async (name, options) => {
      if (!options?.create) throw new dom.window.DOMException('Not found', 'NotFoundError');
      let content;
      const backup = {
        getFile: async () => ({
          size: content?.length || 0,
          arrayBuffer: async () => content.slice().buffer,
        }),
        createWritable: async () => ({
          write: async (value) => {
            content = value.slice();
          },
          close: async () => {},
          abort: async () => {},
        }),
      };
      backups.push(backup);
      return backup;
    },
  };
  dom.window.showOpenFilePicker = async () => [handle];
  dom.window.showDirectoryPicker = async () => directory;
  const click = (selector) => {
    assert.ok(document.querySelector(selector), selector);
    document.querySelector(selector).click();
  };
  const wait = async (check) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      if (check()) return;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.fail('UI timeout');
  };
  const submit = (selector) =>
    document
      .querySelector(selector)
      .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await import('../dist/app.js');
  click('[data-action=open]');
  await wait(() => document.querySelector('#password-form'));
  click('[data-action=close-modal]');
  await wait(() => document.querySelector('[data-action=recent-session]'));
  assert.equal(document.querySelector('.welcome-secondary [data-action=unlock]'), null);
  assert.equal(
    document.querySelectorAll('.recent-row').length,
    1,
    'a selected file must remain accessible before its first unlock',
  );
  click('[data-action=recent-session]');
  document.querySelector('[name=password]').value = password;
  submit('#password-form');
  await wait(() => document.querySelector('[data-action=import]'));
  click('[data-action=import]');
  const importDialog = document.querySelector('#modal');
  const canceledForm = document.querySelector('#import-form');
  canceledForm.elements.format.value = 'bitwarden-json';
  canceledForm.elements.file.dispatchEvent(new dom.window.Event('cancel', { bubbles: true }));
  assert.equal(
    document.querySelector('#import-form'),
    canceledForm,
    'file picker cancellation must retain the import form',
  );
  assert.equal(importDialog.open, true);
  assert.equal(canceledForm.elements.format.value, 'bitwarden-json');
  assert.equal(document.querySelector('[data-section=all] small').textContent, '0');
  const dialogCancel = new dom.window.Event('cancel', { cancelable: true });
  importDialog.dispatchEvent(dialogCancel);
  assert.equal(dialogCancel.defaultPrevented, true);
  assert.equal(
    importDialog.open,
    false,
    'dialog cancellation must close the modal before clearing it',
  );
  assert.equal(importDialog.childElementCount, 0);
  const csv =
    'name,url,username,password\n"<img src=x onerror=alert(1)>",https://example.com,alice,sensitive-password\n';
  async function preview() {
    click('[data-action=import]');
    const form = document.querySelector('#import-form');
    Object.defineProperty(form.elements.file, 'files', {
      configurable: true,
      value: [{ size: csv.length, text: async () => csv }],
    });
    await form.onsubmit(new dom.window.Event('submit', { cancelable: true }));
  }
  await preview();
  assert.ok(document.querySelector('#import-confirm'));
  assert.equal(document.querySelector('#modal img'), null);
  assert.ok(!document.querySelector('#modal').innerHTML.includes('sensitive-password'));
  assert.match(document.querySelector('.workflow-summary').textContent, /New 1/);
  click('[data-import-close]');
  assert.equal(document.querySelector('[data-section=all] small').textContent, '0');
  await preview();
  await document
    .querySelector('#import-confirm')
    .onsubmit(new dom.window.Event('submit', { cancelable: true }));
  assert.equal(document.querySelector('[data-section=all] small').textContent, '1');
  assert.match(document.querySelector('.status-line').textContent, /unsaved/i);
  await preview();
  assert.match(document.querySelector('.workflow-summary').textContent, /New 0.*Duplicates 1/);
  assert.equal(document.querySelector('#import-confirm [type=submit]').disabled, true);
  click('[data-import-close]');
  const original = bytes.slice();
  denied = true;
  click('[data-action=save]');
  await wait(() =>
    document.querySelector('.status-line').textContent.includes('Saving did not finish'),
  );
  assert.deepEqual(bytes, original);
  denied = false;
  click('[data-action=save]');
  await wait(() =>
    document.querySelector('.status-line').textContent.includes('Saved and verified'),
  );
  assert.equal(backups.length, 1);
  const decoded = await decryptDatabase(bytes, password);
  assert.match(decoded.xml, /sensitive-password/);
  assert.match(decoded.xml, /unknown flag="keep"/);
  decoded.credential.fill(0);
  click('[data-action=lock]');
  await wait(() => document.querySelector('[data-action=recent-session]'));
  assert.equal(
    document.querySelectorAll('.recent-row').length,
    1,
    'the locked session merges with its stored record',
  );
  assert.ok(!document.querySelector('#app').innerHTML.includes('alice'));
  const beforePermission = requests;
  click('[data-action=recent-session]');
  await wait(() => document.querySelector('#password-form'));
  assert.equal(requests, beforePermission, 'resuming the current page must not reread its file');
  document.querySelector('[name=password]').value = password;
  submit('#password-form');
  await wait(() => document.querySelector('[data-action=import]'));
  assert.equal(document.querySelector('[data-section=all] small').textContent, '1');
  click('[data-action=settings]');
  dom.window.showDirectoryPicker = async (options) => {
    assert.equal(options.mode, 'read');
    return {
      name: 'Vaults',
      resolve: async (source) => {
        assert.equal(source, handle);
        return ['Work', 'test.db'];
      },
    };
  };
  const beforeDirectory = bytes.slice();
  click('[data-action=recent-directory]');
  await wait(() =>
    document.querySelector('.recent-directory')?.textContent.includes('Vaults/Work'),
  );
  assert.deepEqual(bytes, beforeDirectory, 'confirming a folder must not write the vault');
  click('[data-action=recent-clear]');
  await wait(() => !document.querySelector('[data-action=recent-open]'));
  click('[data-action=close-modal]');
  click('[data-action=lock]');
  await wait(() => document.querySelector('[data-action=recent-session]'));
  assert.equal(
    document.querySelectorAll('.recent-row').length,
    1,
    'clearing history must not discard the current encrypted session',
  );
  click('[data-action=create]');
  const createForm = document.querySelector('#password-form');
  createForm.elements.name.value = 'Unsaved new vault';
  createForm.elements.password.value = password;
  createForm.elements.confirm.value = password;
  createForm.elements.acknowledge.checked = true;
  submit('#password-form');
  await wait(() => document.querySelector('[data-action=new]'));
  click('[data-action=new]');
  document.querySelector('#editor-form').elements.title.value = 'Unsaved item';
  submit('#editor-form');
  click('[data-action=lock]');
  await wait(() => document.querySelector('[data-action=recent-session]'));
  assert.match(
    document.querySelector('[data-action=recent-session]').textContent,
    /Unsaved new vault/,
  );
  assert.equal(document.querySelector('[data-action=recent-clear]'), null);
  click('[data-action=recent-session]');
  document.querySelector('[name=password]').value = password;
  submit('#password-form');
  await wait(() => document.querySelector('[data-action=import]'));
  assert.match(document.querySelector('.identity h2').textContent, /Unsaved item/);
  click('[data-action=settings]');
  assert.equal(
    document.querySelectorAll('.recent-row').length,
    0,
    'an unsaved new vault must not create a persistent file record',
  );
});
