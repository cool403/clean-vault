import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('search preserves IME composition and filters committed Chinese, pasted text and Latin input', async (t) => {
  const dom = new JSDOM(
    '<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div><input id="file-input" type="file"><input id="qr-input" type="file">',
    { url: 'http://localhost/' },
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    DOMParser: dom.window.DOMParser,
    XMLSerializer: dom.window.XMLSerializer,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['zh-CN'], language: 'zh-CN' },
  });
  const realInterval = globalThis.setInterval;
  globalThis.setInterval = () => 0;
  t.after(() => {
    globalThis.setInterval = realInterval;
    dom.window.close();
  });
  await import('../dist/app.js');
  document.querySelector('[data-action=demo]').click();
  const search = () => document.querySelector('#search');
  const rows = () => [...document.querySelectorAll('[data-select]')];
  const input = (element, value, options = {}) => {
    element.value = value;
    element.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true, ...options }));
  };
  const compose = (element, type, data = '') => {
    element.dispatchEvent(new dom.window.CompositionEvent(type, { bubbles: true, data }));
  };

  const initialRows = rows().length;
  assert.ok(initialRows > 1);
  const original = search();
  original.focus();
  compose(original, 'compositionstart');
  input(original, 'sheng', { isComposing: true, inputType: 'insertCompositionText' });
  assert.equal(search(), original, 'do not replace the active IME element');
  assert.equal(document.activeElement, original);
  assert.equal(rows().length, initialRows, 'do not filter partially composed text');
  // Some browsers omit isComposing on an intermediate input event.
  input(original, '生活', { inputType: 'insertCompositionText' });
  assert.equal(search(), original);
  compose(original, 'compositionend', '生活');
  assert.equal(search().value, '生活');
  assert.ok(rows().length > 0, 'committed Chinese can search demo labels');
  assert.equal(document.activeElement, search());

  const committed = search();
  input(committed, '生活', { inputType: 'insertFromComposition' });
  assert.equal(search(), committed, 'ignore the duplicate final input after compositionend');

  input(search(), '不存在的条目');
  assert.equal(rows().length, 0);
  input(search(), 'GitHub', { inputType: 'insertFromPaste' });
  assert.equal(rows().length, 1);
  assert.match(rows()[0].textContent, /GitHub/);
  input(search(), 'figma');
  assert.equal(rows().length, 1);
  assert.match(rows()[0].textContent, /Figma/);
  input(search(), '', { inputType: 'deleteContentBackward' });
  assert.equal(rows().length, initialRows);

  // isComposing alone must also protect a field if compositionstart is absent.
  const fallback = search();
  input(fallback, 'zhong', { isComposing: true });
  assert.equal(search(), fallback);
  fallback.value = '中文';
  compose(fallback, 'compositionend', '中文');
  assert.equal(search().value, '中文');
  // An aborted composition must leave subsequent ordinary input usable.
  input(search(), 'GitHub');
  assert.equal(rows().length, 1);
  const canceled = search();
  compose(canceled, 'compositionstart');
  input(canceled, 'gi', { isComposing: true });
  canceled.value = 'GitHub';
  compose(canceled, 'compositionend');
  assert.equal(search(), canceled);
  assert.equal(rows().length, 1);
});
