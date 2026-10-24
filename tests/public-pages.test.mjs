import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const origin = 'https://clear-vault.app';
const dist = new URL('../dist/', import.meta.url);

test('every public page has static content, reciprocal languages and working local navigation', async () => {
  const sitemap = new JSDOM(await readFile(new URL('sitemap.xml', dist), 'utf8'), {
    contentType: 'application/xml',
  });
  const urls = [...sitemap.window.document.querySelectorAll('loc')].map((el) => el.textContent);
  const pages = new Map();
  for (const url of urls) {
    const route = new URL(url).pathname;
    const dom = new JSDOM(await readFile(new URL('.' + route + 'index.html', dist), 'utf8'), {
      url,
    });
    pages.set(url, dom);
  }
  for (const [url, dom] of pages) {
    const doc = dom.window.document;
    assert.equal(doc.querySelector('link[rel=canonical]').href, url);
    if (new URL(url).pathname.includes('/downloads/')) {
      assert.equal(doc.querySelectorAll('a[download]').length, 1, url);
      assert.equal(doc.querySelector('a[href$="-source.zip"]'), null, url);
      assert.ok(
        [...doc.querySelectorAll('a')].some((anchor) =>
          anchor.href.startsWith('https://github.com/'),
        ),
        url,
      );
    }
    const expectedLocale = new URL(url).pathname.startsWith('/en/') ? 'en' : 'zh-CN';
    assert.equal(doc.documentElement.lang, expectedLocale);
    assert.equal(doc.querySelectorAll('h1').length, 1, url);
    assert.ok(doc.querySelector('meta[name=description]').content.length > 25, url);
    assert.ok(doc.body.textContent.trim().length > 200, url);
    const alternates = [...doc.querySelectorAll('link[rel=alternate][hreflang]')];
    assert.equal(alternates.length, 3, url);
    for (const alternate of alternates) {
      assert.ok(pages.has(alternate.href), alternate.href);
      const target = pages.get(alternate.href).window.document;
      assert.equal(target.querySelector(`link[hreflang="${expectedLocale}"]`).href, url);
    }
    for (const anchor of doc.querySelectorAll('a[href]')) {
      const href = new URL(anchor.href);
      if (
        href.origin !== origin ||
        anchor.hasAttribute('download') ||
        href.pathname.endsWith('SHA256SUMS.json')
      )
        continue;
      if (href.hash && href.pathname === new URL(url).pathname) {
        assert.ok(doc.getElementById(href.hash.slice(1)), anchor.href);
      } else if (href.pathname.endsWith('/')) {
        assert.ok(pages.has(origin + href.pathname), anchor.href);
      } else {
        await access(new URL('.' + href.pathname, dist));
      }
    }
    if (
      new URL(url).pathname.includes('/guides/') ||
      new URL(url).pathname.includes('/security/')
    ) {
      assert.equal(
        doc.querySelectorAll('script').length,
        0,
        'Public documentation must not need JavaScript',
      );
      assert.ok(
        !doc.querySelector('input, textarea'),
        'No collection forms on public documentation',
      );
    }
  }
  for (const dom of pages.values()) dom.window.close();
  sitemap.window.close();
});
