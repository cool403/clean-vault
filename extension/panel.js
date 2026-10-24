import { decryptDatabase } from './core/crypto.js';
import { parseVault, cards, fields, fieldType, title } from './core/vault.js';
import { setLanguage } from './core/i18n.js';
import { matchesSite, loginOrigin } from './matching.js';
import { fillLogin } from './fill.js';
const $ = (selector) => document.querySelector(selector);
const strings = {
  'zh-CN': {
    local: '本地解密 · 只读填充',
    title: '你的密码，随手可用。',
    intro: '点击当前网站的扩展图标授权，再选择账号填充。',
    fileLabel: '选择 .db 密码库',
    password: '主密码',
    unlock: '解锁密码库',
    lock: '锁定',
    idle: '无操作自动锁定',
    site: '当前网站',
    refresh: '刷新网站匹配',
    privacy:
      '不上传密码库，不自动提交。密码只在你点击填充时交给当前网站。关闭侧栏后释放密码库；重新打开时需要重新解锁。',
    fill: '填充此账号',
    none: '没有精确匹配的账号。请在密码库中添加此网站的完整 HTTPS 地址。',
    unsupported: '仅支持 HTTPS 网站。新网站请先点击工具栏中的扩展图标授权。',
    choose: '请选择不超过 64 MB 的 .db 文件。',
    error: '操作失败。请检查密码、文件或当前网站的扩展授权。',
    filled: '已填充，请在网站上确认登录。',
    ambiguous: '没有找到唯一的密码输入框，或这是新密码表单，请手动填写。',
    origin: '网站已变化，已停止填充。',
    locked: '密码库已锁定。',
    loading: '正在解锁…',
  },
  en: {
    local: 'Local decryption · Read-only fill',
    title: 'Your passwords, close at hand.',
    intro: 'Click the extension icon on this website to grant access, then choose an account.',
    fileLabel: 'Choose a .db vault',
    password: 'Master password',
    unlock: 'Unlock vault',
    lock: 'Lock',
    idle: 'Lock after inactivity',
    site: 'Current website',
    refresh: 'Refresh matching accounts',
    privacy:
      'No vault uploads or automatic submission. Only the selected login reaches the current website when you click Fill. Closing the panel releases the vault; reopen and unlock to continue.',
    fill: 'Fill this login',
    none: 'No exact match. Add the full HTTPS website address to your vault.',
    unsupported:
      'HTTPS websites only. Click the toolbar extension icon to authorize a new website.',
    choose: 'Choose a .db file up to 64 MB.',
    error:
      'Could not complete the action. Check your password, file or extension permission for this website.',
    filled: 'Filled. Confirm sign-in on the website.',
    ambiguous: 'No unique password input, or this is a new-password form. Fill it manually.',
    origin: 'The website changed. Filling was stopped.',
    locked: 'Vault locked.',
    loading: 'Unlocking…',
  },
};
let language = navigator.language.startsWith('zh') ? 'zh-CN' : 'en',
  doc = null,
  lastActivity = Date.now(),
  epoch = 0,
  busy = false,
  matchEpoch = 0;
const text = (key) => strings[language][key] || key;
function status(key) {
  $('#status').textContent = text(key);
}
function lock() {
  epoch++;
  matchEpoch++;
  doc = null;
  busy = false;
  $('#unlock-button').disabled = false;
  $('#unlocked').hidden = true;
  $('#locked').hidden = false;
  $('#password').value = '';
  $('#file').value = '';
  $('#vault-name').textContent = '';
  $('#origin').textContent = '';
  $('#entries').replaceChildren();
  status('locked');
}
function checkIdle() {
  if (doc && Date.now() - lastActivity >= Number($('#idle').value) * 60000) lock();
}
async function refresh() {
  checkIdle();
  const request = ++matchEpoch,
    version = epoch;
  $('#entries').replaceChildren();
  $('#origin').textContent = '';
  if (!doc) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (request !== matchEpoch || version !== epoch || !doc) return;
  const origin = tab?.url && loginOrigin(tab.url);
  if (!origin) {
    status('unsupported');
    return;
  }
  $('#origin').textContent = origin;
  $('#status').textContent = '';
  const matching = cards(doc).filter(
    (card) =>
      card.getAttribute('deleted') !== 'true' &&
      card.getAttribute('archived') !== 'true' &&
      fields(card).some((f) => fieldType(f) === 'password' && f.textContent) &&
      matchesSite(
        fields(card)
          .filter((f) => fieldType(f) === 'website')
          .map((f) => f.textContent.trim()),
        tab.url,
      ),
  );
  if (!matching.length) status('none');
  for (const card of matching) {
    const item = document.createElement('article');
    item.className = 'entry';
    const heading = document.createElement('strong');
    heading.textContent = title(card);
    const account = document.createElement('small');
    account.textContent =
      fields(card).find((f) => ['login', 'email'].includes(fieldType(f)))?.textContent || '';
    const button = document.createElement('button');
    button.textContent = text('fill');
    button.onclick = async () => {
      checkIdle();
      if (!doc || version !== epoch || request !== matchEpoch) return;
      button.disabled = true;
      try {
        const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (
          !doc ||
          version !== epoch ||
          request !== matchEpoch ||
          current?.id !== tab.id ||
          loginOrigin(current.url || '') !== origin
        ) {
          status('origin');
          return;
        }
        const password = fields(card).find((f) => fieldType(f) === 'password').textContent;
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [0] },
          world: 'ISOLATED',
          func: fillLogin,
          args: [origin, account.textContent, password],
        });
        if (version === epoch) status(result[0]?.result || 'error');
      } catch {
        if (version === epoch) status('error');
      } finally {
        button.disabled = false;
      }
    };
    item.append(heading, account, button);
    $('#entries').append(item);
  }
}
function localize() {
  document.documentElement.lang = language;
  setLanguage(language);
  document.querySelectorAll('[data-i]').forEach((el) => (el.textContent = text(el.dataset.i)));
  if (doc) refresh().catch(() => status('error'));
}
$('#language').value = language;
localize();
$('#language').onchange = () => {
  language = $('#language').value;
  localize();
};
$('#unlock').onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  const file = $('#file').files[0];
  if (!file || file.size > 64 * 1024 * 1024) {
    status('choose');
    return;
  }
  const version = ++epoch;
  busy = true;
  $('#unlock-button').disabled = true;
  status('loading');
  let result;
  try {
    result = await decryptDatabase(new Uint8Array(await file.arrayBuffer()), $('#password').value);
    if (version !== epoch) return;
    doc = parseVault(result.xml);
    $('#password').value = '';
    $('#file').value = '';
    lastActivity = Date.now();
    $('#locked').hidden = true;
    $('#unlocked').hidden = false;
    $('#vault-name').textContent = file.name;
    await refresh();
  } catch {
    if (version === epoch) status('error');
  } finally {
    result?.credential.fill(0);
    if (version === epoch) {
      busy = false;
      $('#unlock-button').disabled = false;
    }
  }
};
$('#lock').onclick = lock;
$('#refresh').onclick = () => refresh().catch(() => status('error'));
for (const name of ['pointerdown', 'keydown'])
  document.addEventListener(
    name,
    () => {
      checkIdle();
      lastActivity = Date.now();
    },
    { passive: true },
  );
setInterval(checkIdle, 1000);
document.addEventListener('visibilitychange', () => {
  checkIdle();
  if (document.hidden) lock();
});
window.addEventListener('pagehide', lock);
chrome.tabs.onActivated.addListener(() => refresh().catch(() => status('error')));
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.status === 'complete' || change.url) refresh().catch(() => status('error'));
});
