import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// 验证 P0 移动端导航、更多操作面板和编辑器未保存修改保护。
test('mobile tab bar, more sheet and editor discard guard work on the demo vault', async () => {
  const dom = new JSDOM(
    '<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div><input id="file-input" type="file"><input id="qr-input" type="file">',
    { url: 'http://localhost/?demo=1&lang=zh-CN' },
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
    value: { languages: ['zh-CN'], clipboard: { writeText: async () => {} } },
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
  const wait = async (check) => {
    for (let attempt = 0; attempt < 400; attempt++) {
      if (check()) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.fail('mobile UI timeout');
  };
  try {
    await import('../dist/app.js');
    await wait(() => document.querySelectorAll('.entry-row').length === 6);

    assert.equal(document.querySelectorAll('.mobile-tab').length, 4);
    assert.equal(
      document.querySelector('.mobile-tab[data-section=all]').textContent.trim(),
      '所有条目',
    );
    assert.equal(
      document.querySelector('.mobile-tab[data-action=mobile-more]').textContent.trim(),
      '更多',
    );

    document.querySelector('[data-action=mobile-more]').click();
    await wait(() => !!document.querySelector('.mobile-more-sheet'));
    assert.ok(document.querySelectorAll('.mobile-more-item').length >= 10);
    document.querySelector('.mobile-more-sheet [data-section=archive]').click();
    await wait(() => document.querySelector('.page-heading h1')?.textContent.includes('归档'));
    assert.equal(document.querySelector('#modal').open, false);

    document.querySelector('[data-action=mobile-more]').click();
    await wait(() => !!document.querySelector('.mobile-more-sheet'));
    document.querySelector('.mobile-more-sheet [data-action=settings]').click();
    await wait(() => !!document.querySelector('#idle-select'));
    document.querySelector('#modal .modal-heading [data-action=close-modal]').click();
    await wait(() => !document.querySelector('#modal').open);

    document.querySelector('.mobile-tab[data-section=all]').click();
    await wait(() => document.querySelectorAll('.entry-row').length === 6);
    document.querySelector('.entry-row').click();
    await wait(() => !!document.querySelector('.detail-pane .identity h2'));
    document.querySelector('[data-action=edit]').click();
    await wait(() => !!document.querySelector('#editor-form'));
    const title = document.querySelector('#editor-form [name=title]');
    title.value = '未保存的修改';
    title.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    document.querySelector('#editor-form .modal-heading [data-action=close-modal]').click();
    await wait(() => !!document.querySelector('.editor-discard-bar'));
    assert.equal(document.querySelector('#editor-form [name=title]').value, '未保存的修改');
    assert.equal(document.querySelector('#modal').open, true);

    document.querySelector('[data-action=editor-keep-editing]').click();
    await wait(() => !document.querySelector('.editor-discard-bar'));
    assert.equal(document.querySelector('#modal').open, true);

    document.querySelector('#editor-form .modal-heading [data-action=close-modal]').click();
    await wait(() => !!document.querySelector('.editor-discard-bar'));
    document.querySelector('[data-action=editor-discard]').click();
    await wait(() => !document.querySelector('#modal').open);
    assert.equal(document.querySelector('.identity h2').textContent, 'Cloudflare');
  } finally {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  }
});
