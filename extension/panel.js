import { decryptDatabase, encryptDatabase } from './core/crypto.js';
import { createClipboardGuard } from './core/clipboard.js';
import {
  parseVault,
  serializeVault,
  cards,
  fields,
  fieldType,
  title,
  setField,
  touch,
  newCard,
  hasOTP,
  children,
} from './core/vault.js';
import { t, getLocale, initializeLanguage, setLanguage, supportedLocales } from './core/i18n.js';
import { fingerprint, readBytes, saveSafely } from './core/safe-save.js';
import {
  createRecentFiles,
  mergeRecentSession,
  allowFile,
  fileError,
} from './core/recent-files.js';
import { recentMarkup, createImportWizard, escapeHTML as escape } from './core/workflow-ui.js';
import { applyImport } from './core/import-data.js';
import { generatePassword } from './core/password-generator.js';
import { parseOTP, totp } from './core/totp.js';
import { matchesSite, loginOrigin } from './matching.js';
import { fillLogin, readNewPassword, fillOTP } from './fill.js';

const $ = (selector) => document.querySelector(selector);
const IDLE_KEY = 'clearvault.extension.idle';
const CLIPBOARD_KEY = 'clearvault.clipboardTimeout';
initializeLanguage();
const clipboardGuard = createClipboardGuard();
try {
  const stored = globalThis.localStorage?.getItem(CLIPBOARD_KEY);
  const saved = stored === null || stored === undefined ? NaN : Number(stored);
  if ([0, 15, 30, 60].includes(saved)) clipboardGuard.setSeconds(saved);
} catch {
  /* Extension storage can be unavailable in private contexts. */
}
const recentFiles = createRecentFiles();
let recentEntries = [],
  doc = null,
  credential = null,
  encrypted = null,
  handle = null,
  recentId = null,
  signature = null,
  name = '',
  formatVersion = 2,
  dirty = false,
  lastSaved = null,
  backupDirectory = null,
  lastActivity = Date.now(),
  epoch = 0,
  busy = false,
  matchEpoch = 0,
  toastTimer,
  statusMessage = '',
  statusError = null,
  showAll = false,
  lockPending = false,
  pendingLock = false,
  saveError = false,
  selectingReload = false,
  currentTab = null,
  currentOrigin = '',
  currentFresh = true,
  searchQuery = '';
const strings = {
  local: '本地解密 · 按需填充',
  title: '你的密码，随手可用。',
  intro: '点击当前网站的扩展图标授权，再选择账号填充。',
  fileLabel: '选择 .db 密码库',
  password: '主密码',
  unlock: '解锁密码库',
  lock: '锁定',
  idle: '无操作自动锁定',
  site: '当前网站',
  refresh: '刷新网站匹配',
  fill: '填充此账号',
  none: '没有精确匹配的账号。可为已有条目添加当前网站地址。',
  unsupported: '仅支持 HTTPS 网站。新网站请先点击工具栏中的扩展图标授权。',
  choose: '请选择不超过 64 MB 的 .db 文件。',
  error: '操作失败。请检查密码、文件或当前网站的扩展授权。',
  filled: '已填充，请在网站上确认登录。',
  ambiguous: '没有找到唯一的登录输入框，或这是新密码表单，请手动填写。',
  origin: '网站已变化，已停止填充。',
  locked: '密码库已锁定',
  loading: '正在解锁…',
  privacy:
    '文件只在本地解密。仅在点击填充时向当前网站提供所选账号，不自动提交。导入或更新后请保存；关闭侧栏会丢失未保存修改。',
};
const text = (key) =>
  key === 'username-filled'
    ? t('已填充账号，请在网站继续下一步，再点击填充密码')
    : t(strings[key] || key);
function status(key, error = null) {
  statusMessage = key;
  statusError = error;
  $('#status').textContent = text(key) + (error ? fileError(error) : '');
}
function notify(message) {
  const element = $('#toast');
  element.textContent = message;
  element.setAttribute('popover', 'manual');
  element.hidePopover?.();
  element.showPopover?.();
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.classList.remove('show');
    element.hidePopover?.();
  }, 3200);
}
function fail(error) {
  status('', error);
}
function setBusy(value) {
  busy = value;
  document
    .querySelectorAll(
      '#new-entry, #save, #save-copy, #reload, #import, #recovery-kit, #add-site, #lock, #open, #unlock-button, #entry-search, #clipboard-timeout',
    )
    .forEach((button) => (button.disabled = value));
  $('#file').disabled = value;
  $('#language').disabled = value;
  if (!value && pendingLock) {
    pendingLock = false;
    queueMicrotask(() => void lock());
  }
}
function saveStatus() {
  $('#save-status').textContent = busy
    ? t('正在处理…')
    : saveError
      ? t('保存未完成，当前编辑仍在页面内，请重试或另存副本')
      : dirty
        ? t('有未保存的更改，记得保存到 .db 文件')
        : lastSaved
          ? t('已验证保存于 {time}', { time: new Date(lastSaved).toLocaleTimeString(getLocale()) })
          : t('密码库已解锁 · 修改后可保存为兼容的 .db 文件');
  const save = $('#save');
  if (save) {
    const attention = Boolean(dirty || saveError);
    save.textContent = busy ? t('处理中…') : attention ? t('保存更改') : t('保存数据库');
    save.classList.toggle('primary', attention);
    save.classList.toggle('secondary', !attention);
  }
}
function closeDialog() {
  importer.reset();
  $('#modal').close();
  $('#modal').replaceChildren();
}
function showDialog(content) {
  $('#modal').innerHTML = content;
  if (!$('#modal').open) $('#modal').showModal();
  $('#modal').querySelector('input,select,button')?.focus();
}
const heading = (label, caption = '') =>
  `<div class="modal-heading"><div><h2 id="modal-title">${label}</h2>${caption ? `<p>${caption}</p>` : ''}</div><button class="icon-button" type="button" data-close aria-label="${t('关闭')}">×</button></div>`;
const footer = (label) =>
  `<p class="form-error" role="alert"></p><div class="modal-footer"><button class="button secondary" type="button" data-close>${t('取消')}</button><button class="button primary" type="submit">${label}</button></div>`;
const importer = createImportWizard({
  dialog: $('#modal'),
  getDoc: () => doc,
  show: showDialog,
  close: closeDialog,
  commit: async (plan) => {
    const added = applyImport(doc, plan);
    dirty = true;
    closeDialog();
    saveStatus();
    notify(t('已导入 {count} 个条目，请保存数据库', { count: added.length }));
    await refresh();
  },
});
async function refreshRecent() {
  const version = epoch,
    previousDoc = doc;
  const entries = await recentFiles.list();
  const display = await mergeRecentSession(
    entries,
    !doc && encrypted ? { id: recentId, name, handle, dirty } : null,
  );
  if (version !== epoch || previousDoc !== doc) return;
  recentEntries = entries;
  $('#recent-files').innerHTML = recentMarkup(
    display,
    recentFiles.persistent,
    typeof window.showDirectoryPicker === 'function',
  );
}
async function remember() {
  const fileName = name,
    fileHandle = handle;
  const entry = await recentFiles.remember(fileName, fileHandle);
  if (fileName === name && fileHandle === handle) recentId = entry.id;
  await refreshRecent();
}
async function loadFile(file, fileHandle = null, id = null) {
  if (!file || file.size > 64 * 1024 * 1024) throw new Error(text('choose'));
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 5 || bytes[1] !== 5) throw new Error(t('请选择 SafeInCloud 格式的 .db 文件'));
  const hash = await fingerprint(bytes);
  encrypted = bytes;
  handle = fileHandle;
  recentId = id;
  name = file.name || fileHandle?.name || 'SafeInCloud.db';
  signature = hash;
  dirty = false;
  lastSaved = null;
  saveError = false;
  $('#file').value = '';
  $('#selected-file').textContent = name;
  void refreshRecent();
}
async function chooseFile() {
  if (busy || lockPending) return;
  if (dirty) {
    notify(t('请先保存当前修改，再导入或重新加载文件'));
    return;
  }
  if (window.showOpenFilePicker) {
    setBusy(true);
    try {
      const [selected] = await window.showOpenFilePicker({
        types: [
          { description: t('SafeInCloud 数据库'), accept: { 'application/octet-stream': ['.db'] } },
        ],
        multiple: false,
      });
      await allowFile(selected);
      await loadFile(await selected.getFile(), selected);
      $('#password').focus();
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (error.name !== 'SecurityError') {
        fail(error);
        return;
      }
    } finally {
      setBusy(false);
    }
  }
  $('#file').click();
}
async function lock() {
  if (busy || lockPending) {
    pendingLock = true;
    return;
  }
  epoch++;
  matchEpoch++;
  const previousDoc = doc,
    snapshot = dirty && doc ? serializeVault(doc) : null,
    key = credential;
  doc = null;
  credential = null;
  $('#unlocked').hidden = true;
  $('#locked').hidden = false;
  $('#password').value = '';
  $('#file').value = '';
  $('#vault-name').textContent = '';
  $('#origin').textContent = '';
  $('#entries').replaceChildren();
  currentTab = null;
  currentOrigin = '';
  currentFresh = true;
  searchQuery = '';
  $('#entry-search').value = '';
  chrome.action?.setBadgeText?.({ text: '' });
  closeDialog();
  status('locked');
  if (snapshot) {
    lockPending = true;
    setBusy(true);
    try {
      encrypted = await encryptDatabase(snapshot, key, formatVersion);
      status('已锁定；未保存更改已加密保留在当前页面内，关闭页面会丢失');
    } catch (error) {
      doc = previousDoc;
      credential = key;
      $('#unlocked').hidden = false;
      $('#locked').hidden = true;
      $('#vault-name').textContent = name;
      status('锁定失败：', error);
    } finally {
      lockPending = false;
      setBusy(false);
    }
  }
  if (credential !== key) key?.fill(0);
  void refreshRecent();
}
function checkIdle() {
  if (doc && !busy && Date.now() - lastActivity >= Number($('#idle').value) * 60000) void lock();
}
async function freshFile() {
  if (!handle) return true;
  const version = epoch,
    source = handle,
    expected = signature;
  const current = await fingerprint(await readBytes(source));
  if (version !== epoch || source !== handle) return false;
  if (current === expected) return true;
  status('原文件已变化，请重新加载后再填充；当前编辑可另存为副本');
  return false;
}
function liveCards() {
  return doc
    ? cards(doc).filter(
        (card) =>
          card.getAttribute('deleted') !== 'true' && card.getAttribute('archived') !== 'true',
      )
    : [];
}
function passwordField(card) {
  return fields(card).find((field) => fieldType(field) === 'password');
}
function accountText(card) {
  return (
    fields(card).find((field) => ['login', 'email'].includes(fieldType(field)))?.textContent || ''
  );
}
function websites(card) {
  return fields(card)
    .filter((field) => fieldType(field) === 'website')
    .map((field) => field.textContent.trim());
}
function cardMatches(card) {
  return Boolean(currentOrigin && matchesSite(websites(card), currentOrigin));
}
function availableCards() {
  return liveCards().filter((card) =>
    fields(card).some((field) => fieldType(field) === 'password' || hasOTP(field)),
  );
}
function labelNames() {
  return new Map(
    doc
      ? children(doc.documentElement, 'label').map((label) => [
          label.getAttribute('id'),
          label.getAttribute('name') || '',
        ])
      : [],
  );
}
function searchableText(card, labels) {
  return [
    title(card),
    ...fields(card)
      .filter(
        (field) =>
          !['password', 'secret', 'pin', 'binary', 'one_time_password'].includes(fieldType(field)),
      )
      .map((field) => field.textContent),
    ...children(card, 'label_id')
      .map((label) => labels.get(label.textContent))
      .filter(Boolean),
  ]
    .join(' ')
    .toLocaleLowerCase();
}
function visibleCards() {
  const query = searchQuery.trim().toLocaleLowerCase();
  const labels = labelNames();
  let matching = availableCards();
  if (query) {
    matching = matching.filter((card) => searchableText(card, labels).includes(query));
    matching.sort((a, b) => {
      const left = title(a).toLocaleLowerCase(),
        right = title(b).toLocaleLowerCase();
      return (
        Number(right.startsWith(query)) - Number(left.startsWith(query)) ||
        left.localeCompare(right)
      );
    });
  } else if (!showAll) {
    matching = matching.filter(cardMatches);
  }
  return { query, matching };
}
async function copyText(value) {
  if (!value) return;
  try {
    await clipboardGuard.write(value);
    notify(
      clipboardGuard.seconds
        ? t('已复制到剪贴板，{seconds} 秒后自动清除', { seconds: clipboardGuard.seconds })
        : t('已复制到剪贴板'),
    );
  } catch {
    notify(t('复制失败，请检查浏览器剪贴板权限'));
  }
}
function downloadRecoveryKit() {
  const now = new Date();
  const text = [
    'ClearVault ' + t('恢复工具包'),
    t('生成时间') + ': ' + now.toLocaleString(getLocale()),
    t('密码库文件') + ': ' + (name || t('尚未保存的密码库')),
    '',
    t('主密码无法由 ClearVault 找回。请在此处手写主密码，并与密码库备份分开保管。'),
    t('主密码') + ': ______________________________',
    t('备份位置') + ': ______________________________',
    '',
    t('恢复步骤') + ': ' + t('打开 ClearVault，选择“打开 .db 密码库”，再输入主密码解锁。'),
    '',
    t('本工具包不包含密码、TOTP 密钥或密码库内容。请妥善保管。'),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `clearvault-recovery-kit-${now.toISOString().slice(0, 10)}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  notify(t('恢复工具包已下载，请打印并妥善保管'));
}
async function otpCode(card, index) {
  const field = fields(card)[index];
  if (!field) return '';
  let config;
  try {
    config = parseOTP(field.textContent);
    return await totp(config, Date.now());
  } catch {
    return '';
  } finally {
    config?.secret.fill(0);
  }
}
async function refreshCodes() {
  if (!doc) return;
  const version = epoch;
  for (const code of document.querySelectorAll('[data-otp-card]')) {
    if (version !== epoch) return;
    const card = liveCards().find((item) => item.getAttribute('id') === code.dataset.otpCard);
    const field = card && fields(card)[Number(code.dataset.otpIndex)];
    if (!field) continue;
    let config;
    try {
      config = parseOTP(field.textContent);
      const now = Date.now();
      const remaining = config.period - ((now / 1000) % config.period);
      const value = await totp(config, now);
      if (version !== epoch || !code.isConnected) continue;
      const middle = Math.ceil(value.length / 2);
      code.textContent = value.slice(0, middle) + ' ' + value.slice(middle);
      const countdown = code.closest('.entry-otp')?.querySelector('[data-otp-countdown]');
      if (countdown) countdown.textContent = Math.ceil(remaining) + 's';
      code.classList.toggle('expiring', remaining < 6);
    } catch {
      if (version === epoch && code.isConnected) {
        code.textContent = t('密钥无效');
        const countdown = code.closest('.entry-otp')?.querySelector('[data-otp-countdown]');
        if (countdown) countdown.hidden = true;
      }
    } finally {
      config?.secret.fill(0);
    }
  }
}
function updateBadge() {
  const count = currentOrigin ? availableCards().filter(cardMatches).length : 0;
  chrome.action?.setBadgeText?.({ text: count ? String(count) : '' });
}
function emptyState(query) {
  const empty = document.createElement('div');
  empty.className = 'entry-empty';
  const heading = document.createElement('strong');
  heading.textContent = t('没有找到相关条目');
  const caption = document.createElement('small');
  caption.textContent = query ? t('试试其他关键词') : text(currentOrigin ? 'none' : 'unsupported');
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'button secondary';
  create.textContent = currentOrigin ? t('为此网站新建条目') : t('新建条目');
  create.onclick = () => newEntry();
  empty.append(heading, caption, create);
  return empty;
}
function entryElement(card, version, request, tab, fresh) {
  const item = document.createElement('article');
  item.className = 'entry';
  item.dataset.entryId = card.getAttribute('id');
  const head = document.createElement('div');
  head.className = 'entry-head';
  const label = document.createElement('strong');
  label.textContent = title(card);
  const rawAccount = accountText(card);
  const account = document.createElement('small');
  account.textContent = rawAccount || t('暂无账号');
  head.append(label, account);
  item.append(head);
  const matched = cardMatches(card);
  const password = passwordField(card);
  for (const field of fields(card).filter(hasOTP)) {
    const index = fields(card).indexOf(field);
    const row = document.createElement('div');
    row.className = 'entry-otp';
    const meta = document.createElement('div');
    meta.className = 'otp-main';
    const fieldLabel = document.createElement('small');
    fieldLabel.textContent = field.getAttribute('name') || t('一次性验证码');
    const code = document.createElement('span');
    code.className = 'otp-code';
    code.dataset.otpCard = card.getAttribute('id');
    code.dataset.otpIndex = String(index);
    code.textContent = '••• •••';
    const countdown = document.createElement('span');
    countdown.className = 'otp-countdown';
    countdown.dataset.otpCountdown = '';
    countdown.textContent = '30s';
    meta.append(fieldLabel, code, countdown);
    row.append(meta);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'text-button';
    copy.dataset.otpCopy = '';
    copy.textContent = t('复制');
    copy.title = t('复制动态验证码');
    copy.disabled = !fresh;
    copy.onclick = async () => {
      if (!doc || busy || version !== epoch || request !== matchEpoch) return;
      await copyText(await otpCode(card, index));
    };
    row.append(copy);
    if (matched) {
      const fill = document.createElement('button');
      fill.type = 'button';
      fill.className = 'text-button';
      fill.dataset.otpFill = '';
      fill.textContent = t('填入验证码');
      fill.disabled = !fresh;
      fill.onclick = () =>
        fillOtp(card, tab, index, version, request).catch((error) => {
          if (version === epoch) fail(error);
        });
      row.append(fill);
    }
    item.append(row);
  }
  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  const fill = document.createElement('button');
  fill.type = 'button';
  fill.className = 'button primary';
  fill.textContent = text('fill');
  fill.disabled = !fresh || !matched || !password?.textContent;
  fill.onclick = async () => {
    checkIdle();
    if (!doc || busy || version !== epoch || request !== matchEpoch) return;
    fill.disabled = true;
    try {
      if (!(await freshFile())) return;
      const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (
        !doc ||
        busy ||
        version !== epoch ||
        request !== matchEpoch ||
        current?.id !== tab.id ||
        loginOrigin(current.url || '') !== currentOrigin
      ) {
        if (version === epoch) status('origin');
        return;
      }
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [0] },
        world: 'ISOLATED',
        func: fillLogin,
        args: [currentOrigin, rawAccount, password.textContent],
      });
      if (version === epoch) status(result[0]?.result || 'error');
    } catch (error) {
      if (version === epoch) fail(error);
    } finally {
      fill.disabled = !fresh || !matched || !password?.textContent;
    }
  };
  if (password?.textContent) actions.append(fill);
  if (rawAccount) {
    const copyUser = document.createElement('button');
    copyUser.type = 'button';
    copyUser.className = 'text-button';
    copyUser.dataset.copyUsername = '';
    copyUser.textContent = t('复制账号');
    copyUser.disabled = !fresh;
    copyUser.onclick = () => {
      if (fresh) void copyText(rawAccount);
    };
    actions.append(copyUser);
  }
  if (password?.textContent) {
    const copyPass = document.createElement('button');
    copyPass.type = 'button';
    copyPass.className = 'text-button';
    copyPass.dataset.copyPassword = '';
    copyPass.textContent = t('复制密码');
    copyPass.disabled = !fresh;
    copyPass.onclick = () => {
      if (fresh) void copyText(password.textContent);
    };
    actions.append(copyPass);
  }
  if (password) {
    const update = document.createElement('button');
    update.type = 'button';
    update.className = 'button secondary';
    update.textContent = t('更新密码');
    update.onclick = () => {
      if (!busy && doc && version === epoch && request === matchEpoch) updatePassword(card, tab);
    };
    actions.append(update);
  }
  if (actions.childElementCount) item.append(actions);
  return item;
}
function renderEntries() {
  if (!doc) return;
  const { query, matching } = visibleCards();
  const entries = $('#entries');
  entries.replaceChildren();
  if (!matching.length) {
    entries.append(emptyState(query));
    if (currentFresh && !query && currentOrigin) status('none');
    else if (currentFresh && query && statusMessage === 'none') status('');
  } else {
    if (currentFresh && currentOrigin && (query || statusMessage === 'none')) status('');
    for (const card of matching)
      entries.append(entryElement(card, epoch, matchEpoch, currentTab, currentFresh));
  }
  updateBadge();
  void refreshCodes();
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
  currentTab = tab || null;
  const origin = tab?.url && loginOrigin(tab.url);
  currentOrigin = origin || '';
  $('#origin').textContent = currentOrigin;
  status(origin ? '' : 'unsupported');
  const fresh = await freshFile();
  if (request !== matchEpoch || version !== epoch || !doc) return;
  currentFresh = fresh;
  renderEntries();
}
async function fillOtp(card, tab, index, version, request) {
  if (!doc || busy || !tab || version !== epoch || request !== matchEpoch) return;
  const code = await otpCode(card, index);
  if (!code) {
    notify(t('密钥无效'));
    return;
  }
  try {
    if (!(await freshFile())) return;
    const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (
      !doc ||
      busy ||
      version !== epoch ||
      request !== matchEpoch ||
      current?.id !== tab.id ||
      loginOrigin(current.url || '') !== currentOrigin
    ) {
      if (version === epoch) status('origin');
      return;
    }
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      world: 'ISOLATED',
      func: fillOTP,
      args: [currentOrigin, code],
    });
    const outcome = result[0]?.result;
    if (version !== epoch) return;
    if (outcome === 'otp-filled') notify(t('已填充，请在网站上确认登录。'));
    else if (outcome === 'origin') status('origin');
    else notify(t('无法识别唯一的验证码输入框，请手动填写'));
  } catch (error) {
    if (version === epoch) fail(error);
  }
}
function newEntry() {
  if (!doc || busy) return;
  const suggested =
    currentTab?.title?.trim() || (currentOrigin ? new URL(currentOrigin).hostname : '');
  showDialog(
    `<form id="new-entry-form">${heading(t('新建条目'), t('把重要的信息，妥善收在一起。'))}<label class="form-label">${t('条目名称')}<input name="title" maxlength="200" required value="${escape(suggested)}"></label><label class="form-label">${t('账号')}<input name="username" autocomplete="off"></label><label class="form-label">${t('密码')}<div class="new-password-row"><input name="password" type="password" autocomplete="new-password"><button type="button" class="text-button" id="new-password-generate">${t('生成密码')}</button><button type="button" class="text-button" id="new-password-toggle" aria-label="${t('显示或隐藏内容')}">${t('显示')}</button></div></label><label class="form-label">${t('网站')}<input name="website" type="text" inputmode="url" value="${escape(currentOrigin)}"></label><p class="form-error" role="alert"></p><div class="modal-footer"><button type="button" class="button secondary" data-close>${t('取消')}</button><button type="submit" class="button primary">${t('保存条目')}</button></div></form>`,
  );
  const form = $('#new-entry-form');
  $('#new-password-generate').onclick = () => {
    form.elements.password.value = generatePassword();
    form.elements.password.focus();
  };
  $('#new-password-toggle').onclick = () => {
    const showing = form.elements.password.type === 'text';
    form.elements.password.type = showing ? 'password' : 'text';
    $('#new-password-toggle').textContent = t(showing ? '显示' : '隐藏');
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!doc || busy) return;
    const card = newCard(doc);
    card.setAttribute('title', form.elements.title.value.trim() || t('未命名条目'));
    setField(card, t('账号'), form.elements.username.value, 'login');
    setField(card, t('密码'), form.elements.password.value, 'password');
    setField(card, t('网站'), form.elements.website.value.trim(), 'website');
    doc.documentElement.append(card);
    dirty = true;
    const matchesCurrent =
      currentOrigin && matchesSite([form.elements.website.value.trim()], currentOrigin);
    if (!matchesCurrent) {
      showAll = true;
      $('#show-all').checked = true;
    }
    searchQuery = '';
    $('#entry-search').value = '';
    closeDialog();
    saveStatus();
    void refresh();
    notify(t('已添加条目，请保存数据库'));
  };
  form.querySelector('[name=title]')?.select();
}
function updatePassword(card, tab) {
  const version = epoch;
  const passwords = fields(card).filter((entry) => fieldType(entry) === 'password');
  if (!passwords.length) return;
  const origin = loginOrigin(tab?.url || '');
  const matched =
    origin &&
    matchesSite(
      fields(card)
        .filter((entry) => fieldType(entry) === 'website')
        .map((entry) => entry.textContent),
      origin,
    );
  showDialog(
    `<form id="update-password">${heading(t('更新密码'), escape(title(card)))}<p class="form-help">${t('确认后更新此条目，再保存到加密文件。')}</p>${passwords.length > 1 ? `<label class="form-label">${t('字段名称')}<select name="field">${passwords.map((field, index) => `<option value="${index}">${escape(field.getAttribute('name') || t('密码'))} (${index + 1})</option>`).join('')}</select></label>` : ''}${matched ? `<button type="button" class="button secondary" id="capture-password">${t('从当前网页读取新密码')}</button><p class="form-help">${t('仅在点击后读取当前网站的新密码输入框；确认后才更新条目。')}</p>` : ''}<label class="form-label">${t('输入新密码')}<input name="password" type="password" autocomplete="new-password" required></label><label class="form-label">${t('确认新密码')}<input name="confirm" type="password" autocomplete="new-password" required></label>${footer(t('更新密码'))}</form>`,
  );
  const form = $('#update-password');
  if ($('#capture-password'))
    $('#capture-password').onclick = async () => {
      const button = $('#capture-password');
      button.disabled = true;
      try {
        const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (
          !doc ||
          busy ||
          version !== epoch ||
          !form.isConnected ||
          current?.id !== tab.id ||
          loginOrigin(current.url || '') !== origin
        )
          throw new Error(text('origin'));
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [0] },
          world: 'ISOLATED',
          func: readNewPassword,
          args: [origin],
        });
        if (!doc || version !== epoch || !form.isConnected) return;
        if (result[0]?.result?.status !== 'captured')
          throw new Error(t('无法识别唯一的新密码，请手动输入'));
        form.elements.password.value = result[0].result.password;
        form.elements.confirm.value = result[0].result.password;
        notify(t('新密码已读取，请确认更新'));
      } catch (error) {
        if (form.isConnected) form.querySelector('.form-error').textContent = fileError(error);
      } finally {
        button.disabled = false;
      }
    };
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!doc || busy) return;
    if (form.elements.password.value !== form.elements.confirm.value) {
      form.querySelector('.form-error').textContent = t('两次输入的密码不一致');
      return;
    }
    if (!form.elements.password.value) return;
    const field = passwords[Number(form.elements.field?.value || 0)];
    field.textContent = form.elements.password.value;
    field.removeAttribute('hash');
    field.removeAttribute('score');
    touch(card);
    dirty = true;
    closeDialog();
    saveStatus();
    notify(t('密码已更新，请保存数据库'));
  };
}
async function addSite() {
  const version = epoch,
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!doc || busy || version !== epoch) return;
  const origin = loginOrigin(tab?.url || '');
  if (!origin) {
    status('unsupported');
    return;
  }
  const available = liveCards().filter((card) =>
    fields(card).some((field) => fieldType(field) === 'password' && field.textContent),
  );
  showDialog(
    `<form id="add-site-form">${heading(t('添加网站地址'))}<p class="form-help">${t('将当前 HTTPS 网站添加到此条目，保存后即可在这里匹配。')}</p><p class="site">${escape(origin)}</p><label class="form-label">${t('选择条目')}<select name="entry" required>${available.map((card) => `<option value="${escape(card.getAttribute('id'))}">${escape(title(card))} · ${escape(fields(card).find((field) => ['login', 'email'].includes(fieldType(field)))?.textContent || '')}</option>`).join('')}</select></label>${footer(t('添加网站地址'))}</form>`,
  );
  const form = $('#add-site-form');
  form.onsubmit = async (event) => {
    event.preventDefault();
    const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (
      !doc ||
      version !== epoch ||
      busy ||
      current?.id !== tab.id ||
      loginOrigin(current.url || '') !== origin
    ) {
      if (form.isConnected) form.querySelector('.form-error').textContent = text('origin');
      return;
    }
    const card = available.find((entry) => entry.getAttribute('id') === form.elements.entry.value);
    if (!card) return;
    if (
      !matchesSite(
        fields(card)
          .filter((field) => fieldType(field) === 'website')
          .map((field) => field.textContent),
        origin,
      )
    ) {
      setField(card, t('网站'), origin, 'website');
      touch(card);
      dirty = true;
    }
    closeDialog();
    saveStatus();
    await refresh();
    notify(t('已添加网站地址，请保存数据库'));
  };
}
async function save(asCopy = false) {
  if (!doc || busy) return;
  setBusy(true);
  saveStatus();
  try {
    let target = asCopy ? null : handle;
    if (!target && window.showSaveFilePicker)
      [target] = await window.showSaveFilePicker({
        suggestedName: name || 'SafeInCloud.db',
        types: [
          { description: t('SafeInCloud 数据库'), accept: { 'application/octet-stream': ['.db'] } },
        ],
      });
    if (target) {
      await allowFile(target, 'readwrite');
      if ((await readBytes(target)).length && !backupDirectory) {
        if (!window.showDirectoryPicker)
          throw new Error(t('覆盖前请先在设置中选择加密备份目录，或另存到一个新文件'));
        notify(t('首次写回需要选择加密备份目录，之后保存会自动备份'));
        const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
        if (
          await directory
            .getFileHandle(target.name)
            .then((file) => file.isSameEntry(target))
            .catch(() => false)
        )
          throw new Error(t('请选择与原密码库不同的备份目录'));
        backupDirectory = directory;
      }
    }
    const bytes = await encryptDatabase(serializeVault(doc), credential, formatVersion);
    if (target) {
      const same = handle && (target === handle || (await target.isSameEntry?.(handle)));
      const result = await saveSafely({
        handle: target,
        bytes,
        expectedHash: same ? signature : null,
        directory: backupDirectory,
        name: target.name,
      });
      if (!same) recentId = null;
      handle = target;
      name = target.name;
      signature = result.hash;
      dirty = false;
      lastSaved = Date.now();
      notify(
        t(result.retentionWarning ? '保存已验证，但旧备份清理失败' : '已加密保存并验证数据库文件'),
      );
      void remember();
    } else {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'SafeInCloud.db';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify(t('已发起加密导出，请确认下载成功；原文件未被写回'));
    }
    encrypted = bytes;
    saveError = false;
    $('#vault-name').textContent = name;
  } catch (error) {
    saveError = true;
    status('保存失败：', error);
  } finally {
    setBusy(false);
    saveStatus();
  }
}
async function reload() {
  if (busy || !doc) return;
  if (dirty) {
    showDialog(
      `<form id="reload-confirm">${heading(t('重新加载文件'))}<p>${t('重新加载会放弃当前未保存修改，是否继续？')}</p>${footer(t('确认重新加载'))}</form>`,
    );
    $('#reload-confirm').onsubmit = (event) => {
      event.preventDefault();
      closeDialog();
      void performReload().catch(fail);
    };
  } else await performReload();
}
async function performReload() {
  if (busy) return;
  setBusy(true);
  try {
    let selected = handle;
    if (!selected) {
      if (!window.showOpenFilePicker) {
        selectingReload = true;
        $('#file').value = '';
        setBusy(false);
        $('#file').click();
        return;
      }
      [selected] = await window.showOpenFilePicker({
        types: [
          { description: t('SafeInCloud 数据库'), accept: { 'application/octet-stream': ['.db'] } },
        ],
        multiple: false,
      });
    }
    await allowFile(selected);
    await replaceFromFile(await selected.getFile(), selected);
  } finally {
    setBusy(false);
  }
}
async function replaceFromFile(file, selected = null) {
  if (file.size > 64 * 1024 * 1024) throw new Error(text('choose'));
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 5 || bytes[1] !== 5) throw new Error(t('请选择 SafeInCloud 格式的 .db 文件'));
  const hash = await fingerprint(bytes);
  dirty = false;
  setBusy(false);
  await lock();
  encrypted = bytes;
  signature = hash;
  handle = selected;
  recentId = null;
  name = file.name || selected?.name || 'SafeInCloud.db';
  lastSaved = null;
  saveError = false;
  $('#selected-file').textContent = name;
  void refreshRecent();
  status('已重新加载文件，请输入主密码');
}
function localize() {
  document.documentElement.lang = getLocale();
  document
    .querySelectorAll('[data-i]')
    .forEach((element) => (element.textContent = text(element.dataset.i)));
  document
    .querySelectorAll('[data-t]')
    .forEach((element) => (element.textContent = t(element.dataset.t)));
  $('#language').value = getLocale();
  $('#entry-search').placeholder = t('搜索条目、账号或标签…');
  $('#idle')
    .querySelectorAll('option')
    .forEach((option) => {
      option.textContent = option.value + ' ' + t('分钟');
    });
  $('#clipboard-timeout')
    .querySelectorAll('option')
    .forEach((option) => {
      const seconds = Number(option.value);
      option.textContent = seconds ? t('{seconds} 秒', { seconds }) : t('关闭');
    });
  $('#status').textContent = text(statusMessage) + (statusError ? fileError(statusError) : '');
  $('#language').setAttribute('aria-label', t('选择语言'));
  if (doc) {
    saveStatus();
    void refresh().catch(fail);
  }
  void refreshRecent();
}
$('#language').onchange = () => {
  closeDialog();
  setLanguage($('#language').value);
  localize();
};
$('#open').onclick = () => chooseFile().catch(fail);
$('#file').addEventListener('cancel', () => {
  selectingReload = false;
});
$('#file').onchange = async () => {
  if (busy) return;
  const reloading = selectingReload;
  selectingReload = false;
  if (dirty && !reloading) {
    $('#file').value = '';
    notify(t('请先保存当前修改，再导入或重新加载文件'));
    return;
  }
  setBusy(true);
  try {
    const file = $('#file').files[0];
    if (file) {
      if (reloading) await replaceFromFile(file);
      else await loadFile(file);
    }
  } catch (error) {
    fail(error);
  } finally {
    setBusy(false);
  }
};
$('#unlock').onsubmit = async (event) => {
  event.preventDefault();
  if (busy || lockPending) return;
  const version = ++epoch;
  setBusy(true);
  status('loading');
  let result;
  try {
    const selected = $('#file').files[0];
    if (selected && !dirty) await loadFile(selected);
    if (!encrypted) throw new Error(text('choose'));
    if (handle && !dirty) {
      await allowFile(handle);
      await loadFile(await handle.getFile(), handle);
    }
    result = await decryptDatabase(encrypted, $('#password').value);
    if (version !== epoch) return;
    doc = parseVault(result.xml);
    credential = result.credential;
    formatVersion = result.version;
    result = null;
    $('#password').value = '';
    $('#file').value = '';
    lastActivity = Date.now();
    $('#locked').hidden = true;
    $('#unlocked').hidden = false;
    $('#vault-name').textContent = name;
    saveStatus();
    void remember();
    await refresh();
  } catch (error) {
    if (version === epoch) fail(error);
  } finally {
    result?.credential.fill(0);
    if (version === epoch) {
      setBusy(false);
      if (doc) saveStatus();
    }
  }
};
$('#lock').onclick = () => lock();
$('#refresh').onclick = () => refresh().catch(fail);
$('#new-entry').onclick = () => newEntry();
$('#recovery-kit').onclick = () => downloadRecoveryKit();
$('#save').onclick = () => save();
$('#save-copy').onclick = () => save(true);
$('#reload').onclick = () => reload().catch(fail);
$('#import').onclick = () => {
  if (doc && !busy) importer.open();
};
$('#add-site').onclick = () => addSite().catch(fail);
$('#entry-search').addEventListener('input', () => {
  searchQuery = $('#entry-search').value;
  renderEntries();
});
$('#show-all').onchange = () => {
  showAll = $('#show-all').checked;
  renderEntries();
};
document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-close]')) closeDialog();
  const button = event.target.closest('[data-action]');
  if (!button || busy || lockPending) return;
  try {
    if (button.dataset.action === 'recent-remove') await recentFiles.remove(button.dataset.id);
    if (button.dataset.action === 'recent-clear') {
      await recentFiles.clear();
      notify(t('最近文件记录已清空'));
    }
    if (button.dataset.action === 'recent-session' && encrypted && !doc) $('#password').focus();
    if (button.dataset.action === 'recent-directory') {
      const entry = recentEntries.find((item) => item.id === button.dataset.id);
      if (entry?.handle && window.showDirectoryPicker) {
        setBusy(true);
        const directory = await window.showDirectoryPicker({
          mode: 'read',
          id: 'clearvault-recent-directory',
        });
        await recentFiles.setDirectory(entry.id, directory);
        notify(t('已确认密码库所在目录'));
      }
    }
    if (button.dataset.action === 'recent-open') {
      if (dirty) {
        notify(t('请先保存当前修改，再导入或重新加载文件'));
        return;
      }
      const entry = recentEntries.find((item) => item.id === button.dataset.id);
      if (!entry?.handle) {
        await chooseFile();
        return;
      }
      setBusy(true);
      await allowFile(entry.handle);
      await loadFile(await entry.handle.getFile(), entry.handle, entry.id);
      $('#password').focus();
    }
    await refreshRecent();
  } catch (error) {
    if (error.name !== 'AbortError') fail(error);
  } finally {
    setBusy(false);
  }
});
$('#modal').addEventListener('cancel', (event) => {
  if (event.target !== $('#modal')) return;
  event.preventDefault();
  if (!busy) closeDialog();
});
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
for (const name of ['pointerdown', 'keydown'])
  document.addEventListener(
    name,
    () => {
      checkIdle();
      lastActivity = Date.now();
    },
    { passive: true },
  );
setInterval(() => {
  checkIdle();
  if (!document.hidden) void refreshCodes();
}, 500);
document.addEventListener('visibilitychange', () => {
  checkIdle();
  if (!document.hidden) void refreshCodes();
});
window.addEventListener('pagehide', () => {
  void lock();
});
chrome.tabs.onActivated.addListener(() => refresh().catch(fail));
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.status === 'complete' || change.url) refresh().catch(fail);
});
localize();
chrome.action?.setBadgeBackgroundColor?.({ color: '#315ca0' });
$('#language').innerHTML = supportedLocales
  .map((locale) => `<option value="${locale.code}">${locale.name}</option>`)
  .join('');
try {
  const saved = Number(localStorage.getItem(IDLE_KEY));
  if ([1, 5, 15, 30].includes(saved)) $('#idle').value = String(saved);
} catch {
  /* Keep the default when extension storage is unavailable. */
}
$('#idle').onchange = () => {
  try {
    localStorage.setItem(IDLE_KEY, $('#idle').value);
  } catch {
    /* The selection still applies to this side panel session. */
  }
};
try {
  const stored = localStorage.getItem(CLIPBOARD_KEY);
  const saved = stored === null || stored === undefined ? NaN : Number(stored);
  if ([0, 15, 30, 60].includes(saved)) $('#clipboard-timeout').value = String(saved);
} catch {
  /* Keep the default when extension storage is unavailable. */
}
$('#clipboard-timeout').onchange = () => {
  const seconds = Number($('#clipboard-timeout').value);
  clipboardGuard.setSeconds(seconds);
  try {
    localStorage.setItem(CLIPBOARD_KEY, String(seconds));
  } catch {
    /* The selection still applies to this side panel session. */
  }
};
