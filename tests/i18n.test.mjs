import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import en from '../dist/locales/en.js';
import zh from '../dist/locales/zh-CN.js';
import de from '../dist/locales/de.js';
import ja from '../dist/locales/ja.js';
import es from '../dist/locales/es.js';
import { readFile } from 'node:fs/promises';
import {
  t,
  html,
  setLanguage,
  initializeLanguage,
  detectLanguage,
  getLocale,
  LANGUAGE_KEY,
  supportedLocales,
} from '../dist/i18n.js';
import { generatePassword, defaultRules } from '../dist/password-generator.js';
import { parseOTP } from '../dist/totp.js';

// 验证语言自动检测、偏好持久化和页面元数据更新，并兼容存储不可用的情况。
test('language detection, persistence, metadata and unavailable storage', () => {
  assert.equal(detectLanguage(['fr-FR', 'en-GB']), 'en');
  assert.equal(detectLanguage(['zh-Hans-CN', 'en']), 'zh-CN');
  assert.equal(detectLanguage(['en-US', 'zh-CN']), 'en');
  assert.equal(detectLanguage(['de-DE']), 'de');
  assert.equal(detectLanguage(['fr', 'ja-JP', 'en']), 'ja');
  assert.equal(detectLanguage(['es-MX', 'zh-CN']), 'es');
  assert.equal(detectLanguage(['fr']), 'en');
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

// 验证启动参数指定的语言优先于其他设置，且不接受未知语言代码。
test('explicit app launch language takes precedence without accepting unknown locales', () => {
  const dom = new JSDOM('<html></html>', { url: 'https://example.test/?lang=en' });
  globalThis.document = dom.window.document;
  assert.equal(initializeLanguage(['zh-CN']), 'en');
  dom.reconfigure({ url: 'https://example.test/?lang=unsupported' });
  assert.equal(initializeLanguage(['zh-CN']), 'zh-CN');
  delete globalThis.document;
  dom.window.close();
});

// 验证翻译词条完整且键名一致，只翻译静态界面片段而保留用户数据。
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

// 验证所有界面语言保留插值参数和用户原文，并正确更新元数据及语言偏好。
test('all interface catalogs preserve parameters, literal user data, metadata and preferences', async () => {
  const catalogs = { 'zh-CN': zh, en, de, ja, es };
  assert.deepEqual(
    supportedLocales.map((locale) => locale.code).sort(),
    Object.keys(catalogs).sort(),
  );
  const dom = new JSDOM(
    '<html><head><meta name="description"><link rel="manifest"></head></html>',
    { url: 'https://example.test/' },
  );
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  const parameters = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  const userText = '所有条目 · Passwort · パスワード · Contraseña <note>';
  for (const [code, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(en).sort(), code);
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(typeof value === 'string' && value.trim(), `${code}: ${key}`);
      assert.deepEqual(parameters(value), parameters(key), `${code}: ${key}`);
      if (['de', 'es', 'en'].includes(code))
        assert.ok(!/\p{Script=Han}/u.test(value), `${code}: ${key}`);
    }
    setLanguage(code);
    assert.equal(document.documentElement.lang, code);
    assert.equal(document.title, catalog['ClearVault · SafeInCloud 兼容密码管理器与双重验证器']);
    assert.equal(
      document.querySelector('meta[name=description]').content,
      catalog['ClearVault，本地优先的密码库与双重验证器。打开、管理和保存 SafeInCloud 数据库。'],
    );
    assert.equal(initializeLanguage(['fr']), code, 'saved selection survives restart');
    assert.equal(
      html`<h1>所有条目</h1><p>${userText}</p>`,
      `<h1>${catalog['所有条目']}</h1><p>${userText}</p>`,
    );
    assert.equal(
      t('找到 {count} 个条目', { count: 7 }),
      catalog['找到 {count} 个条目'].replace('{count}', '7'),
    );
    const manifestPath = document.querySelector('link[rel=manifest]').getAttribute('href');
    const manifest = JSON.parse(
      await readFile(new URL('../dist/' + manifestPath, import.meta.url), 'utf8'),
    );
    assert.equal(manifest.lang, code);
    if (['de', 'ja', 'es'].includes(code)) {
      assert.equal(manifest.name, catalog['ClearVault · 密码与验证器']);
      assert.equal(manifest.start_url, './?lang=' + code);
      dom.reconfigure({ url: 'https://example.test/?lang=' + code });
      assert.equal(initializeLanguage(['zh-CN']), code, 'explicit launch language wins');
      dom.reconfigure({ url: 'https://example.test/' });
    }
  }
  delete globalThis.localStorage;
  delete globalThis.document;
  dom.window.close();
  setLanguage('zh-CN');
});

// 验证新增语言在应用、扩展和离线缓存中均被一致打包。
test('new languages are packaged identically for the app, extension and offline cache', async () => {
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  for (const code of ['de', 'ja', 'es']) {
    assert.ok(worker.includes(`'./locales/${code}.js'`));
    assert.ok(worker.includes(`'./manifest.${code}.webmanifest'`));
    assert.equal(
      await readFile(new URL(`../dist/locales/${code}.js`, import.meta.url), 'utf8'),
      await readFile(new URL(`../extension/core/locales/${code}.js`, import.meta.url), 'utf8'),
    );
  }
  const extensionManifest = JSON.parse(
    await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'),
  );
  assert.equal(extensionManifest.default_locale, 'en');
  for (const code of ['en', 'zh_CN', 'de', 'ja', 'es']) {
    const messages = JSON.parse(
      await readFile(
        new URL(`../extension/_locales/${code}/messages.json`, import.meta.url),
        'utf8',
      ),
    );
    for (const token of [
      extensionManifest.name,
      extensionManifest.description,
      extensionManifest.action.default_title,
    ]) {
      const key = token.match(/^__MSG_(\w+)__$/)?.[1];
      assert.ok(key && messages[key]?.message, `${code}: ${token}`);
    }
  }
});
