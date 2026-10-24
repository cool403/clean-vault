import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import en from '../dist/locales/en.js';
import zh from '../dist/locales/zh-CN.js';
import {
  t,
  html,
  setLanguage,
  initializeLanguage,
  detectLanguage,
  getLocale,
  LANGUAGE_KEY,
} from '../dist/i18n.js';
import { generatePassword, defaultRules } from '../dist/password-generator.js';
import { parseOTP } from '../dist/totp.js';

test('language detection, persistence, metadata and unavailable storage', () => {
  assert.equal(detectLanguage(['fr-FR', 'en-GB']), 'en');
  assert.equal(detectLanguage(['zh-Hans-CN', 'en']), 'zh-CN');
  assert.equal(detectLanguage(['en-US', 'zh-CN']), 'en');
  assert.equal(detectLanguage(['de']), 'en');
  const dom = new JSDOM('<html><head><meta name="description"><link rel="manifest"></head></html>');
  globalThis.document = dom.window.document;
  const stored = new Map();
  globalThis.localStorage = {
    getItem: (key) => stored.get(key),
    setItem: (key, value) => stored.set(key, value),
  };
  assert.equal(initializeLanguage(['en-US']), 'en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.title, 'ClearVault · SafeInCloud Password Manager & Authenticator');
  assert.equal(
    document.querySelector('link[rel=manifest]').getAttribute('href'),
    './manifest.en.webmanifest',
  );
  setLanguage('zh-CN');
  assert.equal(stored.get(LANGUAGE_KEY), 'zh-CN');
  assert.equal(initializeLanguage(['en']), 'zh-CN');
  stored.set(LANGUAGE_KEY, '__proto__');
  assert.equal(initializeLanguage(['en']), 'en');
  assert.throws(() => setLanguage('__proto__'));
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage disabled');
    },
  });
  assert.doesNotThrow(() => {
    initializeLanguage(['zh']);
    setLanguage('en');
  });
  assert.equal(getLocale(), 'en');
  delete globalThis.localStorage;
  delete globalThis.document;
  dom.window.close();
  setLanguage('zh-CN');
});

test('explicit app launch language takes precedence without accepting unknown locales', () => {
  const dom = new JSDOM('<html></html>', { url: 'https://example.test/?lang=en' });
  globalThis.document = dom.window.document;
  assert.equal(initializeLanguage(['zh-CN']), 'en');
  dom.reconfigure({ url: 'https://example.test/?lang=unsupported' });
  assert.equal(initializeLanguage(['zh-CN']), 'zh-CN');
  delete globalThis.document;
  dom.window.close();
});

test('complete matching catalogs and only static UI fragments are translated', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const [key, value] of Object.entries(en)) {
    assert.ok(value, key);
    assert.ok(!/\p{Script=Han}/u.test(value), key);
  }
  setLanguage('en');
  const userTitle = '所有条目',
    userSecret = '密码生成器',
    userNote = '<tag>备注</tag>';
  assert.equal(
    html`<h1>所有条目</h1><p>${userTitle}</p><span>${userSecret}</span>${userNote}`,
    '<h1>All items</h1><p>所有条目</p><span>密码生成器</span><tag>备注</tag>',
  );
  assert.equal(t('未知翻译键'), '未知翻译键');
  assert.equal(t('Count: {count}', { count: 3 }), 'Count: 3');
  assert.throws(() => generatePassword({ ...defaultRules, length: 1 }), /Password length/);
  assert.throws(() => parseOTP('INVALID1'), /Base32/);
  setLanguage('zh-CN');
  assert.equal(t('所有条目'), '所有条目');
});
