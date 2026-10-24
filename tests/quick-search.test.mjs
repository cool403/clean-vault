import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createQuickSearch } from '../dist/quick-search.js';

test('quick search supports IME, keyboard selection, copying, errors, escape and secret cleanup', async () => {
  const dom = new JSDOM('<button id="launcher">Open</button>', { url: 'http://localhost/' });
  globalThis.document = dom.window.document;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  const entries = [
    { id: '1', title: 'GitHub', subtitle: 'alice', search: 'GitHub alice 工作', hasPassword: true },
    {
      id: '2',
      title: '<b>Google</b>',
      subtitle: 'bob',
      search: 'Google bob 生活',
      hasPassword: true,
    },
    { id: '3', title: 'OTP only', subtitle: 'carol', search: 'OTP only', hasPassword: false },
  ];
  let copied,
    viewed,
    locked = false,
    failure = false,
    pending;
  const notifications = [];
  const palette = createQuickSearch({
    notify: (message) => notifications.push(message),
    items: () => entries,
    copyPassword: async (id) => {
      if (failure) throw new Error('Denied');
      copied = id;
      if (pending) await pending;
    },
    openEntry: (id) => {
      viewed = id;
    },
    lock: () => {
      locked = true;
      palette.close(false);
    },
  });
  const key = (name, options = {}, target = document.querySelector('input')) => {
    const event = new dom.window.KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    target.dispatchEvent(event);
    return event;
  };
  const input = () => document.querySelector('input');
  const type = (value) => {
    input().value = value;
    input().dispatchEvent(new dom.window.InputEvent('input', { bubbles: true }));
  };
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  document.querySelector('#launcher').focus();
  palette.show();
  assert.equal(document.activeElement, input());
  assert.equal(document.querySelectorAll('[role=option]').length, 3);
  assert.equal(document.querySelector('.quick-results b'), null, 'vault labels are escaped');
  key('ArrowDown');
  assert.equal(input().getAttribute('aria-activedescendant'), 'quick-result-1');
  key('Enter', { ctrlKey: true });
  await tick();
  assert.equal(copied, '2');
  assert.equal(notifications.at(-1), '已复制到剪贴板');
  assert.equal(document.querySelector('.quick-feedback'), null);
  assert.equal(document.activeElement, input(), 'notification does not interrupt typing');
  key('ArrowDown');
  assert.equal(document.querySelector('[data-quick-copy]').disabled, true);
  key('Enter', { ctrlKey: true });
  await tick();
  assert.equal(copied, '2');
  type('生活');
  assert.equal(document.querySelectorAll('[role=option]').length, 1);
  const original = input();
  original.dispatchEvent(new dom.window.CompositionEvent('compositionstart', { bubbles: true }));
  type('gong');
  assert.equal(key('ArrowDown', { isComposing: true }).defaultPrevented, false);
  key('Enter', { ctrlKey: true, isComposing: true });
  await tick();
  assert.equal(copied, '2');
  assert.equal(document.querySelectorAll('[role=option]').length, 1);
  original.value = '工作';
  original.dispatchEvent(new dom.window.CompositionEvent('compositionend', { bubbles: true }));
  assert.equal(input(), original);
  assert.match(document.querySelector('[role=option]').textContent, /GitHub/);
  failure = true;
  key('Enter', { metaKey: true });
  await tick();
  assert.match(notifications.at(-1), /复制失败/);
  failure = false;
  key('Enter');
  assert.equal(viewed, '1');
  assert.equal(palette.isOpen, false);
  palette.show();
  type('no matching entry');
  key('ArrowUp');
  key('Enter');
  assert.equal(document.querySelector('[data-quick-copy]').disabled, true);
  key('Escape');
  assert.equal(palette.isOpen, false);
  document.querySelector('#launcher').focus();
  palette.show();
  key('Escape');
  assert.equal(document.activeElement.id, 'launcher');
  palette.show();
  let finish;
  pending = new Promise((resolve) => {
    finish = resolve;
  });
  key('Enter', { ctrlKey: true });
  document.querySelector('[data-quick-lock]').click();
  assert.equal(locked, true);
  assert.equal(document.querySelector('#quick-search-modal'), null);
  const notificationCount = notifications.length;
  finish();
  await tick();
  assert.equal(notifications.length, notificationCount, 'do not notify after closing');
  assert.equal(
    document.querySelector('#quick-search-modal'),
    null,
    'late clipboard completion cannot restore vault UI',
  );
  dom.window.close();
});
