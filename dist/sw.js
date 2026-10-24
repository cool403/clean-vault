const CACHE = 'clearvault-shell-v33';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './theme.css',
  './app.js',
  './build-info.js',
  './quick-search.js',
  './support.js',
  './safe-save.js',
  './downloads/',
  './downloads.css',
  './downloads.js',
  './crypto.js',
  './totp.js',
  './vault.js',
  './password-generator.js',
  './i18n.js',
  './locales/en.js',
  './locales/zh-CN.js',
  './vendor/jsQR.js',
  './icon.svg',
  './icon.svg?v=21',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  './manifest.en.webmanifest',
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('clearvault-shell-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
const shellURLs = new Set(ASSETS.map((asset) => new URL(asset, self.registration.scope).href));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(self.registration.scope.replace(url.origin, ''))
  )
    return;
  const navigation = event.request.mode === 'navigate';
  if (!navigation && !shellURLs.has(url.href)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        // Prefer current application files online. Cache only the explicit shell,
        // never documentation navigations or URLs carrying user query parameters.
        const response = await fetch(event.request);
        if (!navigation && response.ok && response.type !== 'opaque') {
          try {
            await cache.put(event.request, response.clone());
          } catch {
            /* Storage eviction must not discard a successful network response. */
          }
        }
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (navigation) {
          const path = new URL(url.href);
          path.search = '';
          path.hash = '';
          if (shellURLs.has(path.href)) {
            const shell = await cache.match(path.href);
            if (shell) return shell;
          }
        }
        return Response.error();
      }
    })(),
  );
});
