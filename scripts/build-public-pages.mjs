import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { format } from 'prettier';
import { articles, security } from './public-content.mjs';
import { buildInfo } from './project.mjs';
await writeFile(
  new URL('../dist/build-info.js', import.meta.url),
  await format(`export const buildInfo = ${JSON.stringify(buildInfo, null, 2)};\n`, {
    parser: 'babel',
    singleQuote: true,
  }),
);
await writeFile(
  new URL('../dist/build-info.json', import.meta.url),
  JSON.stringify(buildInfo, null, 2) + '\n',
);
const repo = buildInfo.repository || '/downloads/';
const sourceURL = buildInfo.source || '/downloads/';
const githubFile = (path) => `${buildInfo.repository}/blob/${buildInfo.revision || 'main'}/${path}`;
const workflowURL =
  buildInfo.workflow || (buildInfo.repository ? repo + '/actions' : '/downloads/');

const dist = new URL('../dist/', import.meta.url);
const origin = 'https://clear-vault.app';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const routes = ['/', '/downloads/'];
const link = (url, text, cls = '') =>
  `<a href="${url}"${cls ? ` class="${cls}"` : ''}>${escape(text)}</a>`;
const names = {
  zh: {
    home: '首页',
    guides: '使用指南',
    security: '安全与隐私',
    downloads: '下载与源码',
    open: '打开密码库',
    tag: '你的设备，你的密码库',
    contents: '本页内容',
    related: '继续阅读',
    back: '所有指南',
    language: 'English',
    step: '使用指南',
    note: '独立的 SafeInCloud 兼容工具 · 无需注册',
    cta: '准备好开始了吗？',
    tip: '先用演示数据体验，再用数据库副本验证。',
  },
  en: {
    home: 'Home',
    guides: 'Guides',
    security: 'Security & privacy',
    downloads: 'Downloads & source',
    open: 'Open vault',
    tag: 'Your device. Your vault.',
    contents: 'On this page',
    related: 'Keep reading',
    back: 'All guides',
    language: '简体中文',
    step: 'GUIDES',
    note: 'An independent SafeInCloud-compatible tool · No account required',
    cta: 'Ready for a little more clarity?',
    tip: 'Try the demo, then test a copy of your database.',
  },
};
const prefix = (locale) => (locale === 'en' ? '/en' : '');
const app = (locale) => (locale === 'en' ? '/?lang=en' : '/?lang=zh-CN');
const alternates = (zh, en) =>
  `<link rel="alternate" hreflang="zh-CN" href="${origin}${zh}" /><link rel="alternate" hreflang="en" href="${origin}${en}" /><link rel="alternate" hreflang="x-default" href="${origin}${zh}" />`;

async function page(locale, route, other, title, description, body, kind = '') {
  const n = names[locale],
    p = prefix(locale),
    en = locale === 'en';
  const html = `<!doctype html><html lang="${en ? 'en' : 'zh-CN'}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" /><meta name="referrer" content="no-referrer" /><meta name="description" content="${escape(description)}" /><meta name="theme-color" content="#f5f1e7" /><title>${escape(title)} · ClearVault</title><link rel="canonical" href="${origin}${route}" />${alternates(en ? other : route, en ? route : other)}<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" /><link rel="stylesheet" href="/public.css" /><meta property="og:type" content="website" /><meta property="og:site_name" content="ClearVault" /><meta property="og:title" content="${escape(title)} · ClearVault" /><meta property="og:description" content="${escape(description)}" /><meta property="og:url" content="${origin}${route}" /><meta property="og:image" content="${origin}/icon-512.png" /></head><body><a class="skip" href="#main">${en ? 'Skip to content' : '跳到正文'}</a><header class="site-header"><a class="brand" href="${en ? '/en/' : '/'}"><img src="/icon.svg" width="30" height="30" alt="" />ClearVault<span>.</span></a><nav aria-label="${en ? 'Main navigation' : '主导航'}">${link(p + '/guides/', n.guides)}${link(p + '/security/', n.security)}${link(p + '/downloads/', n.downloads)}${link(other, n.language, 'language')}</nav></header><main id="main" class="${kind}">${body}</main><section class="end-note"><div><h2>${n.cta}</h2><p>${n.tip}</p></div>${link(app(locale), n.open + ' ↗', 'button')}</section><footer class="site-footer"><div class="brand">ClearVault.</div><p>${n.note}</p><nav>${link(p + '/guides/', n.guides)}${link(p + '/security/', n.security)}${link(p + '/downloads/', n.downloads)}${en ? link('https://ko-fi.com/lurefun', 'Support on Ko-fi ↗') : ''}</nav><small>© ClearVault · MIT · ${version} · ${link(repo, 'GitHub')} · ${link(workflowURL, en ? 'Build history' : '构建记录')}</small></footer></body></html>`;
  const path = new URL('.' + route + 'index.html', dist);
  await mkdir(new URL('./', path), { recursive: true });
  await writeFile(path, await format(html, { parser: 'html', printWidth: 100 }));
  routes.push(route);
}

for (const locale of ['zh', 'en']) {
  const en = locale === 'en',
    p = prefix(locale),
    otherP = en ? '' : '/en',
    n = names[locale];
  const cards = articles
    .map(
      (a, i) =>
        `<a class="guide-card" href="${p}/guides/${a.slug}/"><span class="number">0${i + 1}</span><h2>${escape(a[locale].title)}</h2><p>${escape(a[locale].description)}</p><span class="read">${en ? 'Read guide' : '阅读指南'} ↗</span></a>`,
    )
    .join('');
  await page(
    locale,
    p + '/guides/',
    otherP + '/guides/',
    en ? 'Guides for your local password vault' : '本地密码库使用指南',
    en
      ? 'Practical ClearVault guides: open SafeInCloud DB files, use Linux and offline mode, import from 1Password, LastPass or Apple Passwords, sync with your own folder, and set up TOTP codes.'
      : 'ClearVault 实用教程：打开 SafeInCloud DB、在 Linux 离线使用密码库、从 1Password / LastPass / Apple Passwords 导入、用自己的文件夹同步，以及设置 TOTP 双重验证与保存备份。',
    `<section class="hero"><span class="eyebrow">A LITTLE HELP, WHEN YOU NEED IT</span><h1>${en ? 'A calmer way<br>to get started.' : '从容开始，<br>安心使用。'}</h1><p>${en ? 'Practical guides for the files, passwords and codes you keep close.' : '从打开第一份数据库，到保存、备份和两步验证。每一步，都说清楚。'}</p></section><div class="guide-grid">${cards}</div><aside class="notice">${en ? 'Before you start: keep an independent encrypted backup and try a copy of your database.' : '开始前，请保留独立的加密备份，并先用数据库副本验证。'} ${link(p + '/security/', n.security + ' ↗')}</aside>`,
  );
  for (const a of [...articles, { slug: null, ...security }]) {
    const item = a[locale];
    const route = a.slug ? `${p}/guides/${a.slug}/` : `${p}/security/`;
    const counterpart = a.slug ? `${otherP}/guides/${a.slug}/` : `${otherP}/security/`;
    const sections = item.sections
      .map(
        ([h, text], i) =>
          `<section id="section-${i + 1}"><h2>${escape(h)}</h2><p>${escape(text)}</p></section>`,
      )
      .join('');
    const toc = item.sections.map(([h], i) => link(`#section-${i + 1}`, h)).join('');
    await page(
      locale,
      route,
      counterpart,
      item.title,
      item.description,
      `<div class="article-head">${link(p + '/guides/', '← ' + n.back, 'back')}<span class="eyebrow">${a.slug ? n.step : 'TRUST, WITH CLARITY'}</span><h1>${escape(item.title)}</h1><p class="lead">${escape(item.intro)}</p>${!a.slug ? `<span class="status-pill">${en ? 'Independent audit not completed' : '尚未经过独立安全审计'}</span>` : ''}</div><div class="reading-layout"><aside class="toc" aria-label="${n.contents}"><strong>${n.contents}</strong>${toc}</aside><article class="prose">${sections}<section class="related"><h2>${n.related}</h2>${articles
        .filter((b) => b.slug !== a.slug)
        .map((b) => link(`${p}/guides/${b.slug}/`, b[locale].title + ' ↗'))
        .join(
          '',
        )}${a.slug ? link(p + '/security/', n.security + ' ↗') : link(p + '/downloads/', n.downloads + ' ↗')}</section></article></div>`,
      'article-page',
    );
  }
  if (en) {
    await page(
      'en',
      '/en/',
      '/',
      'Local password manager & SafeInCloud authenticator',
      'Open, edit and save SafeInCloud .db files locally with ClearVault. A browser-based password vault with TOTP codes, offline PWA use and readable source code.',
      `<section class="hero landing"><span class="eyebrow">A LITTLE SPACE FOR PEACE OF MIND</span><h1>Everything important.<br>A little more secure.</h1><p>A local home for your passwords and two-factor codes. Open your SafeInCloud database and keep your files in your own hands.</p><div class="actions">${link(app('en'), 'Open ClearVault ↗', 'button')}${link('/en/guides/open-safeincloud-db/', 'Read the getting-started guide', 'text-link')}</div><small>No account required · No vault upload</small></section><section class="feature-row"><div><span>01 / LOCAL</span><h2>Unlock on your device.</h2><p>Your master password decrypts the database in your browser. Save edits to an encrypted file you control.</p></div><div><span>02 / AUTHENTICATOR</span><h2>Your next code, at a glance.</h2><p>Keep TOTP codes alongside entries, or choose a separate authenticator when you need stronger isolation.</p></div><div><span>03 / PORTABLE</span><h2>A familiar file. More freedom.</h2><p>Use a compatible .db file on Linux and other browser platforms. Offline use requires application resources to be cached first.</p></div></section><section class="section-heading"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>A few useful places to start.</h2></section><div class="guide-grid">${cards}</div><aside class="notice">ClearVault is an independent compatible tool, not an official SafeInCloud product. No independent security audit has been completed. ${link('/en/security/', 'Read the security boundaries ↗')}</aside>`,
      'english-home',
    );
    await page(
      'en',
      '/en/downloads/',
      '/downloads/',
      'Downloads and source code',
      'Download the ClearVault Chrome / Edge extension, browse MIT source on GitHub, verify package checksums, and follow installation and self-hosting instructions.',
      `<section class="hero"><span class="eyebrow">YOURS TO KEEP</span><h1>Take ClearVault<br>with you.</h1><p>Version ${version}. MIT licensed. Readable source in production.</p></section><div class="download-grid"><section class="guide-card"><h2>Browser extension</h2><p>Local vault access, multistep filling, imports, confirmed password updates and verified saves.</p><a class="button" download href="/downloads/clearvault-${version}-extension.zip">Download extension ↓</a></section><section class="guide-card"><h2>MIT source code</h2><p>Browse the public repository, changes and automated builds.</p><div class="download-details">${link(workflowURL, 'View build ↗')}<p>Application, extension, tests, security notes and self-hosting configuration.</p></div>${link(sourceURL, 'View source on GitHub ↗', 'button')}</section></div><article class="prose standalone"><h2>Install in Chrome or Edge</h2><ol><li>Unpack the extension ZIP.</li><li>Open the browser’s extension manager and enable Developer mode.</li><li>Choose “Load unpacked” and select the unpacked directory.</li><li>Visit the intended website, click the extension icon, unlock your vault and choose an entry to fill.</li></ol><p>The extension is not listed in browser stores. It supports verified local saves with backups. Firefox, Passkeys and iframe filling are unsupported. Actual browser installation verification and independent auditing have not been completed.</p><h2>Host it yourself</h2><p>Run <code>npm ci</code> and <code>npm run release</code> from the GitHub repository. Deploy <code>release/web</code> over HTTPS. See the ${link(githubFile('docs/SELF-HOSTING.en.md'), 'self-hosting guide')} for Docker instructions and the ${link(githubFile('docs/DEVELOPER-WORKFLOW.en.md'), 'developer guide')} for the development and release workflow.</p><h2>Trace this deployment</h2><p>Production JavaScript is copied without obfuscation. ${link('/build-info.json', 'Deployment metadata')} identifies the commit and Actions run; ${link('/ASSET-SHA256SUMS.json', 'Asset SHA-256 manifest')} lets you compare downloaded assets with your own build. Cloudflare Pages Analytics is retained on the public site and may inject a script into HTML, changing its hash. Other assets can be compared directly. This improves traceability and does not constitute an independent audit.</p><h2>Verify your downloads</h2><p>${link('/downloads/SHA256SUMS.json', 'Published SHA-256 checksums')} let you compare files; they do not replace signatures or a security audit. Keep independent backups and test with synthetic data first.</p></article>`,
    );
  }
}

// Existing application entry points keep their interaction and their current audience.
for (const [file, zh, en] of [
  ['index.html', '/', '/en/'],
  ['downloads/index.html', '/downloads/', '/en/downloads/'],
]) {
  const url = new URL(file, dist);
  let html = await readFile(url, 'utf8');
  if (file === 'downloads/index.html')
    html = html.replace(/clearvault-[\d.]+-extension\.zip/g, `clearvault-${version}-extension.zip`);
  html = html.replace(/\s*<link[^>]*rel="alternate"[^>]*\/>/g, '');
  html = html.replace('</head>', alternates(zh, en) + '</head>');
  await writeFile(url, await format(html, { parser: 'html', printWidth: 100 }));
}
const urls = [...new Set(routes)].sort();
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((r) => `  <url><loc>${origin}${r}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('sitemap.xml', dist), xml);
const robotsFile = new URL('robots.txt', dist);
let robots = await readFile(robotsFile, 'utf8');
robots = robots.replace(/# BEGIN PUBLIC PAGES[\s\S]*?# END PUBLIC PAGES\n?/g, '');
const rules =
  '# BEGIN PUBLIC PAGES\n' +
  urls
    .filter((r) => !['/', '/downloads/'].includes(r))
    .map((r) => `Allow: ${r}$\nAllow: ${r}index.html$`)
    .join('\n') +
  '\nAllow: /public.css$\n# END PUBLIC PAGES\n';
robots = robots.replace('# Local resources required', rules + '\n# Local resources required');
await writeFile(robotsFile, robots.replace(/\n{3,}/g, '\n\n'));
console.log(`Built ${urls.length} public canonical pages with reciprocal language alternates.`);
