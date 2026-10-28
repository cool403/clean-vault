import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { encryptDatabase, passwordBytes } from '../dist/crypto.js';
// 验证扩展面板解密数据库、匹配站点且仅填充选中账号，并阻止锁定后的过期请求。
test('extension panel decrypts, matches, fills selected login only, and locks stale requests', async () => {
  const dom = new JSDOM(
    await readFile(new URL('../extension/panel.html', import.meta.url), 'utf8'),
    { url: 'https://extension.test/' },
  );
  const realInterval = globalThis.setInterval;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  globalThis.setInterval = () => 0;
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    DOMParser: dom.window.DOMParser,
    XMLSerializer: dom.window.XMLSerializer,
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en' } });
  let injected = null,
    current = { id: 5, url: 'https://example.com/login' },
    slow = null;
  globalThis.chrome = {
    tabs: {
      query: async () => (slow ? await slow : [current]),
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
    },
    scripting: {
      executeScript: async (args) => {
        injected = args;
        return [{ result: 'filled' }];
      },
    },
  };
  await import('../extension/panel.js');
  const xml =
    '<database><card id="1" title="Example"><field type="website">https://example.com</field><field type="login">alice</field><field type="password">selected-secret</field></card><card id="2" title="Other"><field type="website">https://other.test</field><field type="password">never-send</field></card></database>';
  const bytes = await encryptDatabase(xml, passwordBytes('synthetic-password'));
  Object.defineProperty(document.querySelector('#file'), 'files', {
    configurable: true,
    value: [{ name: 'synthetic.db', size: bytes.length, arrayBuffer: async () => bytes.buffer }],
  });
  document.querySelector('#password').value = 'synthetic-password';
  const event = new dom.window.Event('submit', { cancelable: true });
  await document.querySelector('#unlock').onsubmit(event);
  assert.equal(document.querySelector('#unlocked').hidden, false);
  assert.equal(document.querySelector('#password').value, '');
  assert.equal(document.querySelectorAll('.entry').length, 1);
  await document.querySelector('.entry button').onclick();
  assert.deepEqual(injected.args, ['https://example.com', 'alice', 'selected-secret']);
  assert.deepEqual(injected.target, { tabId: 5, frameIds: [0] });
  assert.equal(injected.world, 'ISOLATED');
  const fill = document.querySelector('.entry button');
  injected = null;
  let resolve;
  slow = new Promise((r) => {
    resolve = r;
  });
  const pending = fill.onclick();
  document.querySelector('#lock').click();
  resolve([current]);
  await pending;
  assert.equal(injected, null);
  assert.equal(document.querySelectorAll('.entry').length, 0);
  assert.equal(document.querySelector('#locked').hidden, false);
  globalThis.setInterval = realInterval;
  dom.window.close();
});
