import { buildInfo } from '../dist/build-info.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
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
    'https://example.test/downloads/clearvault-0.3.8-extension.zip',
  );
  const source = document.querySelectorAll('a[download]')[1];
  assert.equal(source.href, 'https://example.test/downloads/clearvault-0.3.8-source.zip');
  assert.ok([...document.querySelectorAll('a')].some((anchor) => anchor.href === buildInfo.source));
  assert.match(document.body.textContent, /Production code stays readable/);
  const picker = document.querySelector('select');
  picker.value = 'zh-CN';
  picker.onchange({ target: picker });
  assert.equal(document.querySelector('h1').textContent, '下载与源代码');
  assert.match(document.body.textContent, /线上代码保持可读/);
  dom.window.close();
});
