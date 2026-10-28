import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { matchesSite, loginOrigin } from '../extension/matching.js';
import { fillLogin, fillOTP, readNewPassword } from '../extension/fill.js';
import { readFile } from 'node:fs/promises';
// 验证站点匹配拒绝伪造域名后缀、HTTP、其他子域名和不同端口。
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
// 验证登录填充触发输入事件但不提交表单，并拒绝歧义表单和来源变化。
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
// 验证扩展未申请全局站点、存储、外部消息或持久内容脚本权限。
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

// 验证分步登录只填充唯一用户名，不自动提交，也不误填验证码字段。
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

// 验证 Google 风格分步登录忽略隐藏诱饵字段，并触发完整的焦点和输入事件。
test('Google-style username and password steps ignore hidden decoys and emit focus/input/change/blur', () => {
  const { dom, win, run } = page(
    '<form><input type="text" name="identifier" id="identifierId" autocomplete="username">' +
      '<input type="password" name="hiddenPassword" tabindex="-1" aria-hidden="true"></form>',
    'https://accounts.google.com/v3/signin/identifier',
  );
  const user = win.document.querySelector('#identifierId');
  const events = [];
  for (const type of ['focus', 'input', 'change', 'blur']) {
    user.addEventListener(type, (event) => events.push([type, event.composed]));
  }
  assert.equal(run('https://accounts.google.com', 'alice@gmail.com', 'secret'), 'username-filled');
  assert.equal(user.value, 'alice@gmail.com');
  assert.equal(win.document.querySelector('[name=hiddenPassword]').value, '');
  assert.deepEqual(
    events.map(([type]) => type),
    ['focus', 'input', 'change', 'blur'],
  );
  assert.ok(events.find(([type, composed]) => type === 'input' && composed));
  win.document.body.innerHTML =
    '<form><input type="email" value="alice@gmail.com" hidden>' +
    '<input type="password" name="Passwd" autocomplete="current-password"></form>';
  assert.equal(run('https://accounts.google.com', 'alice@gmail.com', 'secret'), 'filled');
  assert.equal(win.document.querySelector('[name=Passwd]').value, 'secret');
  dom.window.close();
});

// 验证用户名候选按 autocomplete 标记排序，并识别明确的账号字段名称。
test('username selection ranks autocomplete tokens and supports explicit identifier names', () => {
  const { dom, win, run } = page(
    '<input type="email" name="newsletter"><form><input autocomplete="section-login username"></form>',
  );
  assert.equal(run('https://example.com', 'alice', 'secret'), 'username-filled');
  assert.equal(win.document.querySelector('[name=newsletter]').value, '');
  assert.equal(win.document.querySelector('[autocomplete]').value, 'alice');
  for (const name of ['identifier', 'loginId', 'email', 'username']) {
    win.document.body.innerHTML = `<form><input name="${name}"></form>`;
    assert.equal(run('https://example.com', 'alice', 'secret'), 'username-filled', name);
  }
  win.document.body.innerHTML = '<input name="search"><input name="postal-code">';
  assert.equal(run('https://example.com', 'alice', 'secret'), 'ambiguous');
  win.document.body.innerHTML =
    '<input autocomplete="section-login one-time-code" name="username">';
  assert.equal(run('https://example.com', 'alice', 'secret'), 'ambiguous');
  dom.window.close();
});

// 验证祖先元素隐藏的密码框不会被计入候选，避免产生虚假的多密码框歧义。
test('hidden ancestors do not create multiple password candidates', () => {
  const { dom, win, run } = page('');
  for (const attribute of [
    'hidden',
    'inert',
    'aria-hidden="true"',
    'style="opacity:0"',
    'style="display:none"',
  ]) {
    win.document.body.innerHTML = `<div ${attribute}><input type="password"></div><form><input type="password"></form>`;
    win.getComputedStyle = (element) => ({
      display: element.style.display || 'block',
      visibility: 'visible',
      opacity: element.style.opacity || '1',
    });
    assert.equal(run('https://example.com', 'alice', 'secret'), 'filled', attribute);
    assert.equal(win.document.querySelector('div input').value, '');
    assert.equal(win.document.querySelector('form input').value, 'secret');
  }
  dom.window.close();
});

// 验证注册表单、多个用户名候选、已移除输入框及聚焦时被替换的输入框均被拒绝。
test('rejects registration, ambiguous users, removed inputs and focus-triggered replacements', () => {
  const { dom, win, run } = page('');
  for (const markup of [
    '<form><input autocomplete="username"><input autocomplete="section-signup new-password"></form>',
    '<form><input type="password" autocomplete="section-signup new-password"></form>',
    '<form><input type="password"><input type="password" autocomplete="new-password" hidden></form>',
    '<form><input autocomplete="username"><input autocomplete="username"><input type="password"></form>',
  ]) {
    win.document.body.innerHTML = markup;
    assert.equal(run('https://example.com', 'alice', 'secret'), 'ambiguous', markup);
    assert.ok([...win.document.querySelectorAll('input')].every((input) => !input.value));
  }
  win.document.body.innerHTML =
    '<form><input autocomplete="username"><input type="password"></form>';
  const password = win.document.querySelector('[type=password]');
  win.document.querySelector('[autocomplete]').addEventListener('input', () => password.remove());
  assert.equal(run('https://example.com', 'alice', 'secret'), 'origin');
  assert.equal(password.value, '');
  win.document.body.innerHTML = '<input type="password">';
  const replaced = win.document.querySelector('input');
  replaced.addEventListener('focus', () => replaced.remove());
  assert.equal(run('https://example.com', 'alice', 'secret'), 'ambiguous');
  assert.equal(replaced.value, '');
  dom.window.close();
});

// 验证网站将密码框切换为明文显示后，仍可依据明确的密码标记填充。
test('fills an explicitly marked password after the website reveals it as text', () => {
  const { dom, win, run } = page(
    '<input type="text" autocomplete="section-login current-password">',
  );
  assert.equal(run('https://example.com', 'alice', 'secret'), 'filled');
  assert.equal(win.document.querySelector('input').value, 'secret');
  dom.window.close();
});

// 验证只填充唯一且明确的验证码输入框，不自动提交，也不误匹配普通 code 字段。
test('fills one explicit verification-code input without submitting or matching generic code fields', () => {
  const { dom, win } = page(
    '<form><input name="postal-code" inputmode="numeric"><input autocomplete="one-time-code" inputmode="numeric"><button>Verify</button></form>',
  );
  const run = win.eval('(' + fillOTP.toString() + ')');
  let submitted = false,
    inputs = 0;
  win.document.querySelector('form').onsubmit = () => {
    submitted = true;
  };
  win.document.addEventListener('input', () => inputs++);
  const field = win.document.querySelector('[autocomplete=one-time-code]');
  assert.equal(run('https://evil.test', '123456'), 'origin');
  assert.equal(field.value, '');
  assert.equal(run('https://example.com', '123456'), 'otp-filled');
  assert.equal(field.value, '123456');
  assert.equal(inputs, 1);
  assert.equal(submitted, false);
  win.document.body.innerHTML =
    '<input aria-label="Verification code"><input name="otp"><button>Verify</button>';
  assert.equal(run('https://example.com', '123456'), 'ambiguous');
  win.document.body.innerHTML = '<input name="postal-code" inputmode="numeric">';
  assert.equal(run('https://example.com', '123456'), 'ambiguous');
  dom.window.close();
});

// 验证主动捕获密码时只读取预期来源中匹配的新密码字段。
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
