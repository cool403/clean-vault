import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { matchesSite, loginOrigin } from '../extension/matching.js';
import { fillLogin, readNewPassword } from '../extension/fill.js';
import { readFile } from 'node:fs/promises';
test('extension matching rejects suffixes, HTTP, other subdomains and ports', () => {
  assert.ok(
    matchesSite(['https://accounts.example.com/login'], 'https://accounts.example.com/next'),
  );
  for (const target of [
    'https://accounts.example.com.attacker.test',
    'https://example.com',
    'https://accounts.example.com:444',
    'http://accounts.example.com',
  ])
    assert.equal(matchesSite(['https://accounts.example.com'], target), false, target);
  assert.equal(loginOrigin('https://example.com@evil.test'), null);
  assert.equal(loginOrigin('javascript:alert(1)'), null);
  assert.equal(loginOrigin('example.com'), 'https://example.com');
});
function page(body, url = 'https://example.com/login') {
  const dom = new JSDOM(body, { url, runScripts: 'outside-only' });
  const win = dom.window;
  win.HTMLInputElement.prototype.getBoundingClientRect = () => ({ width: 200, height: 32 });
  win.getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1' });
  return { dom, win, run: win.eval('(' + fillLogin.toString() + ')') };
}
test('fills one login with events without submitting; rejects ambiguity and changed origin', () => {
  const { dom, win, run } = page(
    '<form><input autocomplete="username"><input type="password"><button>Login</button></form>',
  );
  let submitted = false,
    inputs = 0;
  win.document.querySelector('form').onsubmit = () => {
    submitted = true;
  };
  win.document.addEventListener('input', () => inputs++);
  assert.equal(run('https://evil.test', 'alice', 'secret'), 'origin');
  assert.equal(win.document.querySelector('[type=password]').value, '');
  assert.equal(run('https://example.com', 'alice', 'secret'), 'filled');
  assert.equal(win.document.querySelector('input').value, 'alice');
  assert.equal(win.document.querySelector('[type=password]').value, 'secret');
  assert.equal(inputs, 2);
  assert.equal(submitted, false);
  const second = win.document.createElement('input');
  second.type = 'password';
  win.document.body.append(second);
  assert.equal(run('https://example.com', 'alice', 'other'), 'ambiguous');
  assert.equal(second.value, '');
  second.remove();
  win.document.querySelector('[type=password]').autocomplete = 'new-password';
  assert.equal(run('https://example.com', 'a', 'x'), 'ambiguous');
  dom.window.close();
});
test('extension has no global host, storage, external message or persistent content permissions', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../extension/manifest.json', import.meta.url)),
  );
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'sidePanel']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
});

test('multistep login fills only a unique username and never submits or fills OTP fields', () => {
  const { dom, win, run } = page(
    '<form><input autocomplete="username"><button>Continue</button></form>',
  );
  assert.equal(run('https://example.com', 'alice', 'secret'), 'username-filled');
  assert.equal(win.document.querySelector('input').value, 'alice');
  win.document.querySelector('input').autocomplete = 'one-time-code';
  assert.equal(run('https://example.com', 'alice', 'secret'), 'ambiguous');
  win.document.body.innerHTML = '<input type="email"><input type="email">';
  assert.equal(run('https://example.com', 'alice', 'secret'), 'ambiguous');
  dom.window.close();
});

test('explicit password capture reads only matching new-password inputs from the expected origin', () => {
  const { dom, win } = page(
    '<form><input type="password" autocomplete="current-password" value="old"><input type="password" autocomplete="new-password" value="new"><input type="password" autocomplete="new-password" value="new"></form>',
  );
  const read = win.eval('(' + readNewPassword.toString() + ')');
  assert.equal(read('https://evil.test').status, 'origin');
  assert.equal(read('https://example.com').password, 'new');
  win.document.querySelectorAll('[autocomplete=new-password]')[1].value = 'different';
  assert.equal(read('https://example.com').status, 'ambiguous');
  win.document.querySelectorAll('[autocomplete=new-password]').forEach((input) => input.remove());
  assert.equal(read('https://example.com').status, 'ambiguous');
  dom.window.close();
});
