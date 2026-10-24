import { buildInfo } from '../dist/build-info.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { decryptDatabase } from '../dist/crypto.js';

test('UI create -> add/edit OTP -> save .db -> lock -> unlock -> trash/restore', async () => {
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
    value: { clipboard: { writeText: async () => {} } },
  });
  const realInterval = globalThis.setInterval;
  globalThis.setInterval = () => 0;
  const realTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, duration) => {
    const timer = realTimeout(fn, duration);
    timer.unref?.();
    return timer;
  };
  let saved;
  const handle = {
    name: '测试密码库.db',
    getFile: async () => ({
      size: saved?.length || 0,
      lastModified: 1,
      arrayBuffer: async () => (saved || new Uint8Array()).slice().buffer,
    }),
    createWritable: async () => ({
      write: async (bytes) => {
        saved = bytes;
      },
      close: async () => {},
      abort: async () => {},
    }),
  };
  const backupFiles = new Map();
  const backupDirectory = {
    name: 'Synthetic backups',
    entries: async function* () {
      yield* backupFiles;
    },
    removeEntry: async (name) => backupFiles.delete(name),
    getFileHandle: async (name, options) => {
      if (!backupFiles.has(name)) {
        if (!options?.create) throw new Error('NotFound');
        let content = new Uint8Array();
        backupFiles.set(name, {
          kind: 'file',
          name,
          getFile: async () => ({
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
        });
      }
      return backupFiles.get(name);
    },
  };
  dom.window.showDirectoryPicker = async () => backupDirectory;
  dom.window.showSaveFilePicker = async () => handle;
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
    for (let i = 0; i < 200; i++) {
      if (condition()) return;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.fail('Timed out waiting for UI state');
  };
  const formValue = (form, name, value) => {
    document.querySelector(form).elements.namedItem(name).value = value;
  };
  const switchLanguage = (locale) => {
    const picker = document.querySelector('[data-language]');
    picker.value = locale;
    picker.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };
  const footerLinks = () =>
    [...document.querySelectorAll('.welcome-links a')].map((a) => new URL(a.href).pathname);
  assert.deepEqual(footerLinks(), [
    '/guides/',
    '/security/',
    '/en/',
    '/downloads/',
    new URL(buildInfo.repository).pathname,
  ]);
  window.dispatchEvent(new dom.window.Event('beforeinstallprompt', { cancelable: true }));
  assert.deepEqual(footerLinks(), [
    '/guides/',
    '/security/',
    '/en/',
    '/downloads/',
    new URL(buildInfo.repository).pathname,
  ]);
  switchLanguage('en');
  assert.deepEqual(footerLinks(), [
    '/en/guides/',
    '/en/security/',
    '/en/',
    '/en/downloads/',
    new URL(buildInfo.repository).pathname,
  ]);
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.querySelector('[data-action=open]').textContent, 'Open .db vault');
  switchLanguage('zh-CN');
  click('[data-action=create]');
  formValue('#password-form', 'name', '测试密码库');
  formValue('#password-form', 'password', 'synthetic-中文😀-2026');
  formValue('#password-form', 'confirm', 'synthetic-中文😀-2026');
  submit('#password-form');
  await waitFor(() => !!document.querySelector('[data-action=new]'));
  // Empty OTP template fields must not imply a configured authenticator.
  click('[data-action=new]');
  formValue('#editor-form', 'title', '没有双重验证的条目');
  // Opening/changing/cancelling the generator must not modify the editor draft.
  const passwordField = document.querySelector('.editor-field[data-index="1"] .field-input');
  passwordField.value = 'original-password';
  click('[data-action=generate]');
  assert.equal(document.querySelector('#generator-modal').open, true);
  assert.equal(passwordField.value, 'original-password');
  formValue('#generator-form', 'length', '32');
  document
    .querySelector('#generator-length')
    .dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#generated-password').value.length, 32);
  click('[data-action=generator-refresh]');
  assert.equal(passwordField.value, 'original-password');
  click('[data-action=generator-cancel]');
  assert.equal(passwordField.value, 'original-password');
  assert.equal(document.querySelector('#modal').open, true);
  assert.equal(document.querySelector('#editor-form').elements.title.value, '没有双重验证的条目');
  click('[data-action=generate]');
  for (const name of ['upper', 'lower', 'symbols']) {
    const box = document.querySelector(`#generator-form [name=${name}]`);
    box.checked = false;
    box.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  }
  const preview = document.querySelector('#generated-password').value;
  assert.match(preview, /^[0-9]{32}$/);
  assert.equal(passwordField.value, 'original-password');
  submit('#generator-form');
  assert.equal(passwordField.value, preview);
  assert.ok(!document.querySelector('#generator-modal'));
  click('[data-action=generate]');
  document.querySelector('#generator-form [name=digits]').checked = false;
  document
    .querySelector('#generator-form [name=digits]')
    .dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#generator-form [type=submit]').disabled, true);
  assert.equal(document.querySelector('#generated-password').value, '');
  submit('#generator-form');
  assert.equal(passwordField.value, preview);
  document
    .querySelector('#generator-modal')
    .dispatchEvent(new dom.window.Event('cancel', { cancelable: true }));
  assert.ok(!document.querySelector('#generator-modal'));
  assert.equal(passwordField.value, preview);
  click('[data-action=editor-add-otp]');
  document.querySelector('.editor-field:last-child .field-input').value = '   \n ';
  submit('#editor-form');
  assert.equal(document.querySelector('#modal').open, false);
  assert.equal(document.querySelector('.identity h2').textContent, '没有双重验证的条目');
  assert.ok(!document.querySelector('.auth-card'));
  assert.ok(!document.querySelector('.otp-widget'));
  assert.ok(!document.querySelector('[data-action=add-otp]'));
  assert.ok(!document.querySelector('.otp-badge'));
  assert.ok(!document.querySelector('#app').textContent.includes('密钥无效'));
  click('[data-section=otp]');
  assert.equal(document.querySelectorAll('[data-select]').length, 0);
  assert.equal(document.querySelector('[data-section=otp] small').textContent, '0');
  click('[data-section=otp]');
  click('[data-action=new]');
  formValue('#editor-form', 'title', '测试验证器');
  document.querySelector('.field-input').value =
    'otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&issuer=Example';
  formValue('#editor-form', 'notes', '保留的备注');
  submit('#editor-form');
  assert.match(document.querySelector('.identity h2').textContent, /测试验证器/);
  click('[data-action=edit]');
  formValue('#editor-form', 'title', '编辑后的验证器');
  submit('#editor-form');
  click('[data-action=save]');
  await waitFor(
    () =>
      !!saved && document.querySelector('[data-action=save]').textContent.includes('保存数据库'),
  );
  const opened = await decryptDatabase(saved, 'synthetic-中文😀-2026');
  assert.equal(opened.version, 2);
  assert.match(opened.xml, /编辑后的验证器/);
  assert.match(opened.xml, /one_time_password/);
  assert.match(opened.xml, /保留的备注/);
  click('[data-action=settings]');
  click('[data-action=backup-directory]');
  await waitFor(() => document.querySelector('#modal').textContent.includes('Synthetic backups'));
  click('[data-action=close-modal]');
  click('[data-action=save]');
  await waitFor(
    () =>
      backupFiles.size === 1 &&
      !document.querySelector('[data-action=save]').textContent.includes('处理中'),
  );
  assert.match(document.querySelector('.status-line').textContent, /已验证保存/);
  document.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
  );
  assert.ok(document.querySelector('#quick-search-modal[open]'), 'Ctrl+K opens global search');
  document.querySelector('#quick-search-modal input').dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'L',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    }),
  );
  await waitFor(() => !!document.querySelector('[data-action=recent-session]'));
  assert.deepEqual(footerLinks(), [
    '/guides/',
    '/security/',
    '/en/',
    '/downloads/',
    new URL(buildInfo.repository).pathname,
  ]);
  assert.equal(
    document.querySelector('#quick-search-modal'),
    null,
    'locking removes search summaries',
  );
  assert.ok(!document.querySelector('.otp-widget'));
  assert.ok(!document.querySelector('.field-value'));
  click('[data-action=recent-session]');
  formValue('#password-form', 'password', 'wrong');
  submit('#password-form');
  await waitFor(() => document.querySelector('#password-error')?.textContent.includes('不正确'));
  formValue('#password-form', 'password', 'synthetic-中文😀-2026');
  submit('#password-form');
  await waitFor(() => !!document.querySelector('[data-action=delete]'));
  assert.ok(
    document.querySelector('#quick-search-modal[open]'),
    'unlock opens quick search automatically',
  );
  assert.equal(document.activeElement, document.querySelector('#quick-search-modal input'));
  document.activeElement.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  click('[data-action=delete]');
  click('[data-section=trash]');
  assert.ok(document.querySelector('[data-action=restore]'));
  click('[data-action=restore]');
  click('[data-section=all]');
  assert.match(document.querySelector('.identity h2').textContent, /编辑后的验证器/);
  // Dirty snapshots survive lock in encrypted memory without writing the file.
  click('[data-action=lock]');
  await waitFor(() => !!document.querySelector('[data-action=recent-session]'));
  assert.equal(document.querySelector('[data-action=unlock]'), null);
  assert.match(
    document.querySelector('[data-action=recent-session]').textContent,
    /解锁并继续未保存的修改/,
  );
  assert.match(
    document.querySelector('.recent-files .workflow-notice').textContent,
    /未保存的更改/,
  );
  click('[data-action=recent-session]');
  formValue('#password-form', 'password', 'synthetic-中文😀-2026');
  submit('#password-form');
  await waitFor(() => !!document.querySelector('[data-action=save]'));
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  // Save conflict prevents silent replacement of a modified file.
  handle.getFile = async () => ({
    size: 7,
    lastModified: 2,
    arrayBuffer: async () => new Uint8Array([7]).buffer,
  });
  click('[data-action=save]');
  await waitFor(() =>
    document.querySelector('#toast').textContent.includes('原文件已被其他应用修改'),
  );
  switchLanguage('en');
  assert.equal(
    document.querySelector('[data-section=all]').getAttribute('aria-label'),
    'All items',
  );
  assert.equal(document.querySelector('.identity h2').textContent, '编辑后的验证器');
  assert.equal(document.querySelector('.notes').textContent, '保留的备注');
  click('[data-action=settings]');
  assert.equal(document.querySelector('#modal-title').textContent, 'Preferences');
  switchLanguage('zh-CN');
  assert.equal(document.querySelector('#modal-title').textContent, '偏好设置');
  assert.equal(document.querySelector('#modal').open, true);
  click('[data-action=close-modal]');
  switchLanguage('en');
  click('[data-action=edit]');
  assert.equal(document.querySelector('#editor-form').elements.title.value, '编辑后的验证器');
  assert.equal(
    document.querySelector('[aria-label="Field type"] option[value=one_time_password]').textContent,
    'Two-factor authentication',
  );
  assert.equal(document.querySelector('[aria-label="Field name"]').value, '两步验证码');
  click('[data-action=close-modal]');
  switchLanguage('zh-CN');
  click('[data-action=settings]');
  click('[data-action=backups]');
  await waitFor(() => !!document.querySelector('[data-backup-index]'));
  click('[data-backup-index]');
  click('[data-action=confirm-discard]');
  await waitFor(() => !!document.querySelector('#recovery-form'));
  formValue('#recovery-form', 'password', 'wrong');
  submit('#recovery-form');
  await waitFor(() =>
    document.querySelector('#recovery-form .form-error')?.textContent.includes('不正确'),
  );
  formValue('#recovery-form', 'password', 'synthetic-中文😀-2026');
  submit('#recovery-form');
  await waitFor(() => !!document.querySelector('[data-action=confirm-recovery]'));
  assert.match(document.querySelector('#modal').textContent, /条目 2/);
  click('[data-action=confirm-recovery]');
  assert.match(document.querySelector('.vault-switch').textContent, /-recovered/);
  assert.match(document.querySelector('[data-action=save]').textContent, /保存更改/);
  globalThis.setInterval = realInterval;
  globalThis.setTimeout = realTimeout;
  dom.window.close();
});
