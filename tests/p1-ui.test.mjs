import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// 验证 P1 的密码库菜单、分段设置、详情主操作和编辑器收起状态。
test('vault menu, sectioned settings and detail actions work on the demo vault', async () => {
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
    assert.fail('P1 UI timeout');
  };
  try {
    await import('../dist/app.js');
    await wait(() => document.querySelectorAll('.entry-row').length === 6);

    // The vault switch opens a real menu instead of showing a toast.
    const vaultMenu = document.querySelector('.vault-menu');
    assert.ok(vaultMenu);
    assert.deepEqual(
      [...vaultMenu.querySelectorAll('.vault-menu-panel [data-action]')].map(
        (item) => item.dataset.action,
      ),
      ['open', 'import', 'save-copy', 'info', 'settings', 'lock'],
    );
    vaultMenu.querySelector('[data-action=import]').click();
    await wait(() => !!document.querySelector('#import-form'));
    assert.equal(document.querySelector('#modal').open, true);
    document.querySelector('#modal [data-import-close]').click();
    await wait(() => !document.querySelector('#modal').open);

    // Settings groups its controls into readable sections.
    document.querySelector('[data-action=settings]').click();
    await wait(() => !!document.querySelector('#idle-select'));
    assert.deepEqual(
      [...document.querySelectorAll('.settings-section > h3')].map((heading) =>
        heading.textContent.trim(),
      ),
      ['安全', '数据与备份', '应用'],
    );
    assert.ok(document.querySelector('.settings-language [data-language]'));
    assert.equal(document.querySelectorAll('.settings-row').length, 2);
    document.querySelector('#modal [data-action=close-modal]').click();
    await wait(() => !document.querySelector('#modal').open);

    // Details lead with copying the password, link the website and tuck
    // archive/trash into an overflow menu.
    document.querySelector('[data-select]').click();
    await wait(() => !!document.querySelector('.detail-copy'));
    assert.equal(document.querySelector('.detail-copy').dataset.action, 'copy-field');
    assert.match(document.querySelector('.detail-copy').textContent, /复制密码/);
    assert.equal(
      document.querySelector('.field-link').getAttribute('href'),
      'https://dash.cloudflare.com',
    );
    assert.equal(document.querySelector('.field-link').getAttribute('rel'), 'noopener noreferrer');
    const overflow = document.querySelector('.detail-overflow');
    overflow.setAttribute('open', '');
    assert.deepEqual(
      [...overflow.querySelectorAll('.detail-overflow-menu [data-action]')].map(
        (item) => item.dataset.action,
      ),
      ['archive', 'delete'],
    );
    assert.equal(document.querySelector('.detail-bottom [data-action=archive]'), null);

    // Toasts are compact, dismissible notifications with a close control.
    document.querySelector('.field-actions [data-action=copy-field]').click();
    await wait(() => document.querySelector('#toast').classList.contains('show'));
    assert.ok(document.querySelector('#toast .toast-message').textContent.length);
    assert.ok(document.querySelector('#toast [data-toast-close]'));
    document.querySelector('#toast [data-toast-close]').click();
    await wait(() => !document.querySelector('#toast').classList.contains('show'));

    // Existing OTP secrets start collapsed; password fields offer inline generation.
    document.querySelector('[data-action=edit]').click();
    await wait(() => !!document.querySelector('#editor-form'));
    const otpEditor = document.querySelector('.otp-secret-editor');
    assert.ok(otpEditor);
    assert.equal(otpEditor.hasAttribute('open'), false);
    assert.ok(otpEditor.querySelector('.field-input'));
    const generate = document.querySelector('[data-action=generate-field]');
    assert.ok(generate);
    generate.click();
    await wait(() => !!document.querySelector('#generator-modal'));
    assert.ok(document.querySelector('#generated-password').value.length >= 4);
    document.querySelector('#generator-modal [data-action=generator-cancel]').click();
    await wait(() => !document.querySelector('#generator-modal'));
  } finally {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  }
});
