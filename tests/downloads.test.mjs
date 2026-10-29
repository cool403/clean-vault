import { buildInfo } from '../dist/build-info.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
// 验证下载目录页按语言展示并正确定位安装包，避免页面与同名目录的路径冲突。
test('download directory page localizes and resolves packages without HTML/directory collision', async () => {
  const dom = new JSDOM(
    await readFile(new URL('../dist/downloads/index.html', import.meta.url), 'utf8'),
    { url: 'https://example.test/downloads/' },
  );
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages: ['en'], language: 'en' },
  });
  await import('../dist/downloads.js');
  assert.equal(document.querySelector('h1').textContent, 'Downloads and source');
  assert.equal(document.querySelector('script').src, 'https://example.test/downloads.js');
  assert.equal(
    document.querySelector('a[download]').href,
    `https://example.test/downloads/clearvault-${buildInfo.version}-extension.zip`,
  );
  assert.equal(
    document.querySelector('a.button').href,
    'https://chromewebstore.google.com/detail/pdokjilndibdneiefigknhclkbheikkk',
  );
  assert.equal(document.querySelectorAll('a[download]').length, 1);
  assert.equal(document.querySelector('a[href$="-source.zip"]'), null);
  assert.ok([...document.querySelectorAll('a')].some((anchor) => anchor.href === buildInfo.source));
  assert.match(document.body.textContent, /Production code stays readable/);
  for (const [code, title] of [
    ['de', 'Downloads und Quellcode'],
    ['ja', 'ダウンロードとソースコード'],
    ['es', 'Descargas y código fuente'],
  ]) {
    const language = document.querySelector('select');
    language.value = code;
    language.onchange({ target: language });
    assert.equal(document.querySelector('h1').textContent, title);
    assert.equal(document.querySelectorAll('select option').length, 5);
  }
  const picker = document.querySelector('select');
  picker.value = 'zh-CN';
  picker.onchange({ target: picker });
  assert.equal(document.querySelector('h1').textContent, '下载与源代码');
  assert.match(document.body.textContent, /线上代码保持可读/);
  assert.equal(
    document.querySelector('a.button').href,
    'https://chromewebstore.google.com/detail/pdokjilndibdneiefigknhclkbheikkk',
  );
  assert.equal(document.querySelectorAll('a[download]').length, 1);
  assert.equal(document.querySelector('a[href$="-source.zip"]'), null);
  dom.window.close();
});
