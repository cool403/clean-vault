import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const origin = 'https://clear-vault.app';
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
      const { version } = JSON.parse(
        await readFile(new URL('../extension/manifest.json', import.meta.url)),
      );
      assert.equal(doc.querySelectorAll('a[download]').length, 1);
      for (const link of doc.querySelectorAll('a[download]'))
        assert.ok(link.href.includes(`clearvault-${version}-`));
    }
    dom.window.close();
  }
});

test('sitemap contains only public canonical pages; robots preserves crawler restrictions', async () => {
  const xml = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  const dom = new JSDOM(xml, { contentType: 'application/xml' });
  assert.equal(
    dom.window.document.documentElement.namespaceURI,
    'http://www.sitemaps.org/schemas/sitemap/0.9',
  );
  const urls = [...dom.window.document.querySelectorAll('loc')].map((el) => el.textContent);
  assert.equal(urls.length, 14);
  assert.equal(new Set(urls).size, 14);
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
  const robots = await readFile(new URL('../dist/robots.txt', import.meta.url), 'utf8');
  const google = robots.split('User-agent: *')[0];
  assert.match(google, /User-agent: Googlebot/);
  assert.match(google, /User-agent: Google-InspectionTool/);
  assert.match(google, /^Allow: \/\$$/m);
  assert.match(google, /^Allow: \/downloads\/\$$/m);
  assert.match(google, /^Allow: \/sitemap\.xml\$$/m);
  assert.match(google, /^Disallow: \/$/m);
  assert.match(robots, /User-agent: \*\s+Disallow: \//);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  for (const url of urls) assert.ok(google.includes(`Allow: ${new URL(url).pathname}$`), url);
  const imageRules = robots.split('User-agent: Googlebot-Image\n')[1].split('User-agent: *')[0];
  assert.match(imageRules, /^Disallow: \/$/m);
  assert.match(imageRules, /^Allow: \/icon-192\.png\$$/m);
  assert.match(imageRules, /^Allow: \/icon-512\.png\$$/m);
  dom.window.close();
});

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
