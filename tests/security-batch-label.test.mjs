import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// 验证演示库中的安全概览、批量选择和标签管理流程。
test('security overview, batch selection and label management work on the demo vault', async () => {
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
  globalThis.setTimeout = (fn, duration) => {
    const timer = realTimeout(fn, duration);
    timer.unref?.();
    return timer;
  };
  const wait = async (check) => {
    for (let attempt = 0; attempt < 400; attempt++) {
      if (check()) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.fail('security/batch UI timeout');
  };
  const submit = (selector) =>
    document
      .querySelector(selector)
      .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  try {
    await import('../dist/app.js');
    await wait(() => document.querySelectorAll('.entry-row').length === 6);

    document.querySelector('[data-action=security-overview]').click();
    await wait(() => document.querySelectorAll('.security-card').length === 4);
    assert.match(document.querySelector('[data-security-filter=reused]').textContent, /6/);
    document.querySelector('[data-security-filter=reused]').click();
    await wait(() => !!document.querySelector('.security-filter-chip'));
    assert.match(document.querySelector('.security-filter-chip').textContent, /重复使用/);
    assert.equal(document.querySelectorAll('.entry-row').length, 6);
    document.querySelector('[data-action=clear-security-filter]').click();
    await wait(() => !document.querySelector('.security-filter-chip'));

    document.querySelector('[data-action=batch-start]').click();
    await wait(() => !!document.querySelector('.batch-bar'));
    document.querySelector('.batch-check').click();
    await wait(() => document.querySelector('.batch-count').textContent.includes('1'));
    document.querySelector('[data-action=batch-label]').click();
    await wait(() => !!document.querySelector('#batch-label-form'));
    document.querySelector('#batch-label-form').elements.newLabel.value = '测试标签';
    submit('#batch-label-form');
    await wait(() =>
      document.querySelector('#toast').textContent.includes('已为 1 个条目添加标签'),
    );
    assert.equal(document.querySelector('.batch-bar'), null);
    assert.ok(
      [...document.querySelectorAll('.nav-item')].some((item) =>
        item.textContent.includes('测试标签'),
      ),
    );

    document.querySelector('[data-action=manage-labels]').click();
    await wait(() => document.querySelectorAll('.label-manage-row').length === 3);
    document.querySelector('[data-action=label-rename]').click();
    await wait(() => !!document.querySelector('#label-rename-form'));
    document.querySelector('#label-rename-form').elements.name.value = '重命名标签';
    submit('#label-rename-form');
    await wait(() =>
      [...document.querySelectorAll('.nav-item')].some((item) =>
        item.textContent.includes('重命名标签'),
      ),
    );
    await wait(() => document.querySelectorAll('.label-manage-row').length === 3);
    document.querySelector('[data-action=label-merge]').click();
    await wait(() => !!document.querySelector('#label-merge-form'));
    submit('#label-merge-form');
    await wait(() => document.querySelector('#toast').textContent.includes('标签已合并'));
    await wait(() => document.querySelectorAll('.label-manage-row').length === 2);
    document.querySelector('[data-action=label-delete]').click();
    await wait(() => !!document.querySelector('#label-delete-form'));
    submit('#label-delete-form');
    await wait(() => document.querySelector('#toast').textContent.includes('标签已删除'));
    assert.equal(document.querySelectorAll('.label-manage-row').length, 1);
  } finally {
    globalThis.setInterval = realInterval;
    globalThis.setTimeout = realTimeout;
    dom.window.close();
  }
});
