import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { encryptDatabase, decryptDatabase, passwordBytes } from '../dist/crypto.js';

// 验证扩展日常操作中的站点匹配、搜索、复制、验证码和新增条目，以及面板隐藏后保持解锁。
test('extension daily loop: site matching, search, copy, OTP, new entry and no lock on hide', async (context) => {
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
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: dom.window.localStorage,
  });
  let copied = '';
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      languages: ['en'],
      clipboard: { writeText: async (value) => (copied = value) },
    },
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

  const password = 'extension-daily-loop-password';
  const xml =
    '<database><label id="1" name="Work"/><card id="1" title="Example"><field type="website">https://example.com</field><field type="login">alice</field><field type="password">selected-secret</field><field type="one_time_password">JBSWY3DPEHPK3PXP</field><label_id>1</label_id></card><card id="2" title="Other"><field type="website">https://other.test</field><field type="login">bob</field><field type="password">other-secret</field><label_id>1</label_id></card><card id="3" title="OTP only"><field type="website">https://example.com</field><field type="one_time_password">JBSWY3DPEHPK3PXP</field></card><card id="4" title="Password only"><field type="website">https://example.com</field><field type="password">password-only-secret</field></card></database>';
  const bytes = await encryptDatabase(xml, passwordBytes(password));
  let current = { id: 5, url: 'https://example.com/login', title: 'Example Login' };
  let injected = [],
    badge = '';
  globalThis.chrome = {
    tabs: {
      query: async () => [current],
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
    },
    scripting: {
      executeScript: async (options) => {
        injected.push(options);
        return [{ result: options.func.name === 'fillOTP' ? 'otp-filled' : 'filled' }];
      },
    },
    action: {
      setBadgeText: ({ text }) => {
        badge = text;
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
    assert.fail('Extension daily loop UI timeout');
  };
  const input = (value) => {
    const search = element('#entry-search');
    search.value = value;
    search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const event = () => new dom.window.Event('submit', { cancelable: true });

  await import('../extension/panel.js');
  Object.defineProperty(element('#file'), 'files', {
    configurable: true,
    value: [{ name: 'daily-loop.db', size: bytes.length, arrayBuffer: async () => bytes.buffer }],
  });
  element('#password').value = password;
  await element('#unlock').onsubmit(event());

  await wait(() => document.querySelectorAll('.entry').length === 3);
  assert.equal(document.querySelector('#language').value, 'en');
  assert.deepEqual(
    [...document.querySelectorAll('.entry strong')].map((node) => node.textContent),
    ['Example', 'OTP only', 'Password only'],
  );
  assert.equal(badge, '3');
  assert.equal(element('#clipboard-timeout').value, '30');
  assert.ok(element('#recovery-kit'), 'the extension exposes the recovery kit');
  assert.equal(
    document.querySelectorAll('.entry')[1].querySelector('[data-copy-username]'),
    null,
    'an OTP-only entry must not offer to copy a placeholder account',
  );

  await wait(() => /^\d{3} \d{3}$/.test(element('.otp-code').textContent));
  const shownCode = element('.otp-code').textContent;
  element('[data-otp-copy]').click();
  await wait(() => copied === shownCode.replace(' ', ''));
  element('[data-otp-fill]').click();
  await wait(() => injected.length === 1);
  assert.equal(injected[0].func.name, 'fillOTP');
  assert.equal(injected[0].args[0], 'https://example.com');
  assert.match(injected[0].args[1], /^\d{6}$/);
  assert.deepEqual(injected[0].target, { tabId: 5, frameIds: [0] });

  injected = [];
  await document.querySelector('[data-entry-id="4"] .button.primary').onclick();
  assert.deepEqual(injected.at(-1).args, ['https://example.com', '', 'password-only-secret']);

  input('Other');
  await wait(() => document.querySelectorAll('.entry').length === 1);
  assert.equal(element('.entry strong').textContent, 'Other');
  assert.equal(element('[data-copy-password]').disabled, false);
  assert.equal(element('.entry .primary').disabled, true);
  element('[data-copy-password]').click();
  await wait(() => copied === 'other-secret');
  const timeout = element('#clipboard-timeout');
  timeout.value = '60';
  timeout.onchange();
  assert.equal(dom.window.localStorage.getItem('clearvault.clipboardTimeout'), '60');
  element('[data-copy-password]').click();
  await wait(() => /60 seconds/.test(element('#toast').textContent));

  input('work');
  await wait(() => document.querySelectorAll('.entry').length === 2);
  input('');
  await wait(() => document.querySelectorAll('.entry').length === 3);

  element('#new-entry').click();
  const form = element('#new-entry-form');
  form.elements.title.value = 'New site';
  form.elements.username.value = 'carol';
  form.elements.password.value = 'new-secret';
  form.elements.website.value = 'https://example.com';
  element('#new-password-generate').click();
  assert.equal(form.elements.password.value.length, 20);
  form.elements.password.value = 'new-secret';
  await form.onsubmit(event());
  await wait(() => document.querySelectorAll('.entry').length === 4);
  assert.ok(
    [...document.querySelectorAll('.entry strong')].some((node) => node.textContent === 'New site'),
  );
  assert.match(element('#save-status').textContent, /unsaved/i);
  assert.match(element('#save').textContent, /save changes/i);
  assert.equal(badge, '4');

  let saved = null;
  const target = {
    name: 'daily-loop.db',
    queryPermission: async () => 'granted',
    getFile: async () => ({
      name: 'daily-loop.db',
      size: saved?.length || 0,
      arrayBuffer: async () => (saved || new Uint8Array()).slice().buffer,
    }),
    createWritable: async () => ({
      write: async (value) => {
        saved = value.slice();
      },
      close: async () => {},
      abort: async () => {},
    }),
    isSameEntry: async (other) => other === target,
  };
  dom.window.showSaveFilePicker = async () => target;
  await element('#save').onclick();
  assert.ok(saved, 'new entry must be written');
  const result = await decryptDatabase(saved, password);
  assert.match(result.xml, /New site/);
  assert.match(result.xml, /carol/);
  assert.match(result.xml, /new-secret/);
  assert.match(result.xml, /name="Work"/);
  result.credential.fill(0);
  assert.match(element('#save-status').textContent, /saved/i);
  assert.match(element('#save').textContent, /save vault/i);

  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new dom.window.Event('visibilitychange'));
  await new Promise((resolve) => realTimeout(resolve, 20));
  assert.equal(
    element('#unlocked').hidden,
    false,
    'hiding the side panel must not lock immediately',
  );
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  document.dispatchEvent(new dom.window.Event('visibilitychange'));

  element('#idle').value = '30';
  element('#idle').onchange();
  assert.equal(dom.window.localStorage.getItem('clearvault.extension.idle'), '30');

  await element('#lock').onclick();
  assert.equal(element('#locked').hidden, false);
  assert.equal(element('#entry-search').value, '');
  assert.equal(badge, '');
});
