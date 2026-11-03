import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const origin = 'https://clear-vault.app';
// 验证公开页面在 JavaScript 执行前已有可读内容，并声明规范网址。
test('public HTML is readable before JavaScript and declares canonical URLs', async () => {
  for (const [file, url] of [
    ['index.html', `${origin}/`],
    ['downloads/index.html', `${origin}/downloads/`],
  ]) {
    const dom = new JSDOM(await readFile(new URL(`../dist/${file}`, import.meta.url), 'utf8'), {
      url,
    });
    const doc = dom.window.document;
    const favicon = doc.querySelector('link[rel=icon]');
    assert.equal(favicon.href, `${origin}/icon-192.png`);
    assert.equal(favicon.type, 'image/png');
    assert.equal(favicon.getAttribute('sizes'), '192x192');
    const png = await readFile(new URL('../dist/icon-192.png', import.meta.url));
    assert.equal(png.readUInt32BE(16), 192);
    assert.equal(png.readUInt32BE(20), 192);
    assert.equal(doc.querySelector('link[rel=canonical]').href, url);
    assert.ok(doc.querySelector('meta[name=description]').content.length > 20);
    assert.ok(doc.querySelector('h1')?.textContent.trim());
    assert.match(doc.body.textContent, /ClearVault/);
    assert.ok(!/noindex/i.test(doc.querySelector('meta[name=robots]')?.content || ''));
    if (file === 'index.html') {
      assert.equal(doc.documentElement.getAttribute('itemtype'), 'https://schema.org/WebSite');
      assert.equal(doc.querySelector('[itemprop=name]').content, 'ClearVault');
      assert.equal(doc.querySelector('[itemprop=url]').href, `${origin}/`);
      assert.match(doc.querySelector('#app').textContent, /SafeInCloud/);
      assert.equal(doc.querySelector('a[href="./downloads/"]').href, `${origin}/downloads/`);
    } else {
      assert.equal(doc.querySelectorAll('a[download]').length, 0);
      assert.ok(doc.querySelector('a[href^="https://chromewebstore.google.com/"]'));
    }
    dom.window.close();
  }
});

// 验证站点地图仅收录公开规范页面，robots 默认放行而不是依赖白名单。
test('sitemap lists only public canonical pages; robots stays allow-by-default', async () => {
  const xml = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  const dom = new JSDOM(xml, { contentType: 'application/xml' });
  assert.equal(
    dom.window.document.documentElement.namespaceURI,
    'http://www.sitemaps.org/schemas/sitemap/0.9',
  );
  const urls = [...dom.window.document.querySelectorAll('loc')].map((el) => el.textContent);
  const guides = new JSDOM(
    await readFile(new URL('../dist/guides/index.html', import.meta.url), 'utf8'),
  );
  const expected = 10 + guides.window.document.querySelectorAll('a.guide-card').length * 2;
  guides.window.close();
  assert.equal(urls.length, expected);
  assert.equal(new Set(urls).size, expected);
  for (const path of [
    '/',
    '/downloads/',
    '/en/',
    '/en/downloads/',
    '/guides/',
    '/en/guides/',
    '/security/',
    '/en/security/',
  ])
    assert.ok(urls.includes(origin + path), path);
  // robots.txt 采用默认放行：新页面不能依赖白名单条目，重要的搜索引擎也不能出现在禁止组里。
  const robots = await readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /^User-agent: \*\nAllow: \/$/m);
  assert.equal(robots.match(/^Disallow:.*$/gm).length, 1, 'only the AI crawler group blocks');
  assert.ok(!/User-agent: (Googlebot|bingbot|Baiduspider|DuckDuckBot)/.test(robots));
  assert.ok(!robots.includes('BEGIN PUBLIC PAGES'));
  assert.equal(robots.match(/^Sitemap: .+$/gm).length, 1);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.match(robots, /User-agent: GPTBot/);
  for (const el of dom.window.document.querySelectorAll('lastmod'))
    assert.match(el.textContent, /^\d{4}-\d{2}-\d{2}$/);
  dom.window.close();
});

// 验证广告权限只来自响应头，密码库与下载页面用更严格的 meta 与之取交集。
test('ad hosts are granted site-wide but never on the vault page', async () => {
  const headers = await readFile(new URL('../dist/_headers', import.meta.url), 'utf8');
  const header = headers.match(/^\s*Content-Security-Policy: (.+)$/m)?.[1] || '';
  assert.match(header, /https:\/\/pagead2\.googlesyndication\.com/);
  assert.match(header, /frame-src[^;]*doubleclick/);

  for (const file of ['index.html', 'downloads/index.html']) {
    const dom = new JSDOM(await readFile(new URL(`../dist/${file}`, import.meta.url), 'utf8'));
    const doc = dom.window.document;
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || '';
    assert.ok(meta, `${file} keeps its own CSP`);
    assert.doesNotMatch(meta, /googlesyndication|doubleclick|google\.com/, file);
    assert.doesNotMatch(meta, /script-src[^;]*'unsafe-inline'/, file);
    assert.equal(doc.querySelectorAll('script[src*="googlesyndication"], iframe').length, 0, file);
    dom.window.close();
  }
});

// 验证 noindex 响应头仅作用于默认 Pages 域名及其预览域名。
test('noindex headers are limited to the default Pages host and its previews', async () => {
  const headers = await readFile(new URL('../dist/_headers', import.meta.url), 'utf8');
  const blocks = headers
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').filter((line) => line.trim() && !line.startsWith('#')));
  const noindexRules = blocks.filter((lines) =>
    lines.slice(1).some((line) => /X-Robots-Tag:\s*noindex/i.test(line)),
  );
  assert.deepEqual(
    noindexRules.map((lines) => lines[0]),
    [
      'https://clearvault-safeincloud.pages.dev/*',
      'https://:version.clearvault-safeincloud.pages.dev/*',
    ],
  );
  assert.ok(
    !noindexRules.some((lines) => lines[0] === '/*' || lines[0].includes('clear-vault.app')),
  );
});
