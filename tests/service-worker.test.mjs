import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

// 验证在线时使用最新应用文件、离线时仍可启动，且不缓存导航查询参数。
test('shell uses fresh online files, preserves offline launch and does not cache navigation queries', async () => {
  const origin = 'https://clear-vault.app';
  const handlers = {};
  const entries = new Map([
    [origin + '/', new Response('cached home')],
    [origin + '/app.js', new Response('old script')],
  ]);
  const writes = [];
  const key = (request) => (typeof request === 'string' ? request : request.url);
  const cache = {
    match: async (request) => entries.get(key(request))?.clone(),
    put: async (request, response) => {
      writes.push(key(request));
      entries.set(key(request), response);
    },
  };
  let online = true;
  const source = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  new Script(source).runInNewContext({
    URL,
    Response,
    Set,
    self: {
      location: { origin },
      registration: { scope: origin + '/' },
      addEventListener: (name, fn) => {
        handlers[name] = fn;
      },
    },
    caches: { open: async () => cache },
    fetch: async (request) => {
      if (!online) throw new TypeError('Offline');
      return new Response(
        request.url.endsWith('/app.js') ? 'new script with footer links' : 'new page',
      );
    },
  });
  const run = async (path, mode = 'cors', method = 'GET') => {
    let response;
    handlers.fetch({
      request: { url: origin + path, method, mode },
      respondWith: (promise) => {
        response = promise;
      },
    });
    return response ? await response : undefined;
  };
  assert.equal(await (await run('/app.js')).text(), 'new script with footer links');
  assert.equal(
    await (await cache.match(origin + '/app.js')).text(),
    'new script with footer links',
  );
  assert.equal(await (await run('/?lang=zh-CN', 'navigate')).text(), 'new page');
  assert.equal(await (await run('/guides/', 'navigate')).text(), 'new page');
  assert.deepEqual(writes, [origin + '/app.js']);
  online = false;
  assert.equal(await (await run('/?lang=en', 'navigate')).text(), 'cached home');
  assert.equal(await (await run('/app.js')).text(), 'new script with footer links');
  assert.equal((await run('/guides/', 'navigate')).type, 'error');
  assert.equal(await run('/private.db'), undefined);
  assert.equal(await run('/app.js', 'cors', 'POST'), undefined);
  assert.deepEqual(writes, [origin + '/app.js']);
});
