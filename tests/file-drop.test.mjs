import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { encryptDatabase, passwordBytes } from '../dist/crypto.js';

// 验证拖入本地 .db 文件后显示解锁表单。
test('dropping a .db file opens the unlock form locally', async () => {
  const dom = new JSDOM(
    '<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div><input id="file-input" type="file"><input id="qr-input" type="file">',
    { url: 'http://localhost/' },
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    DOMParser: dom.window.DOMParser,
    XMLSerializer: dom.window.XMLSerializer,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['en'], clipboard: { writeText: async () => {} } },
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
  globalThis.setTimeout = (fn, duration) => {
    const timer = realTimeout(fn, duration);
    timer.unref?.();
    return timer;
  };
  try {
    await import('../dist/app.js');
    const bytes = await encryptDatabase(
      '<database><card id="1" title="Dropped"><field type="password">secret</field></card></database>',
      passwordBytes('drop-password'),
    );
    const event = new dom.window.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: {
        files: [
          {
            name: 'dropped.db',
            size: bytes.length,
            arrayBuffer: async () => bytes.slice().buffer,
          },
        ],
      },
    });
    document.dispatchEvent(event);
    for (let attempt = 0; attempt < 200; attempt++) {
      if (document.querySelector('#password-form')) break;
      await new Promise((resolve) => realTimeout(resolve, 10));
    }
    assert.equal(event.defaultPrevented, true);
    assert.ok(document.querySelector('#password-form'));
    assert.match(document.querySelector('.password-vault')?.textContent || '', /dropped\.db/);
  } finally {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  }
});
