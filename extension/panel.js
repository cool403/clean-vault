import { decryptDatabase, encryptDatabase } from './core/crypto.js';
import {
  parseVault,
  serializeVault,
  cards,
  fields,
  fieldType,
  title,
  setField,
  touch,
} from './core/vault.js';
import { t, getLocale, initializeLanguage, setLanguage } from './core/i18n.js';
import { fingerprint, readBytes, saveSafely } from './core/safe-save.js';
import {
  createRecentFiles,
  mergeRecentSession,
  allowFile,
  fileError,
} from './core/recent-files.js';
import { recentMarkup, createImportWizard, escapeHTML as escape } from './core/workflow-ui.js';
import { applyImport } from './core/import-data.js';
import { matchesSite, loginOrigin } from './matching.js';
import { fillLogin, readNewPassword } from './fill.js';

const $ = (selector) => document.querySelector(selector);
initializeLanguage();
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
  showAll = false,
  lockPending = false,
  pendingLock = false,
  saveError = false,
  selectingReload = false;
const strings = {
  'zh-CN': {
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
  },
  en: {
    local: 'Local decryption · Fill on request',
    title: 'Your passwords, close at hand.',
    intro: 'Click the extension icon on this website to grant access, then choose an account.',
    fileLabel: 'Choose a .db vault',
    password: 'Master password',
    unlock: 'Unlock vault',
    lock: 'Lock',
    idle: 'Lock after inactivity',
    site: 'Current website',
    refresh: 'Refresh matching accounts',
    fill: 'Fill this login',
    none: 'No exact match. Add the current website address to an existing entry.',
    unsupported:
      'HTTPS websites only. Click the toolbar extension icon to authorize a new website.',
    choose: 'Choose a .db file up to 64 MB.',
    error:
      'Could not complete the action. Check your password, file or extension permission for this website.',
    filled: 'Filled. Confirm sign-in on the website.',
    ambiguous: 'No unique login input, or this is a new-password form. Fill it manually.',
    origin: 'The website changed. Filling was stopped.',
    locked: 'Vault locked.',
    loading: 'Unlocking…',
    privacy:
      'Files are decrypted locally. Only an explicit Fill shares the selected login with the website, without submitting. Save imports and updates; closing the panel loses unsaved changes.',
  },
};
const text = (key) =>
  key === 'username-filled'
    ? t('已填充账号，请在网站继续下一步，再点击填充密码')
    : strings[getLocale()][key] || t(key);
function status(key) {
  statusMessage = key;
  $('#status').textContent = text(key);
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
  status(fileError(error));
}
function setBusy(value) {
  busy = value;
  document
    .querySelectorAll(
      '#save, #save-copy, #reload, #import, #add-site, #lock, #open, #unlock-button',
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
  closeDialog();
  status('locked');
  if (snapshot) {
    lockPending = true;
    setBusy(true);
    try {
      encrypted = await encryptDatabase(snapshot, key, formatVersion);
      status(t('已锁定；未保存更改已加密保留在当前页面内，关闭页面会丢失'));
    } catch (error) {
      doc = previousDoc;
      credential = key;
      $('#unlocked').hidden = false;
      $('#locked').hidden = true;
      $('#vault-name').textContent = name;
      status(t('锁定失败：') + fileError(error));
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
  status(t('原文件已变化，请重新加载后再填充；当前编辑可另存为副本'));
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
  $('#origin').textContent = origin || '';
  status(origin ? '' : 'unsupported');
  const fresh = await freshFile();
  if (request !== matchEpoch || version !== epoch || !doc) return;
  const matches = (card) =>
    matchesSite(
      fields(card)
        .filter((field) => fieldType(field) === 'website')
        .map((field) => field.textContent.trim()),
      tab?.url || '',
    );
  const available = liveCards().filter((card) =>
    fields(card).some((field) => fieldType(field) === 'password' && field.textContent),
  );
  const matching = available.filter((card) => showAll || matches(card));
  if (!matching.length && origin && fresh) status('none');
  for (const card of matching) {
    const item = document.createElement('article');
    item.className = 'entry';
    const label = document.createElement('strong');
    label.textContent = title(card);
    const account = document.createElement('small');
    account.textContent =
      fields(card).find((field) => ['login', 'email'].includes(fieldType(field)))?.textContent ||
      '';
    const button = document.createElement('button');
    button.className = 'button primary';
    button.textContent = text('fill');
    button.disabled = !fresh || !matches(card);
    button.onclick = async () => {
      checkIdle();
      if (!doc || busy || version !== epoch || request !== matchEpoch) return;
      button.disabled = true;
      try {
        if (!(await freshFile())) return;
        const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (
          !doc ||
          busy ||
          version !== epoch ||
          request !== matchEpoch ||
          current?.id !== tab.id ||
          loginOrigin(current.url || '') !== origin
        ) {
          if (version === epoch) status('origin');
          return;
        }
        const password = fields(card).find((field) => fieldType(field) === 'password').textContent;
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [0] },
          world: 'ISOLATED',
          func: fillLogin,
          args: [origin, account.textContent, password],
        });
        if (version === epoch) status(result[0]?.result || 'error');
      } catch (error) {
        if (version === epoch) fail(error);
      } finally {
        button.disabled = !fresh || !matches(card);
      }
    };
    const update = document.createElement('button');
    update.className = 'button secondary';
    update.textContent = t('更新密码');
    update.onclick = () => {
      if (!busy && doc && version === epoch && request === matchEpoch) updatePassword(card, tab);
    };
    item.append(label, account, button, update);
    $('#entries').append(item);
  }
}
function updatePassword(card, tab) {
  const version = epoch;
  const passwords = fields(card).filter((entry) => fieldType(entry) === 'password');
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
      target = await window.showSaveFilePicker({
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
    status(t('保存失败：') + fileError(error));
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
  status(t('已重新加载文件，请输入主密码'));
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
  $('#status').textContent = text(statusMessage);
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
$('#save').onclick = () => save();
$('#save-copy').onclick = () => save(true);
$('#reload').onclick = () => reload().catch(fail);
$('#import').onclick = () => {
  if (doc && !busy) importer.open();
};
$('#add-site').onclick = () => addSite().catch(fail);
$('#show-all').onchange = () => {
  showAll = $('#show-all').checked;
  void refresh().catch(fail);
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
setInterval(checkIdle, 1000);
document.addEventListener('visibilitychange', () => {
  checkIdle();
  if (document.hidden) void lock();
});
window.addEventListener('pagehide', () => {
  void lock();
});
chrome.tabs.onActivated.addListener(() => refresh().catch(fail));
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.status === 'complete' || change.url) refresh().catch(fail);
});
localize();
