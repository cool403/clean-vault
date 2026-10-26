import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('a shared demo URL opens the demo vault with a conversion-focused save label', async () => {
  const dom = new JSDOM(
    '<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div><input id="file-input" type="file"><input id="qr-input" type="file">',
    { url: 'http://localhost/?demo=1&lang=zh-CN' },
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['zh-CN'], clipboard: { writeText: async () => {} } },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: dom.window.localStorage,
  });
  const realInterval = globalThis.setInterval,
    realTimeout = globalThis.setTimeout;
  globalThis.setInterval = () => 0;
  globalThis.setTimeout = (fn, duration) => {
    const timer = realTimeout(fn, duration);
    timer.unref?.();
    return timer;
  };
  try {
    await import('../dist/app.js');
    for (let attempt = 0; attempt < 200; attempt++) {
      if (document.querySelectorAll('.entry-row').length) break;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.equal(document.querySelectorAll('.entry-row').length, 6);
    assert.match(document.querySelector('.vault-switch strong').textContent, /体验密码库/);
    assert.match(document.querySelector('[data-action=save]').textContent, /保存为我的密码库/);
    assert.ok(document.querySelector('[data-action=demo]') === null);
    document.querySelector('.sidebar-actions [data-action=settings]').click();
    assert.equal(document.querySelector('#clipboard-select').value, '30');
    assert.ok(document.querySelector('[data-action=recovery-kit]'));
    const timeout = document.querySelector('#clipboard-select');
    timeout.value = '15';
    timeout.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(dom.window.localStorage.getItem('clearvault.clipboardTimeout'), '15');
  } finally {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  }
});
