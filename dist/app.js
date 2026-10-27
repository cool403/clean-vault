import { createQuickSearch, modifier } from './quick-search.js';
import { createClipboardGuard } from './clipboard.js';
import { passwordStrength } from './password-strength.js';
import { pinyinSearch } from './pinyin.js';
import { createSnapshotStore, snapshotsSupported } from './snapshots.js';
import { mergeVaults } from './merge.js';
import { t, html, getLocale, initializeLanguage, setLanguage, supportedLocales } from './i18n.js';
import { buildInfo } from './build-info.js';
import { mountSupportLinks } from './support.js';
import { createRecentFiles, mergeRecentSession, allowFile, fileError } from './recent-files.js';
import { recentMarkup, createImportWizard } from './workflow-ui.js';
import { applyImport } from './import-data.js';
import {
  decryptDatabase,
  decryptDatabaseWithCredential,
  encryptDatabase,
  passwordBytes,
  encode,
} from './crypto.js';
import { parseOTP, totp } from './totp.js';
import { generatePassword, defaultRules } from './password-generator.js';
import { fingerprint, saveSafely, listBackups, readBytes } from './safe-save.js';
import {
  parseVault,
  serializeVault,
  children,
  cards,
  fields,
  fieldType,
  isOTP,
  hasOTP,
  title,
  touch,
  newCard,
  setField,
  demoVault,
} from './vault.js';

initializeLanguage();
const $ = (selector) => document.querySelector(selector);
const app = $('#app'),
  modal = $('#modal');
const recentFiles = createRecentFiles();
let recentEntries = [];
const state = {
  doc: null,
  credential: null,
  version: 2,
  encrypted: null,
  name: '',
  handle: null,
  recentId: null,
  signature: null,
  dirty: false,
  demo: false,
  externalChange: false,
  selected: null,
  mobileDetail: false,
  section: 'all',
  search: '',
  securityFilter: null,
  baseXml: null,
  listLimit: 200,
  busy: false,
  generation: 0,
  lastActivity: Date.now(),
  idleMinutes: 5,
  install: null,
};
let editCard = null,
  editFields = [],
  toastTimer,
  searchTimer,
  batchMode = false,
  batchSelection = new Set(),
  pendingMerge = null,
  otpGeneration = 0;
let backupDirectory = null,
  backupRetention = 10,
  restorePreview = null;
state.lastSaved = null;
state.lastExported = null;
state.saveError = false;
const CLIPBOARD_KEY = 'clearvault.clipboardTimeout';
const clipboardGuard = createClipboardGuard();
try {
  const stored = globalThis.localStorage?.getItem(CLIPBOARD_KEY);
  const saved = stored === null || stored === undefined ? NaN : Number(stored);
  if ([0, 15, 30, 60].includes(saved)) clipboardGuard.setSeconds(saved);
} catch {
  /* Storage can be unavailable in private contexts. */
}
const clipboardNotice = () =>
  clipboardGuard.seconds
    ? t('已复制到剪贴板，{seconds} 秒后自动清除', { seconds: clipboardGuard.seconds })
    : t('已复制到剪贴板');
const RECENT_KEY = 'clearvault.recentEntries';
function allRecents() {
  try {
    const data = JSON.parse(globalThis.localStorage?.getItem(RECENT_KEY) || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}
function recentForVault() {
  const map = allRecents()[state.name || 'unnamed'];
  return map && typeof map === 'object' ? map : {};
}
function recordRecent(id) {
  if (!id) return;
  try {
    const data = allRecents();
    const key = state.name || 'unnamed';
    const map = { ...(data[key] || {}), [id]: Date.now() };
    data[key] = Object.fromEntries(
      Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50),
    );
    const keys = Object.keys(data);
    for (const old of keys.slice(0, Math.max(0, keys.length - 20))) delete data[old];
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(data));
  } catch {
    /* Recents only affect ordering; storage failures are harmless. */
  }
}
function clearRecentEntries() {
  try {
    const data = allRecents();
    delete data[state.name || 'unnamed'];
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(data));
  } catch {
    /* Ignore unavailable storage. */
  }
  toast(t('最近使用记录已清除'));
}
const channel =
  globalThis.window === globalThis && globalThis.BroadcastChannel
    ? new BroadcastChannel('clearvault-tabs')
    : null;
channel?.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object' || !state.doc || message.name !== state.name) return;
  if (message.type === 'saved' && message.signature !== state.signature) {
    state.externalChange = true;
    render();
  } else if (message.type === 'locked') {
    void lockVault();
  }
});
const SNAPSHOT_KEY = 'clearvault.snapshotRetention';
let snapshotRetention = 10;
try {
  const stored = globalThis.localStorage?.getItem(SNAPSHOT_KEY);
  const saved = stored === null || stored === undefined ? NaN : Number(stored);
  if ([5, 10, 20, 50].includes(saved)) snapshotRetention = saved;
} catch {
  /* Keep the default when storage is unavailable. */
}
const snapshotStore = createSnapshotStore({ retention: snapshotRetention });
const ONBOARDING_KEY = 'clearvault.onboarding';
let onboardingMemory = null;
function onboardingData() {
  if (onboardingMemory) return onboardingMemory;
  try {
    if (!globalThis.localStorage) throw new Error('Storage unavailable');
    const data = JSON.parse(globalThis.localStorage.getItem(ONBOARDING_KEY) || '{}');
    if (data && typeof data === 'object') return data;
  } catch {
    /* Fall through to in-memory state for private or blocked storage. */
  }
  onboardingMemory = {};
  return onboardingMemory;
}
const onboardingDefaults = {
  started: false,
  dismissed: false,
  extension: false,
  fill: false,
  backup: false,
};
function onboardingForVault() {
  const data = onboardingData();
  const saved = data[state.name || 'unnamed'];
  return { ...onboardingDefaults, ...(saved && typeof saved === 'object' ? saved : {}) };
}
function updateOnboarding(partial) {
  const data = onboardingData();
  const key = state.name || 'unnamed';
  const current = data[key] && typeof data[key] === 'object' ? data[key] : {};
  data[key] = { ...onboardingDefaults, ...current, ...partial };
  try {
    if (!globalThis.localStorage) throw new Error('Storage unavailable');
    globalThis.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
  } catch {
    onboardingMemory = data;
  }
  return data[key];
}
function moveOnboarding(from, to, remove = true) {
  if (!from || !to || from === to) return;
  const data = onboardingData();
  if (!data[from]) return;
  data[to] = { ...onboardingDefaults, ...(data[to] || {}), ...data[from] };
  if (remove) delete data[from];
  try {
    if (!globalThis.localStorage) throw new Error('Storage unavailable');
    globalThis.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
  } catch {
    onboardingMemory = data;
  }
}
async function checkExternalChange() {
  if (!state.handle || !state.doc || state.busy) return;
  const generation = state.generation,
    handle = state.handle,
    signature = state.signature;
  try {
    const current = await fingerprint(await readBytes(handle));
    if (generation !== state.generation || handle !== state.handle || !state.doc) return;
    const changed = current !== signature;
    if (changed !== state.externalChange) {
      state.externalChange = changed;
      render();
    }
  } catch {
    /* Permission or file availability can change; saving still checks the hash. */
  }
}
function showSecurityOverview() {
  const report = securityReport();
  const card = (key, label, count, detail) =>
    `<button type="button" class="security-card" data-action="security-filter" data-filter="${key}" data-security-filter="${key}"><strong>${label}</strong><b>${count}</b><small>${detail}</small></button>`;
  showModal(
    `${modalHeader(t('安全概览'), t('仅在本地根据解密后的条目计算，不上传密码。'))}<div class="security-grid">${card('weak', t('弱密码'), report.weak.length, t('长度不足 12 个字符或强度过低的密码。'))}${card('reused', t('重复使用'), report.reused.length, t('{entries} 个条目使用同一密码（{groups} 组）', { entries: report.reused.length, groups: report.reusedGroups.length }))}${card('old', t('长期未更新'), report.old.length, t('超过一年没有修改的条目。'))}${card('no-otp', t('未启用两步验证'), report.noOtp.length, t('有密码但尚未添加 TOTP。'))}</div><p class="form-help">${t('共 {count} 个条目，{withPassword} 个设置了密码。', { count: report.total, withPassword: report.withPassword })}</p><div class="modal-footer">${button('close-modal', t('关闭'), null, 'button primary')}</div>`,
  );
}
async function mergeExternalChanges() {
  if (!state.doc || !state.handle || state.busy) return;
  if (modal.open) closeModal();
  try {
    await allowFile(state.handle, 'read');
    const file = await state.handle.getFile();
    if (file.size > 64 * 1024 * 1024) throw new Error(t('文件超过 64 MB，请使用桌面客户端处理'));
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hash = await fingerprint(bytes);
    if (hash === state.signature) {
      state.externalChange = false;
      render();
      toast(t('原文件没有新的外部更改'));
      return;
    }
    if (bytes.length < 3 || bytes[0] !== 5 || bytes[1] !== 5)
      throw new Error(t('这不是兼容的 SafeInCloud .db 文件'));
    if (!state.credential || bytes[2] !== state.version) {
      toast(t('外部文件版本不同，请重新打开并解锁后再合并'));
      return;
    }
    const decrypted = await decryptDatabaseWithCredential(bytes, state.credential);
    let externalDoc;
    try {
      externalDoc = parseVault(decrypted.xml);
    } finally {
      decrypted.credential.fill(0);
    }
    const baseDoc = state.baseXml ? parseVault(state.baseXml) : null;
    const localDoc = state.doc;
    const result = mergeVaults(baseDoc, localDoc, externalDoc);
    pendingMerge = { result, baseDoc, localDoc, externalDoc, bytes, hash };
    showMergePreview(result);
  } catch (error) {
    toast(message(error));
  }
}
function mergeValue(value, type) {
  if (type === 'flag') return e(value === 'true' ? t('是') : t('否'));
  if (['password', 'pin', 'secret', 'one_time_password'].includes(type))
    return `<code class="merge-secret" data-value="${e(value)}">••••••</code>`;
  return `<code>${e(value || '—')}</code>`;
}
function showMergePreview(result) {
  const sections = result.conflicts
    .slice(0, 10)
    .map((conflict) => {
      const fields = conflict.fields
        .map(
          (field, index) =>
            `<div class="merge-field"><strong>${e(field.label)}</strong><div class="merge-options"><label><input type="radio" name="merge-${e(conflict.id)}-${index}" value="local" ${field.chosen === 'local' ? 'checked' : ''}><span>${t('本地')}</span>${mergeValue(field.local, field.type)}</label><label><input type="radio" name="merge-${e(conflict.id)}-${index}" value="external" ${field.chosen === 'external' ? 'checked' : ''}><span>${t('外部')}</span>${mergeValue(field.external, field.type)}</label></div></div>`,
        )
        .join('');
      return `<section class="merge-conflict" data-merge-card="${e(conflict.id)}"><h3>${e(conflict.title)}</h3>${fields || `<p class="form-help">${t('此条目在两边被删除或重建，默认保留较新版本。')}</p>`}</section>`;
    })
    .join('');
  showModal(
    `${modalHeader(t('合并外部更改'), t('外部文件已解锁并与当前编辑合并。请核对冲突后保存。'))}<p>${t('共合并 {count} 个条目，{conflicts} 个冲突。', { count: result.merged, conflicts: result.conflicts.length })}</p>${result.conflicts.length ? `<p class="form-help">${t('冲突字段按较新的修改时间预选，可逐项更改。')}</p>${sections}${result.conflicts.length > 10 ? `<p class="form-help">${t('仅展示前 10 个冲突。')}</p>` : ''}<button type="button" class="text-button" data-action="merge-reveal">${t('显示冲突内容')}</button>` : ''}<div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button class="button primary" type="button" data-action="merge-apply">${t('采用合并结果')}</button></div>`,
  );
}
function showConflict() {
  showModal(
    `${modalHeader(t('原文件已被其他应用修改'), t('外部文件已变化。可以先合并外部更改，或另存副本或重新加载。'))}<div class="modal-footer">${button('close-modal', t('保留当前编辑'), null, 'button secondary')}${button('conflict-reload', t('重新加载文件'), 'upload', 'button secondary')}${button('conflict-save-copy', t('另存为副本'), 'download', 'button secondary')}${button('merge-external', t('合并更改'), 'edit', 'button primary')}</div>`,
  );
}
async function reloadFromDisk() {
  if (state.dirty && !(await askDiscard())) return;
  if (!state.handle) {
    await openFile();
    return;
  }
  try {
    await allowFile(state.handle, 'read');
    await acceptFile(await state.handle.getFile(), state.handle, state.recentId);
  } catch (error) {
    toast(message(error));
  }
}
function saveStatus() {
  if (state.busy) return t('正在处理…');
  if (state.saveError) return t('保存未完成，当前编辑仍在页面内，请重试或另存副本');
  if (state.dirty)
    return state.lastExported
      ? t('已导出加密副本，原文件尚未更新；更改仍未保存，保留在当前页面内')
      : t('有未保存的更改，记得保存到 .db 文件');
  if (state.lastSaved)
    return t('已验证保存于 {time}', {
      time: new Date(state.lastSaved).toLocaleTimeString(getLocale()),
    });
  if (state.lastExported)
    return t('已发起加密导出于 {time}，请确认下载文件', {
      time: new Date(state.lastExported).toLocaleTimeString(getLocale()),
    });
  return state.demo
    ? t('演示数据 · 随心探索，不会影响真实密码库')
    : t('密码库已解锁 · 修改后可保存为兼容的 .db 文件');
}
const e = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
function languagePicker() {
  return `<label class="language-picker"><span>${t('界面语言')}</span><select data-language aria-label="${t('选择语言')}">${supportedLocales.map((locale) => `<option value="${locale.code}" ${getLocale() === locale.code ? 'selected' : ''}>${locale.name}</option>`).join('')}</select></label>`;
}
function mountLanguagePickers() {
  document
    .querySelectorAll('.welcome-header-actions, .top-actions')
    .forEach((container) => container.insertAdjacentHTML('afterbegin', languagePicker()));
  mountSupportLinks();
  if (state.doc) {
    document
      .querySelector('.top-actions .profile')
      ?.insertAdjacentHTML(
        'beforebegin',
        button('import', t('导入密码'), 'upload', 'button secondary import-trigger'),
      );
    const trigger = document.querySelector('.import-trigger');
    trigger?.setAttribute('aria-label', t('导入密码'));
    trigger?.setAttribute('title', t('导入密码'));
  }
}
const paths = {
  shield: '<path d="M12 3 20 6v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 9 9m-5-5 3-3m-6 0 3-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L2 9.6l6.2-.9z"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8m-10 4h6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  folder: '<path d="M3 7V5h6l2 2h10v13H3z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 3v4l3 2 3-1 3 2 3-2v-3l3-2v-4l-3-1-1-3z"/>',
  sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
};
const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.key}</svg>`;
const button = (action, label, glyph, css = '') =>
  `<button type="button" class="${css}" data-action="${action}">${glyph ? icon(glyph) : ''}<span>${label}</span></button>`;
const iconButton = (action, label, glyph, extra = '') =>
  `<button type="button" class="icon-button ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${icon(glyph)}</button>`;
function toast(message) {
  const notification = $('#toast');
  // A manual popover places the shared toast above native modal dialogs without taking focus.
  notification.setAttribute('popover', 'manual');
  notification.textContent = message;
  notification.hidePopover?.();
  notification.showPopover?.();
  notification.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    notification.classList.remove('show');
    notification.hidePopover?.();
  }, 3200);
}

function message(error) {
  return fileError(error);
}
async function refreshRecent() {
  const generation = state.generation,
    doc = state.doc;
  const entries = await recentFiles.list();
  const display = await mergeRecentSession(
    entries,
    !state.doc && state.encrypted
      ? { id: state.recentId, name: state.name, handle: state.handle, dirty: state.dirty }
      : null,
  );
  if (generation !== state.generation || doc !== state.doc) return;
  recentEntries = entries;
  const container = document.querySelector('#recent-files');
  if (container)
    container.innerHTML = recentMarkup(
      display,
      recentFiles.persistent,
      typeof window.showDirectoryPicker === 'function',
    );
}
async function rememberFile() {
  const name = state.name,
    handle = state.handle;
  const entry = await recentFiles.remember(name, handle);
  if (name === state.name && handle === state.handle) state.recentId = entry.id;
  await refreshRecent();
}
async function openRecent(id) {
  const entry = recentEntries.find((item) => item.id === id);
  if (!entry) return;
  if (!entry.handle) {
    await openFile();
    return;
  }
  if (state.dirty && !(await askDiscard())) return;
  try {
    await allowFile(entry.handle);
    await acceptFile(await entry.handle.getFile(), entry.handle, entry.id);
  } catch (error) {
    toast(message(error));
  }
}
function labels() {
  return state.doc ? children(state.doc.documentElement, 'label') : [];
}
function cardLabels(card) {
  const ids = children(card, 'label_id').map((el) => el.textContent);
  return labels().filter((el) => ids.includes(el.getAttribute('id')));
}
const quickSearch = createQuickSearch({
  notify: toast,
  items: () =>
    state.doc
      ? cards(state.doc)
          .filter(active)
          .map((card) => {
            const id = card.getAttribute('id');
            const searchText = [
              title(card),
              ...fields(card)
                .filter((field) => ['login', 'email', 'website'].includes(fieldType(field)))
                .map((field) => field.textContent),
              ...cardLabels(card).map((label) => label.getAttribute('name')),
            ].join(' ');
            return {
              id,
              title: title(card),
              subtitle: account(card),
              hasPassword: fields(card).some(
                (field) => fieldType(field) === 'password' && field.textContent,
              ),
              hasOTP: fields(card).some(hasOTP),
              recent: recentForVault()[id] || 0,
              search: searchText + ' ' + pinyinSearch(searchText),
            };
          })
      : [],
  copyPassword: async (id) => {
    if (!state.doc || state.busy) throw new Error('Vault unavailable');
    const card = cards(state.doc).find((item) => item.getAttribute('id') === id && active(item));
    const password =
      card && fields(card).find((field) => fieldType(field) === 'password' && field.textContent);
    if (!password) throw new Error('Password unavailable');
    await clipboardGuard.write(password.textContent);
    recordRecent(id);
  },
  copyOTP: async (id) => {
    if (!state.doc || state.busy) throw new Error('Vault unavailable');
    const card = cards(state.doc).find((item) => item.getAttribute('id') === id && active(item));
    const field = card && fields(card).find(hasOTP);
    if (!field) throw new Error('OTP unavailable');
    const config = parseOTP(field.textContent);
    try {
      await clipboardGuard.write(await totp(config));
    } finally {
      config.secret.fill(0);
    }
    recordRecent(id);
  },
  copyNotice: clipboardNotice,
  commands: () => [
    {
      label: t('新建条目'),
      keywords: ['new', 'add', '新建', '添加'],
      run: () => {
        quickSearch.close(false);
        showEditor(null, false);
      },
    },
    {
      label: t('添加验证器'),
      keywords: ['otp', 'totp', '2fa', '验证器', '验证码'],
      run: () => {
        quickSearch.close(false);
        showEditor(null, true);
      },
    },
    {
      label: t('生成密码'),
      keywords: ['generate', 'password', '生成', '密码'],
      run: async () => {
        await clipboardGuard.write(generatePassword());
        toast(clipboardNotice());
      },
    },
    {
      label: t('锁定密码库'),
      keywords: ['lock', '锁定'],
      run: () => lockVault(),
    },
    {
      label: t('打开其他密码库'),
      keywords: ['switch', 'open', '切换', '打开'],
      run: () => {
        quickSearch.close(false);
        return openFile();
      },
    },
    {
      label: t('偏好设置'),
      keywords: ['settings', 'preferences', '设置', '偏好'],
      run: () => {
        quickSearch.close(false);
        settings();
      },
    },
  ],
  openEntry: (id) => {
    clearTimeout(searchTimer);
    recordRecent(id);
    state.section = 'all';
    state.search = '';
    state.securityFilter = null;
    batchMode = false;
    batchSelection.clear();
    state.selected = id;
    state.mobileDetail = true;
    render();
    document.querySelector('.detail-pane h2')?.setAttribute('tabindex', '-1');
    document.querySelector('.detail-pane h2')?.focus();
  },
  lock: lockVault,
});
function showQuickSearch() {
  if (state.doc && !state.busy && !modal.open) quickSearch.show();
}
const isDeleted = (card) => card.getAttribute('deleted') === 'true';
const isArchived = (card) => card.getAttribute('archived') === 'true';
const active = (card) => !isDeleted(card) && !isArchived(card);
const account = (card) =>
  fields(card).find((field) => ['login', 'email'].includes(fieldType(field)))?.textContent ||
  t('暂无账号');
function avatar(card, large = false) {
  const name = title(card);
  const index = [...name].reduce((n, c) => n + c.codePointAt(0), 0) % 6;
  const known = {
    GitHub: '⌘',
    Google: 'G',
    Figma: 'F',
    Notion: 'N',
    'Proton Mail': 'P',
    Cloudflare: 'C',
  };
  return `<div class="avatar color-${index} ${large ? 'large' : ''}">${e(known[name] || [...name][0]?.toUpperCase() || 'K')}</div>`;
}
function navItem(id, text, glyph, count) {
  return `<button class="nav-item ${state.section === id ? 'active' : ''}" data-section="${e(id)}" aria-label="${e(text)}">${icon(glyph)}<span>${e(text)}</span>${count === undefined ? '' : `<small>${count}</small>`}</button>`;
}
function render() {
  otpGeneration++;
  if (!state.doc) {
    renderWelcome();
    return;
  }
  const all = cards(state.doc),
    live = all.filter(active),
    otpCount = live.filter((card) => fields(card).some(hasOTP)).length;
  const sectionTitles = {
    all: [t('所有条目'), t('生活里的重要信息，在这里井井有条。')],
    otp: [t('双重验证'), t('每一次登录，多一份安心。')],
    starred: [t('我的收藏'), t('常用的账号，随时触手可及。')],
    archive: [t('归档'), t('暂时不用，依然妥善保管。')],
    trash: [t('回收站'), t('已删除的条目，随时可以恢复。')],
  };
  const labelTitle = labels()
    .find((el) => 'label:' + el.getAttribute('id') === state.section)
    ?.getAttribute('name');
  const securityTitles = {
    weak: [t('弱密码'), t('长度不足或过于简单的密码。')],
    reused: [t('重复使用'), t('多个条目使用同一个密码。')],
    old: [t('长期未更新'), t('超过一年没有修改的密码。')],
    'no-otp': [t('未启用两步验证'), t('有密码但尚未添加 TOTP 的条目。')],
  };
  const [heading, subtitle] = state.securityFilter
    ? securityTitles[state.securityFilter] || [t('安全概览筛选结果'), t('本地安全筛选。')]
    : sectionTitles[state.section] || [labelTitle || t('标签'), t('用标签整理你的数字生活。')];
  const visible = filteredCards();
  if (!visible.some((card) => card.getAttribute('id') === state.selected))
    state.selected = visible[0]?.getAttribute('id') || null;
  const selected = visible.find((card) => card.getAttribute('id') === state.selected);
  const onboarding = onboardingForVault();
  const showOnboarding =
    !state.demo && !onboarding.dismissed && (live.length === 0 || onboarding.started);
  if (showOnboarding && !onboarding.started)
    onboarding.started = updateOnboarding({ started: true }).started;
  const onboardingDone = {
    entries: live.length > 0,
    extension: Boolean(onboarding.extension),
    fill: Boolean(onboarding.fill),
    otp: otpCount > 0,
    backup: Boolean(onboarding.backup),
  };
  const onboardingDoneCount = Object.values(onboardingDone).filter(Boolean).length;
  const onboardingTotal = 5;
  const saveAttention = Boolean(state.dirty || state.saveError || state.demo);
  const saveStyle = saveAttention ? 'button primary' : 'button secondary';
  const newStyle = saveAttention ? 'button secondary' : 'button primary';
  const selectedIndex = visible.findIndex((card) => card.getAttribute('id') === state.selected);
  if (selectedIndex >= state.listLimit)
    state.listLimit = Math.ceil((selectedIndex + 1) / 200) * 200;
  const shownVisible = visible.slice(0, state.listLimit);
  const remaining = visible.length - shownVisible.length;
  app.innerHTML = html`<div class="shell ${state.selected ? 'has-selection' : ''} ${state.mobileDetail ? '' : 'mobile-list'}">
    <aside class="sidebar">
      <a class="brand" href="./" aria-label="ClearVault 首页"><img src="./icon.svg" alt="" width="29" height="29"><span>ClearVault<span class="brand-dot">.</span></span></a>
      <button class="vault-switch" data-action="info"><span class="vault-glyph">${icon('lock', 19)}</span><span><strong>${state.demo ? t('体验密码库') : e(state.name.replace(/\.db$/i, '') || t('我的密码库'))}</strong><small>本地密码库 <span class="tiny-dot"></span></small></span>${icon('chevron', 15)}</button>
      <div class="nav-caption">工作空间</div>
      <nav aria-label="密码库导航">
        ${navItem('all', t('所有条目'), 'grid', live.length)}
        ${navItem('otp', t('双重验证'), 'clock', otpCount)}
        ${navItem('starred', t('我的收藏'), 'star', live.filter((card) => card.getAttribute('star') === 'true').length)}
        <button class="nav-item" data-action="security-overview" aria-label="${t('安全概览')}">${icon('shield')}<span>${t('安全概览')}</span></button>
        <div class="nav-divider"></div>
        ${navItem('archive', t('归档'), 'archive')}${navItem('trash', t('回收站'), 'trash')}
        <div class="nav-caption label-caption">我的标签 <span class="label-caption-actions">${iconButton('add-label', t('新建标签'), 'plus')}${iconButton('manage-labels', t('管理标签'), 'settings')}</span></div>
        ${labels()
          .map((label) =>
            navItem(
              'label:' + label.getAttribute('id'),
              label.getAttribute('name') || t('未命名标签'),
              'folder',
            ),
          )
          .join('')}
      </nav>
      <div class="sidebar-bottom"><div class="local-note">${icon('shield', 18)}<div><strong>你的数据，只属于你</strong><small>本地解密 · 离线可用</small></div></div><div class="sidebar-actions">${button('settings', t('设置'), 'settings')}${button('lock', t('锁定'), 'lock')}</div></div>
    </aside>
    <main class="workspace">
      <header class="topbar"><div class="breadcrumb">个人空间 ${icon('chevron', 12)}<strong>${e(heading)}</strong></div><div class="top-actions"><span class="privacy-pill"><i></i> 本地加密</span>${state.demo ? t('<span class="demo-pill">演示</span>') : ''}${iconButton('open', t('打开其他密码库'), 'folder')}${iconButton('settings', t('偏好设置'), 'settings', 'mobile-top-action')}${iconButton('lock', t('锁定密码库'), 'lock', 'mobile-top-action')}${state.install ? iconButton('install', t('安装应用'), 'download') : ''}<div class="profile">我</div></div></header>
      <section class="page-heading"><div><div class="eyebrow">为你的数字生活，留一份安心。</div><h1>${e(heading)}<span>${visible.length}</span></h1><p>${e(subtitle)}</p></div><div class="heading-actions">${button('save', state.busy ? t('处理中…') : state.demo ? t('保存为我的密码库') : state.dirty || state.saveError ? t('保存更改') : t('保存数据库'), 'download', saveStyle)}${button('new', state.section === 'otp' ? t('添加验证器') : t('新建条目'), 'plus', newStyle)}</div></section>
      <div class="status-line" role="status"><span><i class="${state.dirty || state.saveError ? 'unsaved-dot' : 'saved-dot'}"></i>${e(saveStatus())}</span><span>${icon('lock', 13)} ${state.idleMinutes} 分钟无操作自动锁定</span></div>${state.externalChange ? html`<div class="conflict-banner" role="alert"><div><strong>${t('原文件已被其他应用修改')}</strong><span>${t('保存会停止，避免覆盖外部版本。可合并外部更改。')}</span></div><div class="conflict-banner-actions">${button('merge-external', t('合并更改'), 'edit', 'button secondary')}${button('conflict-save-copy', t('另存为副本'), 'download', 'button secondary')}${button('conflict-reload', t('重新加载文件'), 'upload', 'text-button')}</div></div>` : ''}${showOnboarding ? html`<section class="onboarding-card" aria-label="${t('开始使用 ClearVault')}"><div class="onboarding-head"><div><strong>${t('开始使用 ClearVault')}</strong><small>${t('完成 {done}/{total} 步', { done: onboardingDoneCount, total: onboardingTotal })}</small></div>${button('onboarding-dismiss', t('稍后'), null, 'text-button')}</div><div class="onboarding-progress"><i style="width:${(onboardingDoneCount / onboardingTotal) * 100}%"></i></div><ul class="onboarding-list"><li class="${onboardingDone.entries ? 'done' : ''}"><label class="onboarding-manual"><input type="checkbox" ${onboardingDone.entries ? 'checked' : ''} disabled><span>${t('导入或新建第一条记录')}</span></label>${onboardingDone.entries ? `<small>${t('已完成')}</small>` : button('onboarding-import', t('导入密码'), null, 'text-button')}</li><li class="${onboardingDone.extension ? 'done' : ''}"><label class="onboarding-manual"><input type="checkbox" data-onboarding="extension" ${onboardingDone.extension ? 'checked' : ''}><span>${t('安装浏览器扩展')}</span></label><a href="./downloads/" target="_blank" rel="noopener">${t('使用指南')}</a></li><li class="${onboardingDone.fill ? 'done' : ''}"><label class="onboarding-manual"><input type="checkbox" data-onboarding="fill" ${onboardingDone.fill ? 'checked' : ''}><span>${t('首次填充或复制验证码')}</span></label><a href="./guides/browser-extension/" target="_blank" rel="noopener">${t('使用指南')}</a></li><li class="${onboardingDone.otp ? 'done' : ''}"><label class="onboarding-manual"><input type="checkbox" ${onboardingDone.otp ? 'checked' : ''} disabled><span>${t('添加一个验证器')}</span></label>${onboardingDone.otp ? `<small>${t('已完成')}</small>` : button('onboarding-otp', t('添加一个验证器'), null, 'text-button')}</li><li class="${onboardingDone.backup ? 'done' : ''}"><label class="onboarding-manual"><input type="checkbox" ${onboardingDone.backup ? 'checked' : ''} disabled><span>${t('保存并设置备份')}</span></label>${onboardingDone.backup ? `<small>${t('已完成')}</small>` : button('onboarding-backup', t('设置'), null, 'text-button')}</li></ul></section>` : ''}
      <button type="button" class="quick-launch" data-action="quick-search" aria-keyshortcuts="Control+k Meta+k"><span>${icon('search', 18)}<strong>${e(t('快速查找'))}</strong><kbd>${modifier} K</kbd></span><small>${e(t('↑ ↓ 选择'))} <span>·</span> ${modifier} ↵ ${e(t('复制密码'))} <span>·</span> ${modifier} ⇧ L ${e(t('锁定'))}</small>${icon('chevron', 16)}</button>
      <section class="vault-content ${state.section === 'otp' ? 'auth-view' : ''}">
        <div class="entry-pane"><div class="search-row"><label class="search-box">${icon('search', 18)}<input id="search" type="search" placeholder="搜索条目、账号或标签…" value="${e(state.search)}" autocomplete="off" aria-label="搜索条目"></label><button type="button" class="key-hint" data-action="quick-search" aria-label="${e(t('快速查找'))}">${modifier} K</button></div>${state.securityFilter ? `<div class="security-filter-chip"><span>${icon('shield', 14)} ${e(heading)} · ${visible.length}</span>${button('clear-security-filter', t('清除筛选'), 'close', 'text-button')}</div>` : ''}
        ${batchMode ? `<div class="batch-bar"><span class="batch-count">${t('已选择 {count} 项', { count: batchSelection.size })}</span><div class="batch-actions">${button('batch-select-all', t('全选'), null, 'text-button')}${button('batch-clear', t('清除选择'), null, 'text-button')}${button('batch-label', t('添加标签'), 'plus', 'text-button')}${button('batch-archive', t('归档'), 'archive', 'text-button')}${button('batch-trash', t('移至回收站'), 'trash', 'text-button')}${button('batch-cancel', t('取消'), 'close', 'text-button')}</div></div>` : `<div class="list-meta"><span>${state.section === 'otp' ? t('你的验证器') : t('名称')}</span><span>${state.section === 'otp' ? t('动态验证码') : t('按名称排列')} ${button('batch-start', t('批量选择'), null, 'text-button')}</span></div>`}
        <div class="entry-list">${visible.length ? shownVisible.map((card) => renderRow(card)).join('') + (remaining ? button('more', t('显示更多（还有 {count} 条）', { count: remaining }), null, 'button secondary more-entries') : '') : `<div class="empty-state">${icon(state.section === 'otp' ? 'clock' : 'search', 34)}<h3>${state.search ? t('没有找到相关条目') : t('这里还是空的')}</h3><p>${state.search ? t('试试其他关键词') : t('添加一个账号，开始整理你的数字生活。')}</p>${state.search ? button('clear-search', t('清除搜索'), null, 'text-button') : button('new', t('添加第一个条目'), 'plus', 'button secondary')}</div>`}</div>
        <div class="list-footer">${icon('shield', 14)} 数据在此设备上解密，不上传密码库</div></div>
        <div class="detail-pane">${selected ? renderDetail(selected) : html`<div class="empty-state detail-empty">${icon('shield', 48)}<h3>留一点空间，给安心</h3><p>选择一个条目查看详情</p></div>`}</div>
      </section><footer class="page-footer"><span>少一点担忧，多一点从容。</span><span>ClearVault <span class="footer-dot">·</span> SafeInCloud 兼容</span></footer>
    </main></div>`;
  mountLanguagePickers();
  refreshCodes();
}
function securityReport() {
  const live = cards(state.doc).filter(active);
  const passwords = new Map();
  const weak = [],
    reused = [],
    old = [],
    noOtp = [];
  const now = Date.now();
  let withPassword = 0;
  for (const card of live) {
    const password = fields(card).find(
      (field) => fieldType(field) === 'password' && field.textContent,
    );
    const otp = fields(card).some(hasOTP);
    if (password) {
      withPassword++;
      const value = password.textContent;
      if (!passwords.has(value)) passwords.set(value, []);
      passwords.get(value).push(card);
      if (value.length < 12 || passwordStrength(value).score <= 1) weak.push(card);
      const stamp = Number(
        card.getAttribute('first_stamp') || card.getAttribute('time_stamp') || 0,
      );
      if (stamp && now - stamp > 365 * 24 * 60 * 60 * 1000) old.push(card);
      if (!otp) noOtp.push(card);
    }
  }
  const groups = [...passwords.values()].filter((group) => group.length > 1);
  for (const group of groups) reused.push(...group);
  const unique = (items) => [
    ...new Map(items.map((card) => [card.getAttribute('id'), card])).values(),
  ];
  return {
    total: live.length,
    withPassword,
    weak: unique(weak),
    reused: unique(reused),
    old: unique(old),
    noOtp: unique(noOtp),
    reusedGroups: groups,
  };
}
function updateBatchCount() {
  const count = document.querySelector('.batch-count');
  if (count) count.textContent = t('已选择 {count} 项', { count: batchSelection.size });
  document
    .querySelectorAll(
      '[data-action=batch-label], [data-action=batch-archive], [data-action=batch-trash]',
    )
    .forEach((button) => (button.disabled = batchSelection.size === 0));
  const clear = document.querySelector('[data-action=batch-clear]');
  if (clear) clear.disabled = batchSelection.size === 0;
}
function setBatchSelected(id, selected) {
  if (!id) return;
  if (selected) batchSelection.add(id);
  else batchSelection.delete(id);
  const input = document.querySelector(`[data-batch-select="${id}"]`);
  if (input) {
    input.checked = selected;
    input.closest('.entry-row')?.classList.toggle('batch-selected', selected);
  }
  updateBatchCount();
}
function applyBatch(mutate, message) {
  if (!batchSelection.size) {
    toast(t('请先选择条目'));
    return;
  }
  const ids = new Set(batchSelection);
  let count = 0;
  for (const card of cards(state.doc)) {
    if (!ids.has(card.getAttribute('id'))) continue;
    mutate(card);
    touch(card);
    count++;
  }
  batchMode = false;
  batchSelection.clear();
  markDirty();
  toast(t(message, { count }));
}
function labelById(id) {
  return labels().find((label) => label.getAttribute('id') === id);
}
function showLabelManager() {
  const list = labels();
  showModal(
    `${modalHeader(t('管理标签'), t('重命名、合并或删除标签；不会删除条目。'))}<div class="label-manager">${
      list.length
        ? list
            .map(
              (label) =>
                `<div class="label-manage-row"><strong>${e(label.getAttribute('name'))}</strong><div class="label-manage-actions"><button type="button" class="text-button" data-action="label-rename" data-id="${e(label.getAttribute('id'))}">${t('重命名')}</button><button type="button" class="text-button" data-action="label-merge" data-id="${e(label.getAttribute('id'))}">${t('合并')}</button><button type="button" class="text-button" data-action="label-delete" data-id="${e(label.getAttribute('id'))}">${t('删除')}</button></div></div>`,
            )
            .join('')
        : `<p>${t('还没有标签')}</p>`
    }</div><div class="modal-footer">${button('close-modal', t('关闭'), null, 'button primary')}</div>`,
  );
}
function renameLabelForm(label) {
  const name = label.getAttribute('name') || '';
  showModal(
    `<form id="label-rename-form">${modalHeader(t('重命名标签'), e(name))}<label class="form-label">${t('标签名称')}<input name="name" maxlength="80" required value="${e(name)}"></label><p class="form-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button class="button primary" type="submit">${t('保存')}</button></div></form>`,
  );
  const form = $('#label-rename-form');
  form.onsubmit = (event) => {
    event.preventDefault();
    const value = form.elements.name.value.trim();
    if (!value) {
      form.querySelector('.form-error').textContent = t('标签名称');
      return;
    }
    label.setAttribute('name', value);
    markDirty();
    showLabelManager();
    toast(t('标签已重命名'));
  };
}
function mergeLabelForm(label) {
  const sourceId = label.getAttribute('id');
  const targets = labels().filter((item) => item !== label);
  showModal(
    `<form id="label-merge-form">${modalHeader(t('合并到'), e(label.getAttribute('name')))}${targets.length ? `<label class="form-label">${t('合并到')}<select name="target">${targets.map((item) => `<option value="${e(item.getAttribute('id'))}">${e(item.getAttribute('name'))}</option>`).join('')}</select></label>` : `<p>${t('还没有标签')}</p>`}<p class="form-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}${targets.length ? `<button class="button primary" type="submit">${t('合并')}</button>` : ''}</div></form>`,
  );
  const form = $('#label-merge-form');
  form.onsubmit = (event) => {
    event.preventDefault();
    const target = targets.find((item) => item.getAttribute('id') === form.elements.target.value);
    if (!target) return;
    const targetId = target.getAttribute('id');
    for (const card of cards(state.doc)) {
      const references = children(card, 'label_id');
      const source = references.find((reference) => reference.textContent === sourceId);
      if (!source) continue;
      if (references.some((reference) => reference.textContent === targetId)) source.remove();
      else source.textContent = targetId;
      touch(card);
    }
    if (state.section === 'label:' + sourceId) state.section = 'all';
    label.remove();
    markDirty();
    showLabelManager();
    toast(t('标签已合并'));
  };
}
function deleteLabelForm(label) {
  const sourceId = label.getAttribute('id');
  showModal(
    `<form id="label-delete-form">${modalHeader(t('删除'), e(label.getAttribute('name')))}<p>${t('删除标签“{name}”？条目不会被删除，只会移除该标签。', { name: label.getAttribute('name') })}</p><p class="form-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button class="button danger" type="submit">${t('删除')}</button></div></form>`,
  );
  const form = $('#label-delete-form');
  form.onsubmit = (event) => {
    event.preventDefault();
    for (const card of cards(state.doc)) {
      const references = children(card, 'label_id').filter(
        (reference) => reference.textContent === sourceId,
      );
      if (!references.length) continue;
      references.forEach((reference) => reference.remove());
      touch(card);
    }
    if (state.section === 'label:' + sourceId) state.section = 'all';
    label.remove();
    markDirty();
    showLabelManager();
    toast(t('标签已删除'));
  };
}
function showBatchLabel() {
  if (!batchSelection.size) {
    toast(t('请先选择条目'));
    return;
  }
  const options = labels()
    .map(
      (label) =>
        `<option value="${label.getAttribute('id')}">${e(label.getAttribute('name'))}</option>`,
    )
    .join('');
  showModal(
    `<form id="batch-label-form">${modalHeader(t('添加标签'), t('为选中的 {count} 个条目添加标签', { count: batchSelection.size }))}${labels().length ? `<label class="form-label">${t('选择标签')}<select name="label">${options}</select></label>` : ''}<label class="form-label">${t('或新建标签')}<input name="newLabel" maxlength="80" placeholder="${t('输入新标签名称')}"></label><p class="form-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button class="button primary" type="submit">${t('添加标签')}</button></div></form>`,
  );
  const form = $('#batch-label-form');
  form.onsubmit = (event) => {
    event.preventDefault();
    const newName = form.elements.newLabel.value.trim();
    let labelId = form.elements.label?.value || '';
    if (newName) {
      const existing = labels().find((label) => label.getAttribute('name') === newName);
      if (existing) labelId = existing.getAttribute('id');
      else {
        const label = state.doc.createElement('label');
        label.setAttribute('id', newCard(state.doc).getAttribute('id'));
        label.setAttribute('name', newName);
        state.doc.documentElement.append(label);
        labelId = label.getAttribute('id');
      }
    }
    if (!labelId) {
      form.querySelector('.form-error').textContent = t('请选择或新建标签');
      return;
    }
    let count = 0;
    for (const card of cards(state.doc)) {
      if (!batchSelection.has(card.getAttribute('id'))) continue;
      if (children(card, 'label_id').some((label) => label.textContent === labelId)) continue;
      const reference = state.doc.createElement('label_id');
      reference.textContent = labelId;
      card.append(reference);
      touch(card);
      count++;
    }
    batchMode = false;
    batchSelection.clear();
    closeModal();
    markDirty();
    toast(t('已为 {count} 个条目添加标签', { count }));
  };
}
function filteredCards() {
  if (!state.doc) return [];
  const securityKey = state.securityFilter === 'no-otp' ? 'noOtp' : state.securityFilter;
  const securityIds = securityKey
    ? new Set(securityReport()[securityKey].map((card) => card.getAttribute('id')))
    : null;
  return cards(state.doc)
    .filter((card) => {
      if (securityIds && !securityIds.has(card.getAttribute('id'))) return false;
      if (
        state.section === 'trash'
          ? !isDeleted(card)
          : state.section === 'archive'
            ? isDeleted(card) || !isArchived(card)
            : !active(card)
      )
        return false;
      if (state.section === 'otp' && !fields(card).some(hasOTP)) return false;
      if (state.section === 'starred' && card.getAttribute('star') !== 'true') return false;
      if (
        state.section.startsWith('label:') &&
        !children(card, 'label_id').some((el) => el.textContent === state.section.slice(6))
      )
        return false;
      const search = state.search.trim().toLocaleLowerCase();
      const searchableText = [
        title(card),
        ...fields(card)
          .filter(
            (field) =>
              !['password', 'secret', 'pin', 'binary', 'one_time_password'].includes(
                fieldType(field),
              ),
          )
          .map((field) => field.textContent),
        ...cardLabels(card).map((label) => label.getAttribute('name')),
      ].join(' ');
      return (
        !search ||
        searchableText.toLocaleLowerCase().includes(search) ||
        pinyinSearch(searchableText).includes(search)
      );
    })
    .sort((a, b) => title(a).localeCompare(title(b), getLocale()));
}
function otpWidget(card, field, compact = false) {
  const index = fields(card).indexOf(field);
  return html`<div class="otp-widget ${compact ? 'compact' : ''}" data-card="${e(card.getAttribute('id'))}" data-field="${index}"><button class="otp-code" data-action="copy-otp" data-id="${e(card.getAttribute('id'))}" data-index="${index}" title="复制动态验证码">••• •••</button><div class="countdown" role="img" aria-label="验证码剩余时间"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="ring-bg"/><circle cx="18" cy="18" r="15.5" class="ring-progress"/></svg><small>30</small></div>${compact ? '' : t('<span class="otp-copy-hint">点击验证码复制</span>')}</div>`;
}
function renderRow(card) {
  const otp = fields(card).find(hasOTP);
  const id = card.getAttribute('id');
  return html`<div class="entry-row ${state.selected === id ? 'selected' : ''} ${batchMode && batchSelection.has(id) ? 'batch-selected' : ''}" data-select="${e(id)}" tabindex="0" role="button" aria-label="查看 ${e(title(card))}" aria-pressed="${state.selected === id}">${batchMode ? `<input type="checkbox" class="batch-check" data-batch-select="${e(id)}" aria-label="${e(t('选择条目'))}" ${batchSelection.has(id) ? 'checked' : ''}>` : ''}${avatar(card)}<div class="entry-summary"><strong>${e(title(card))}${card.getAttribute('star') === 'true' ? `<span class="star-mark">${icon('star', 12)}</span>` : ''}</strong><small>${e(account(card))}</small></div>${state.section === 'otp' && otp ? otpWidget(card, otp, true) : `<span class="row-tail">${otp ? `<span class="otp-badge">${icon('clock', 13)} 2FA</span>` : ''}${icon('chevron', 15)}</span>`}</div>`;
}
function renderDetail(card) {
  const id = card.getAttribute('id'),
    deleted = isDeleted(card);
  const basic = fields(card).filter((field) => !isOTP(field));
  const otps = fields(card).filter(hasOTP);
  return html`<div class="detail-toolbar">${iconButton('back-list', t('返回列表'), 'back', 'mobile-back')}<span>条目详情</span><div>${iconButton('star', card.getAttribute('star') === 'true' ? t('取消收藏') : t('收藏'), 'star', card.getAttribute('star') === 'true' ? 'is-starred' : '')}${iconButton('edit', t('编辑条目'), 'edit')}</div></div>
    <div class="detail-scroll"><div class="identity">${avatar(card, true)}<h2>${e(title(card))}</h2><p>${e(account(card))}</p><div class="tag-list">${
      cardLabels(card)
        .map((label) => `<span>${e(label.getAttribute('name'))}</span>`)
        .join('') || t('<span>个人账号</span>')
    }</div></div>
    <div class="detail-section-title">账号信息</div><div class="field-group">${
      basic
        .map((field) => {
          const index = fields(card).indexOf(field),
            type = fieldType(field),
            secret = ['password', 'pin', 'secret'].includes(type);
          return `<div class="data-field"><div><label>${e(field.getAttribute('name') || type)}</label><div class="field-value ${secret ? 'secret-value' : ''}" data-value-index="${index}">${secret ? '••••••••••••' : type === 'binary' ? t('二进制字段（原样保留）') : e(field.textContent || '—')}</div></div><div class="field-actions">${secret ? html`<button class="icon-button" data-action="reveal" data-index="${index}" aria-label="显示或隐藏 ${e(field.getAttribute('name'))}">${icon('eye', 17)}</button>` : ''}${type !== 'binary' ? html`<button class="icon-button" data-action="copy-field" data-index="${index}" aria-label="复制 ${e(field.getAttribute('name'))}">${icon('copy', 17)}</button>` : ''}</div></div>`;
        })
        .join('') || t('<p class="muted padded">暂未添加字段</p>')
    }</div>
    ${otps.map((field) => html`<div class="detail-section-title">${icon('shield', 15)} ${e(field.getAttribute('name') || t('双重验证'))}</div><div class="auth-card"><div class="auth-card-heading"><span>一次性验证码</span><span class="live-label"><i></i> 实时更新</span></div>${otpWidget(card, field)}<p>验证码仅在本地生成，请确保设备时间准确。</p></div>`).join('')}
    ${children(card, 'notes')[0]?.textContent ? html`<div class="detail-section-title">备注</div><p class="notes">${e(children(card, 'notes')[0].textContent)}</p>` : ''}
    ${children(card, 'file').length || children(card, 'image').length ? t('<div class="preserved-note">此条目含附件或图片。保存时会原样保留。</div>') : ''}
    <div class="detail-bottom"><span>更新于 ${formatDate(card.getAttribute('time_stamp'))}</span>${deleted ? button('restore', t('恢复条目'), 'archive', 'text-button') : `<div>${iconButton('archive', isArchived(card) ? t('取消归档') : t('归档条目'), 'archive')}${iconButton('delete', t('移至回收站'), 'trash')}</div>`}</div></div>`;
}
function formatDate(stamp) {
  const num = Number(stamp);
  return num && Number.isFinite(num)
    ? new Date(num).toLocaleDateString(getLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : t('未知日期');
}
function welcomeNavigation() {
  const english = getLocale() !== 'zh-CN';
  const prefix = english ? '/en' : '';
  return `<nav class="welcome-links" aria-label="${t('帮助与资源')}"><a href="${prefix}/guides/">${t('使用指南')}</a><a href="${prefix}/security/">${t('安全与隐私')}</a><a href="/en/" lang="en">${t('英文网站')}</a><a href="${prefix}/downloads/">${t('下载与源代码')}</a><a href="${buildInfo.repository || './downloads/'}" target="_blank" rel="noopener noreferrer">GitHub · MIT ↗</a></nav>`;
}
function renderWelcome() {
  app.innerHTML = html`<div class="welcome"><header class="welcome-header"><a class="brand" href="./"><img src="./icon.svg" alt="" width="29" height="29"><span>ClearVault<span class="brand-dot">.</span></span></a><div class="welcome-header-actions"><span class="privacy-pill"><i></i> 你的设备，你的密码库</span>${state.install ? button('install', t('安装应用'), 'download', 'button secondary') : ''}</div></header>
    <main class="welcome-main"><div class="welcome-copy"><span class="overline">为安心留一点空间</span><h1>重要的，<br>安心放在这里<span>。</span></h1><p>密码、账号和两步验证码，井井有条。<br>打开你的 SafeInCloud 密码库，开始更轻盈的数字生活。</p><div class="welcome-buttons">${button('open', t('打开 .db 密码库'), 'folder', 'button primary large-button')}${state.encrypted ? '' : button('demo', t('先体验一下'), 'sparkle', 'button secondary large-button')}</div><div class="welcome-secondary">${button('create', t('创建新密码库'), 'plus', 'text-button')}<span>无需注册 · 无需上传文件 · 可拖放 .db</span></div></div>
    <div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="floating-tag tag-top">${icon('check', 15)} 一切井井有条。</div><div class="vault-illustration"><div class="vault-face">${icon('shield', 92)}<span>你的私密空间</span></div><div class="vault-foot"></div></div><div class="floating-otp"><div class="mini-brand">G</div><div><small>双重验证 · Google</small><strong>482 <span>916</span></strong></div><div class="illustration-ring">24</div></div><div class="art-sparkle">✦</div></div></main>
    <section class="welcome-features"><article>${icon('lock', 23)}<h3>只在本地，安心解锁</h3><p>主密码解密，文件始终由你掌握。</p></article><article>${icon('clock', 23)}<h3>两步验证，一眼即得</h3><p>实时动态验证码，轻点即可复制。</p></article><article>${icon('download', 23)}<h3>随时保存，自由带走</h3><p>读写兼容 .db 格式，离线也能使用。</p></article></section><footer class="welcome-footer"><div class="welcome-footer-copy"><span>少一点担忧，多一点从容。</span><span>为你的数字生活，留一份安心。</span></div>${welcomeNavigation()}</footer></div>`;
  mountLanguagePickers();
  document
    .querySelector('.welcome-secondary')
    ?.insertAdjacentHTML(
      'beforeend',
      button('restore-file', t('从文件恢复'), 'clock', 'text-button') +
        button('install', t('安装到设备'), 'download', 'text-button'),
    );
  document
    .querySelector('.welcome-copy')
    ?.insertAdjacentHTML('beforeend', '<div id="recent-files"></div>');
  void refreshRecent();
}
async function refreshCodes() {
  const generation = otpGeneration;
  const widgets = [...document.querySelectorAll('.otp-widget')];
  for (const widget of widgets) {
    const card =
      state.doc && cards(state.doc).find((card) => card.getAttribute('id') === widget.dataset.card);
    const field = card && fields(card)[Number(widget.dataset.field)];
    if (!field) continue;
    let config;
    try {
      config = parseOTP(field.textContent);
      const now = Date.now();
      const remaining = config.period - ((now / 1000) % config.period);
      const counter = Math.floor(now / 1000 / config.period);
      if (widget.dataset.otpCounter !== String(counter) || !widget.dataset.otpCode) {
        const code = await totp(config, now);
        if (generation !== otpGeneration || !widget.isConnected) return;
        widget.dataset.otpCounter = String(counter);
        widget.dataset.otpCode = code;
        widget.querySelector('.otp-code').textContent =
          code.slice(0, code.length / 2) + ' ' + code.slice(code.length / 2);
      }
      widget.querySelector('.countdown small').textContent = Math.ceil(remaining);
      widget
        .querySelector('.countdown')
        .setAttribute('aria-label', html`${Math.ceil(remaining)} 秒后更新`);
      widget.querySelector('.ring-progress').style.strokeDashoffset = String(
        97.4 * (1 - remaining / config.period),
      );
      widget.classList.toggle('expiring', remaining < 6);
    } catch {
      widget.querySelector('.otp-code').textContent = t('密钥无效');
      widget.querySelector('.countdown').hidden = true;
    } finally {
      config?.secret.fill(0);
    }
  }
}
function showModal(content) {
  quickSearch.close(false);
  modal.innerHTML = content;
  if (modal.querySelector('#idle-select'))
    modal.querySelector('.modal-heading').insertAdjacentHTML('afterend', languagePicker());
  if (!modal.open) modal.showModal();
  modal.querySelector('input:not([type=hidden]),textarea,button')?.focus();
}
function closeModal() {
  pendingMerge = null;
  importWizard.reset();
  closeGenerator();
  modal.close();
  modal.innerHTML = '';
  editCard = null;
  editFields = [];
  restorePreview?.credential?.fill(0);
  restorePreview = null;
}
const modalHeader = (title, caption = '') =>
  `<div class="modal-heading"><div><h2 id="modal-title">${title}</h2>${caption ? `<p>${caption}</p>` : ''}</div>${iconButton('close-modal', t('关闭'), 'close')}</div>`;
const importWizard = createImportWizard({
  dialog: modal,
  getDoc: () => state.doc,
  show: showModal,
  close: closeModal,
  commit: async (plan) => {
    const imported = applyImport(state.doc, plan);
    state.dirty = true;
    state.section = 'all';
    state.search = '';
    state.selected = imported[0]?.getAttribute('id') || null;
    closeModal();
    render();
    toast(t('已导入 {count} 个条目，请保存数据库', { count: imported.length }));
  },
});
function showPassword(mode) {
  const create = mode === 'create' || mode === 'set-password';
  const change = mode === 'set-password' && !state.demo;
  const acknowledge = mode === 'create' || (mode === 'set-password' && state.demo);
  const title =
    mode === 'create' || (mode === 'set-password' && state.demo)
      ? t('为密码库设置主密码')
      : mode === 'set-password'
        ? t('更改主密码')
        : t('欢迎回来');
  const caption =
    mode === 'create' || mode === 'set-password'
      ? t('请牢记主密码，它是解开这个密码库的钥匙。')
      : t('输入主密码，在此设备上解锁你的密码库。');
  const passwordLabel = mode === 'set-password' ? t('新主密码') : t('主密码');
  showModal(
    html`<form id="password-form" data-mode="${mode}">${modalHeader(title, caption)}<div class="password-vault">${icon('lock', 26)}<div><strong>${e(state.name || t('新密码库'))}</strong><small>SafeInCloud 兼容数据库</small></div></div>${mode === 'create' ? t('<label class="form-label">密码库名称<input name="name" value="我的密码库" maxlength="100" required></label>') : ''}${change ? `<label class="form-label">${t('当前主密码')}<input name="current" type="password" autocomplete="current-password" required></label>` : ''}<label class="form-label">${passwordLabel}<div class="password-input"><input name="password" type="password" autocomplete="${create ? 'new-password' : 'current-password'}" ${create ? 'minlength="8"' : ''} required autofocus>${iconButton('toggle-master', t('显示或隐藏主密码'), 'eye')}</div></label>${create ? html`<div class="strength-meter" id="master-strength" data-score="0"><span><i></i></span><small></small></div><p class="form-help">${t('主密码无法找回，请务必妥善保管。')}</p><label class="form-label">${t('确认主密码')}<input name="confirm" type="password" autocomplete="new-password" minlength="8" required></label><p class="form-help">${t('至少 8 个字符。新密码库使用支持完整 Unicode 的版本 2 格式。')}</p>` : ''}${acknowledge ? html`<label class="checkbox-row"><input type="checkbox" name="acknowledge" required>${t('我确认主密码无法找回')}</label>` : ''}${acknowledge ? html`<p class="form-help">${t('创建后可在偏好设置下载恢复工具包。')}</p>` : ''}<p class="form-error" id="password-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button class="button primary" type="submit">${icon(create ? 'check' : 'lock')}<span>${create ? t('确认并继续') : t('解锁密码库')}</span></button></div></form>`,
  );
  const passwordInput = modal.querySelector('[name=password]');
  const meter = modal.querySelector('#master-strength');
  if (meter && passwordInput) {
    const update = () => {
      const result = passwordStrength(passwordInput.value);
      meter.dataset.score = String(result.score);
      meter.querySelector('i').style.width = `${(result.score + 1) * 20}%`;
      meter.querySelector('small').textContent = `${t('主密码强度')}：${t(result.label)}${
        result.suggestions.length ? ' · ' + t(result.suggestions[0]) : ''
      }`;
    };
    passwordInput.addEventListener('input', update);
    update();
  }
}
async function openFile() {
  if (state.dirty && !(await askDiscard())) return;
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          { description: t('SafeInCloud 数据库'), accept: { 'application/octet-stream': ['.db'] } },
        ],
        multiple: false,
      });
      await acceptFile(await handle.getFile(), handle);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (error.name !== 'SecurityError') {
        toast(message(error));
        return;
      }
    }
  }
  $('#file-input').value = '';
  $('#file-input').click();
}
async function acceptFile(file, handle = null, recentId = null) {
  if (file.size > 64 * 1024 * 1024) throw new Error(t('文件超过 64 MB，请使用桌面客户端处理'));
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 5 || bytes[1] !== 5) throw new Error(t('请选择 SafeInCloud 格式的 .db 文件'));
  const hash = await fingerprint(bytes);
  state.generation++;
  wipeUnlocked();
  state.encrypted = bytes;
  state.name = file.name;
  state.handle = handle;
  state.recentId = recentId;
  state.signature = hash;
  state.lastSaved = null;
  state.lastExported = null;
  state.saveError = false;
  state.dirty = false;
  state.demo = false;
  state.selected = null;
  state.mobileDetail = false;
  state.section = 'all';
  state.search = '';
  render();
  showPassword('unlock');
}
function wipeUnlocked() {
  quickSearch.close(false);
  clearTimeout(searchTimer);
  state.credential?.fill(0);
  state.credential = null;
  state.doc = null;
  state.listLimit = 200;
  state.securityFilter = null;
  state.baseXml = null;
  batchMode = false;
  batchSelection.clear();
  state.externalChange = false;
  otpGeneration++;
}
async function submitPassword(form) {
  const mode = form.dataset.mode,
    password = form.elements.password.value,
    confirm = form.elements.confirm?.value;
  const errorBox = $('#password-error');
  if (confirm !== undefined && confirm !== password) {
    errorBox.textContent = t('两次输入的密码不一致');
    return;
  }
  if (
    (mode === 'create' || (mode === 'set-password' && state.demo)) &&
    !form.elements.acknowledge?.checked
  ) {
    errorBox.textContent = t('请确认主密码无法找回');
    return;
  }
  if (mode === 'set-password' && form.elements.current) {
    const current = passwordBytes(form.elements.current.value, state.version);
    let valid = Boolean(state.credential && current.length === state.credential.length);
    if (valid) {
      let difference = 0;
      for (let index = 0; index < current.length; index++)
        difference |= current[index] ^ state.credential[index];
      valid = difference === 0;
    }
    current.fill(0);
    if (!valid) {
      errorBox.textContent = t('当前主密码不正确');
      return;
    }
  }
  const generation = state.generation;
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  submit.textContent = t('正在处理…');
  try {
    if (mode === 'unlock') {
      const result = await decryptDatabase(state.encrypted, password);
      if (generation !== state.generation) {
        result.credential.fill(0);
        return;
      }
      try {
        state.doc = parseVault(result.xml);
      } catch (error) {
        result.credential.fill(0);
        throw error;
      }
      state.baseXml = serializeVault(state.doc);
      state.credential = result.credential;
      state.version = result.version;
      if (state.handle || state.signature) void rememberFile();
    } else if (mode === 'create') {
      state.generation++;
      wipeUnlocked();
      state.doc = parseVault('<database/>');
      state.version = 2;
      state.credential = passwordBytes(password, 2);
      state.encrypted = null;
      state.name = (form.elements.name.value.trim() || t('我的密码库')) + '.db';
      state.handle = null;
      state.recentId = null;
      state.signature = null;
      state.lastSaved = null;
      state.lastExported = null;
      state.saveError = false;
      state.demo = false;
      state.dirty = true;
      state.selected = null;
      state.section = 'all';
    } else {
      state.credential?.fill(0);
      state.credential = passwordBytes(password, 2);
      state.version = 2;
      state.demo = false;
      state.dirty = true;
    }
    state.lastActivity = Date.now();
    closeModal();
    render();
    if (mode === 'unlock') showQuickSearch();
    if (mode === 'set-password') await saveFile(false);
  } catch (error) {
    errorBox.textContent = message(error);
    submit.disabled = false;
    submit.textContent = t('重试');
  }
}
function selectedCard() {
  return state.doc && cards(state.doc).find((card) => card.getAttribute('id') === state.selected);
}
function markDirty() {
  state.dirty = true;
  render();
}
function showEditor(card = null, addOTP = false) {
  editCard = card;
  editFields = card ? fields(card).map((field) => field.cloneNode(true)) : [];
  if (!card && !addOTP) {
    const dummy = newCard(state.doc);
    setField(dummy, t('账号'), '', 'login');
    setField(dummy, t('密码'), '', 'password');
    setField(dummy, t('网站'), '', 'website');
    editFields = fields(dummy);
  }
  if (addOTP) {
    const dummy = newCard(state.doc);
    editFields.push(setField(dummy, t('两步验证码'), '', 'one_time_password'));
  }
  const chosenLabels = card
    ? children(card, 'label_id').map((el) => el.textContent)
    : state.section.startsWith('label:')
      ? [state.section.slice(6)]
      : [];
  showModal(
    html`<form id="editor-form">${modalHeader(card ? t('编辑条目') : addOTP ? t('添加验证器') : t('新建条目'), t('把重要的信息，妥善收在一起。'))}<label class="form-label">条目名称<input name="title" required maxlength="200" value="${e(card ? title(card) : '')}" placeholder="例如 GitHub、Google"></label><div class="editor-section-heading"><span>字段</span>${button('generate', t('生成密码'), 'sparkle', 'text-button')}</div><div id="editor-fields">${editFields.map((field, index) => fieldEditor(field, index)).join('')}</div><div class="add-field-actions">${button('add-field', t('添加字段'), 'plus', 'text-button')}${button('editor-add-otp', t('添加双重验证'), 'shield', 'text-button')}</div><label class="form-label">备注<textarea name="notes" rows="3" placeholder="添加一些备注…">${e(card ? children(card, 'notes')[0]?.textContent || '' : '')}</textarea></label>${
      labels().length
        ? html`<div class="form-label">标签<div class="label-options">${labels()
            .map(
              (label) =>
                `<label><input type="checkbox" name="labels" value="${e(label.getAttribute('id'))}" ${chosenLabels.includes(label.getAttribute('id')) ? 'checked' : ''}>${e(label.getAttribute('name'))}</label>`,
            )
            .join('')}</div></div>`
        : ''
    }<p class="form-error" id="editor-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button type="submit" class="button primary">${icon('check')}保存条目</button></div></form>`,
  );
  modal
    .querySelector('.add-field-actions')
    ?.insertAdjacentHTML(
      'beforeend',
      button('qr-import', t('导入二维码图片'), 'upload', 'text-button'),
    );
  modal
    .querySelector('.add-field-actions')
    ?.insertAdjacentHTML(
      'beforeend',
      button('add-website', t('添加网站地址'), 'plus', 'text-button'),
    );
  if (addOTP) modal.querySelector('.editor-field:last-child textarea')?.focus();
}
const types = () => ({
  login: t('账号'),
  password: t('密码'),
  website: t('网站'),
  email: t('邮箱'),
  text: t('文本'),
  one_time_password: t('双重验证'),
  pin: 'PIN',
  secret: t('私密文本'),
  phone: t('电话'),
  number: t('数字'),
  date: t('日期'),
  expiry: t('有效期'),
  application: t('应用'),
  binary: t('二进制'),
});
function fieldEditor(field, index) {
  const type = fieldType(field),
    secret = ['password', 'pin', 'secret', 'one_time_password'].includes(type);
  return html`<div class="editor-field" data-index="${index}"><div class="editor-field-head"><input aria-label="字段名称" class="field-name-input" value="${e(field.getAttribute('name') || '')}" placeholder="字段名称"><select aria-label="字段类型">${Object.entries(
    types(),
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${type === key ? 'selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}${types()[type] ? '' : `<option value="${e(type)}" selected>${e(type)}</option>`}</select>${iconButton('remove-field', t('删除字段'), 'close')}</div>${type === 'one_time_password' ? html`<textarea class="field-input" rows="2" aria-label="验证密钥" placeholder="Base32 密钥或 otpauth://totp/…" autocomplete="off">${e(field.textContent)}</textarea><small class="form-help">支持 SHA1 / SHA256 / SHA512、6 / 8 位及自定义周期。与 SafeInCloud 共用时请使用 30 秒周期。</small>` : html`<div class="password-input"><input class="field-input" aria-label="字段内容" type="${secret ? 'password' : 'text'}" autocomplete="off" value="${e(field.textContent)}" ${type === 'binary' ? 'readonly' : ''}>${secret ? iconButton('toggle-field', t('显示或隐藏内容'), 'eye') : ''}</div>`}</div>`;
}
function collectEditor(validate = true) {
  const form = $('#editor-form');
  if (!form) return;
  const card = editCard || newCard(state.doc);
  const updated = [];
  for (const row of modal.querySelectorAll('.editor-field')) {
    const original = editFields[Number(row.dataset.index)];
    const field = original.cloneNode(true),
      name = row.querySelector('.field-name-input').value,
      type = row.querySelector('select').value,
      value = row.querySelector('.field-input').value;
    if (validate && type === 'one_time_password' && value.trim()) {
      const config = parseOTP(value);
      config.secret.fill(0);
    }
    field.setAttribute('name', name);
    field.setAttribute('type', type);
    field.removeAttribute('password');
    if (value !== original.textContent) {
      field.textContent = value;
      field.removeAttribute('hash');
      field.removeAttribute('score');
    }
    updated.push(field);
  }
  card.setAttribute('title', form.elements.title.value.trim() || t('未命名条目'));
  fields(card).forEach((field) => field.remove());
  updated.forEach((field) => card.append(field));
  let notes = children(card, 'notes')[0];
  if (!notes) {
    notes = state.doc.createElement('notes');
    card.append(notes);
  }
  notes.textContent = form.elements.notes.value;
  children(card, 'label_id').forEach((label) => label.remove());
  form.querySelectorAll('[name=labels]:checked').forEach((input) => {
    const label = state.doc.createElement('label_id');
    label.textContent = input.value;
    card.append(label);
  });
  touch(card);
  if (!editCard) state.doc.documentElement.append(card);
  state.selected = card.getAttribute('id');
  state.mobileDetail = true;
  state.dirty = true;
  return card;
}
async function saveFile(asCopy = false) {
  if (!state.doc || state.busy) return;
  if (state.demo) {
    showPassword('set-password');
    return;
  }
  const shouldSnapshot = state.dirty,
    previousName = state.name;
  state.busy = true;
  render();
  try {
    // Obtain pickers in the user activation before awaiting encryption.
    let handle = asCopy ? null : state.handle;
    if ((asCopy || !handle) && 'showSaveFilePicker' in window) {
      // showSaveFilePicker resolves to one handle; showOpenFilePicker resolves to an array.
      handle = await window.showSaveFilePicker({
        suggestedName: state.name || 'SafeInCloud.db',
        types: [
          { description: t('SafeInCloud 数据库'), accept: { 'application/octet-stream': ['.db'] } },
        ],
      });
    }
    if (handle) await allowFile(handle, 'readwrite');
    if (handle && !backupDirectory) {
      // An opened file is nonempty. Request backup access directly from this
      // save gesture, before encryption consumes transient user activation.
      if (
        (state.handle && (handle === state.handle || (await handle.isSameEntry?.(state.handle)))) ||
        (await readBytes(handle)).length
      ) {
        toast(t('首次写回需要选择加密备份目录，之后保存会自动备份'));
        if (!(await chooseBackupDirectory(false)))
          throw new Error(t('未选择备份目录，更改尚未写入数据库'));
      }
    }
    const bytes = await encryptDatabase(serializeVault(state.doc), state.credential, state.version);
    if (handle) {
      const same =
        state.handle && (handle === state.handle || (await handle.isSameEntry?.(state.handle)));
      const existing = await readBytes(handle);
      if (existing.length && !backupDirectory)
        throw new Error(t('覆盖前请先在设置中选择加密备份目录，或另存到一个新文件'));
      const result = await saveSafely({
        handle,
        bytes,
        expectedHash: same ? state.signature : null,
        directory: backupDirectory,
        name: handle.name,
        retention: backupRetention,
      });
      if (!same) state.recentId = null;
      state.handle = handle;
      state.name = handle.name;
      moveOnboarding(previousName, state.name, !asCopy);
      state.signature = result.hash;
      state.baseXml = serializeVault(state.doc);
      state.lastSaved = Date.now();
      state.lastExported = null;
      void rememberFile();
      toast(
        result.retentionWarning
          ? t('保存已验证，但旧备份清理失败')
          : t('已加密保存并验证数据库文件'),
      );
    } else {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = state.name || 'SafeInCloud.db';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      state.lastExported = Date.now();
      state.lastSaved = null;
      toast(t('已发起加密导出，请确认下载成功；原文件未被写回'));
    }
    // A download cannot prove that the original file was updated.
    state.encrypted = bytes;
    state.dirty = !handle;
    state.saveError = false;
    updateOnboarding({ backup: true });
    if (handle) {
      state.externalChange = false;
      channel?.postMessage({ type: 'saved', name: state.name, signature: state.signature });
    }
    if (shouldSnapshot)
      void snapshotStore.write(state.name, bytes, snapshotRetention).catch(() => {});
  } catch (error) {
    state.saveError = true;
    if (error.code === 'conflict') {
      state.externalChange = true;
      showConflict();
    } else
      toast(
        t('保存失败：') +
          (error.name === 'AbortError' ? t('保存已取消，更改尚未写入数据库') : message(error)),
      );
  } finally {
    state.busy = false;
    render();
  }
}
async function lockVault() {
  if (!state.doc || state.busy) return;
  if ($('#editor-form')) collectEditor(false);
  state.busy = true;
  try {
    if (state.demo) {
      state.encrypted = null;
      state.name = '';
      state.dirty = false;
    } else
      state.encrypted = await encryptDatabase(
        serializeVault(state.doc),
        state.credential,
        state.version,
      );
    state.generation++;
    wipeUnlocked();
    closeModal();
    render();
    channel?.postMessage({ type: 'locked', name: state.name });
    toast(
      state.dirty
        ? t('已锁定；未保存更改已加密保留在当前页面内，关闭页面会丢失')
        : t('密码库已锁定'),
    );
  } catch (error) {
    toast(t('锁定失败：') + message(error));
  } finally {
    state.busy = false;
  }
}
function askDiscard() {
  return new Promise((resolve) => {
    showModal(
      `${modalHeader(t('还有未保存的更改'), t('继续将丢弃当前页面里尚未写入文件的更改。'))}<div class="modal-footer">${button('cancel-discard', t('返回保存'), null, 'button secondary')}${button('confirm-discard', t('丢弃并继续'), null, 'button danger')}</div>`,
    );
    const onClose = () => finish(false);
    const finish = (value) => {
      modal.removeEventListener('cancel', cancel);
      modal.removeEventListener('close', onClose);
      closeModal();
      resolve(value);
    };
    const cancel = (event) => {
      event.preventDefault();
      finish(false);
    };
    modal.addEventListener('cancel', cancel, { once: true });
    modal.addEventListener('close', onClose, { once: true });
    modal.querySelector('[data-action=cancel-discard]').onclick = () => finish(false);
    modal.querySelector('[data-action=confirm-discard]').onclick = () => finish(true);
  });
}
async function copy(text) {
  try {
    await clipboardGuard.write(text);
    toast(clipboardNotice());
  } catch {
    toast(t('复制失败，请检查浏览器剪贴板权限'));
  }
}
let generatorRules = { ...defaultRules },
  generatorTargets = [];
function closeGenerator() {
  const dialog = $('#generator-modal');
  if (dialog) {
    dialog.close();
    dialog.remove();
  }
  generatorTargets = [];
}
function showGenerator() {
  generatorTargets = [...modal.querySelectorAll('.editor-field')].filter(
    (row) => row.querySelector('select').value === 'password',
  );
  if (!generatorTargets.length) {
    toast(t('请先添加密码类型的字段'));
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.id = 'generator-modal';
  dialog.setAttribute('aria-labelledby', 'generator-title');
  dialog.innerHTML = html`<form id="generator-form"><div class="modal-heading"><div><h2 id="generator-title">密码生成器</h2><p>先选择规则，满意后再填入密码。</p></div>${iconButton('generator-cancel', t('关闭密码生成器'), 'close')}</div><label class="form-label">生成预览<textarea id="generated-password" rows="3" readonly spellcheck="false" aria-label="生成的密码"></textarea></label><div class="generator-preview-actions">${button('generator-refresh', t('重新生成'), 'sparkle', 'text-button')}${button('generator-copy', t('复制预览'), 'copy', 'text-button')}</div><label class="form-label" for="generator-length">密码长度</label><div class="generator-length"><input type="range" id="generator-length-range" aria-label="调整密码长度" min="4" max="128" value="${generatorRules.length}"><input type="number" id="generator-length" name="length" aria-label="密码长度" min="4" max="128" step="1" required value="${generatorRules.length}"><span>位</span></div><div class="generator-rules">${[
    ['upper', t('大写字母'), 'A–Z'],
    ['lower', t('小写字母'), 'a–z'],
    ['digits', t('数字'), '0–9'],
    ['symbols', t('特殊符号'), '! @ # …'],
  ]
    .map(
      ([name, label, hint]) =>
        `<label><input type="checkbox" name="${name}" ${generatorRules[name] ? 'checked' : ''}><span>${label}</span><small>${hint}</small></label>`,
    )
    .join(
      '',
    )}</div><label class="generator-option"><input type="checkbox" name="excludeSimilar" ${generatorRules.excludeSimilar ? 'checked' : ''}>排除易混淆字符 <small>i I l L 1 o O 0 |</small></label><label class="form-label">额外排除字符<input name="exclude" value="${e(generatorRules.exclude)}" maxlength="100" placeholder="输入不希望出现在密码中的字符" autocomplete="off"></label>${generatorTargets.length > 1 ? html`<label class="form-label">填入字段<select name="target">${generatorTargets.map((row, index) => `<option value="${index}">${e(row.querySelector('.field-name-input').value || t('密码'))}（${index + 1}）</option>`).join('')}</select></label>` : ''}<p class="form-help">每个已选字符类型至少包含 1 个字符。规则调整只影响预览。</p><p class="form-error" id="generator-error" role="alert"></p><div class="modal-footer">${button('generator-cancel', t('取消'), null, 'button secondary')}<button type="submit" class="button primary">${icon('check')}确定并填入</button></div></form>`;
  document.body.append(dialog);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeGenerator();
  });
  dialog.showModal();
  updateGeneratedPassword();
  dialog.querySelector('[data-action=generator-refresh]').focus();
}
function updateGeneratedPassword() {
  const form = $('#generator-form');
  if (!form) return;
  const rules = {
    length: Number(form.elements.namedItem('length').value),
    exclude: form.elements.exclude.value,
  };
  for (const name of ['upper', 'lower', 'digits', 'symbols', 'excludeSimilar'])
    rules[name] = form.elements.namedItem(name).checked;
  const output = $('#generated-password'),
    error = $('#generator-error'),
    confirm = form.querySelector('[type=submit]');
  try {
    output.value = generatePassword(rules);
    generatorRules = rules;
    error.textContent = '';
    confirm.disabled = false;
  } catch (problem) {
    output.value = '';
    error.textContent = message(problem);
    confirm.disabled = true;
  }
}
async function chooseBackupDirectory(showSettings = true) {
  if (!window.showDirectoryPicker) {
    toast(t('当前浏览器不支持目录备份，请下载加密副本并独立保管'));
    return false;
  }
  try {
    const directory = await window.showDirectoryPicker({
      mode: 'readwrite',
      id: 'clearvault-backups',
    });
    if (
      state.handle &&
      (await directory
        .getFileHandle(state.handle.name)
        .then((h) => h.isSameEntry(state.handle))
        .catch(() => false))
    )
      throw new Error(t('请选择与原密码库不同的备份目录'));
    backupDirectory = directory;
    if (showSettings) settings();
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      if (!showSettings) throw error;
      toast(message(error));
    }
    return false;
  }
}
async function showBackups() {
  if (!backupDirectory) {
    toast(t('请先选择加密备份目录'));
    return;
  }
  const name = state.name,
    generation = state.generation;
  const backups = await listBackups(backupDirectory, name);
  if (generation !== state.generation) return;
  showModal(
    `${modalHeader(t('加密备份'), t('备份使用创建时的主密码；更改主密码不会更新旧备份。'))}<div class="backup-list">${backups.length ? backups.map((backup, index) => `<button class="button secondary" data-backup-index="${index}">${e(new Date(backup.time).toLocaleString(getLocale()))}</button>`).join('') : `<p>${t('此密码库暂无备份')}</p>`}</div><div class="modal-footer">${button('restore-file', t('从文件恢复'), 'folder', 'button secondary')}${button('close-modal', t('关闭'), null, 'button primary')}</div>`,
  );
  modal.querySelectorAll('[data-backup-index]').forEach(
    (button) =>
      (button.onclick = async () => {
        if (state.dirty && !(await askDiscard())) return;
        try {
          const item = backups[Number(button.dataset.backupIndex)];
          await beginRecovery(await readBytes(item.handle), item.name);
        } catch (error) {
          toast(message(error));
        }
      }),
  );
}
async function showSnapshots() {
  if (!snapshotsSupported()) {
    toast(t('当前浏览器不支持本地快照'));
    return;
  }
  const generation = state.generation;
  const snapshots = await snapshotStore.list(state.name);
  if (generation !== state.generation) return;
  showModal(
    `${modalHeader(t('本地加密快照'), t('快照是加密的 .db 密文，恢复时需要当时的主密码。'))}<div class="backup-list">${snapshots.length ? snapshots.map((item, index) => `<button class="button secondary" data-snapshot-index="${index}">${e(new Date(item.time).toLocaleString(getLocale()))}</button>`).join('') : `<p>${t('暂无本地快照')}</p>`}</div><div class="modal-footer">${button('close-modal', t('关闭'), null, 'button primary')}</div>`,
  );
  modal.querySelectorAll('[data-snapshot-index]').forEach((button) => {
    button.onclick = async () => {
      if (state.dirty && !(await askDiscard())) return;
      try {
        const item = snapshots[Number(button.dataset.snapshotIndex)];
        const bytes = await snapshotStore.read(item.name);
        if (!bytes) throw new Error(t('当前浏览器不支持本地快照'));
        await beginRecovery(bytes, item.name);
      } catch (error) {
        toast(message(error));
      }
    };
  });
}
async function pickRecovery() {
  if (state.dirty && !(await askDiscard())) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.db';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 64 * 1024 * 1024) throw new Error(t('文件超过 64 MB，请使用桌面客户端处理'));
      await beginRecovery(new Uint8Array(await file.arrayBuffer()), file.name);
    } catch (error) {
      toast(message(error));
    }
  };
  input.click();
}
async function beginRecovery(bytes, name) {
  closeModal();
  showModal(
    `<form id="recovery-form">${modalHeader(t('解锁备份预览'), t('输入这份备份创建时的主密码。当前文件不会被覆盖。'))}<label class="form-label">${t('主密码')}<input type="password" name="password" autocomplete="current-password" required></label><p class="form-error" role="alert"></p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}<button class="button primary" type="submit">${t('预览恢复')}</button></div></form>`,
  );
  const form = $('#recovery-form'),
    generation = state.generation;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    let result;
    try {
      result = await decryptDatabase(bytes, form.elements.password.value);
      form.elements.password.value = '';
      if (generation !== state.generation || !form.isConnected) {
        result.credential.fill(0);
        return;
      }
      const doc = parseVault(result.xml),
        before = new Map(
          state.doc
            ? cards(state.doc).map((card) => [card.getAttribute('id'), serializeVault(card)])
            : [],
        ),
        after = cards(doc);
      const added = after.filter((card) => !before.has(card.getAttribute('id'))).length;
      const changed = after.filter(
        (card) =>
          before.has(card.getAttribute('id')) &&
          before.get(card.getAttribute('id')) !== serializeVault(card),
      ).length;
      const removed = [...before.keys()].filter(
        (id) => !after.some((card) => card.getAttribute('id') === id),
      ).length;
      showModal(
        `${modalHeader(t('恢复预览'), e(name))}<p>${e(t('条目 {total} · 新增 {added} · 变化 {changed} · 移除 {removed}', { total: after.length, added, changed, removed }))}</p><p class="form-help">${t('比较包含回收站条目。附件与其他 XML 内容会随整库恢复。恢复后请保存为新文件，不覆盖原文件。')}</p><div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}${button('confirm-recovery', t('恢复为新密码库'), 'check', 'button primary')}</div>`,
      );
      restorePreview = { doc, credential: result.credential, version: result.version, bytes, name };
    } catch (error) {
      result?.credential.fill(0);
      if (form.isConnected) {
        form.querySelector('.form-error').textContent = message(error);
        submit.disabled = false;
      }
    }
  };
}
function confirmRecovery() {
  if (!restorePreview) return;
  const recovered = restorePreview;
  restorePreview = null;
  state.generation++;
  wipeUnlocked();
  state.doc = recovered.doc;
  state.credential = recovered.credential;
  state.version = recovered.version;
  state.encrypted = recovered.bytes;
  state.name = recovered.name.replace(/\.db$/i, '') + '-recovered.db';
  state.handle = null;
  state.recentId = null;
  state.signature = null;
  state.demo = false;
  state.dirty = true;
  state.saveError = false;
  state.lastSaved = null;
  state.lastExported = null;
  state.selected = null;
  state.section = 'all';
  state.search = '';
  state.lastActivity = Date.now();
  closeModal();
  render();
}
function downloadRecoveryKit() {
  const now = new Date();
  const text = [
    'ClearVault ' + t('恢复工具包'),
    t('生成时间') + ': ' + now.toLocaleString(getLocale()),
    t('密码库文件') + ': ' + (state.name || t('尚未保存的密码库')),
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
  toast(t('恢复工具包已下载，请打印并妥善保管'));
}
function showInstallHelp() {
  showModal(
    `${modalHeader(t('安装到设备'), t('安装后可离线打开，并在支持的浏览器中从文件管理器打开 .db。'))}<ol class="install-steps"><li>${t('Chrome / Edge 桌面：点击地址栏的安装图标，或打开浏览器菜单选择“安装 ClearVault”。')}</li><li>${t('Android Chrome：打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。')}</li><li>${t('iPhone / iPad Safari：点击分享按钮，选择“添加到主屏幕”。')}</li></ol><p class="form-help">${t('iOS Safari 不支持文件写回和浏览器扩展；请保留加密备份。')}</p><div class="modal-footer">${button('close-modal', t('关闭'), null, 'button primary')}</div>`,
  );
}
function settings() {
  showModal(
    html`${modalHeader(t('偏好设置'), t('简单一点，安心一点。'))}<label class="form-label">无操作自动锁定<select id="idle-select">${[1, 5, 15, 30].map((n) => html`<option value="${n}" ${state.idleMinutes === n ? 'selected' : ''}>${n} 分钟</option>`).join('')}</select></label><label class="form-label">剪贴板自动清除<select id="clipboard-select">${[0, 15, 30, 60].map((n) => `<option value="${n}" ${clipboardGuard.seconds === n ? 'selected' : ''}>${n ? t('{seconds} 秒', { seconds: n }) : t('关闭')}</option>`).join('')}</select></label><p class="form-help">复制账号、密码或验证码后，会尝试在设定时间后清空系统剪贴板；页面失去焦点时可能失败。</p><div class="settings-note">${icon('shield', 23)}<p>密码库只在内存中解密，不写入浏览器存储。离线缓存只包含应用文件。请将更改保存到 .db，关闭页面后需要重新打开文件。</p></div><div class="settings-buttons">${button('save-copy', t('另存为 .db 文件'), 'download', 'button secondary')}${button('recovery-kit', t('恢复工具包'), 'download', 'button secondary')}${button('change-master', t('更改主密码'), 'key', 'button secondary')}${button('clear-recents', t('清除最近使用记录'), 'trash', 'button secondary')}${button('install', t('安装到设备'), 'plus', 'button secondary')}</div><div class="modal-footer">${button('close-modal', t('完成'), null, 'button primary')}</div>`,
  );
  modal
    .querySelector('.settings-buttons')
    .insertAdjacentHTML(
      'afterend',
      `<p><a href="./downloads/" target="_blank" rel="noopener">${t('下载与源代码')}</a> · <a href="${buildInfo.source || './downloads/'}" target="_blank" rel="noopener noreferrer">GitHub · MIT ↗</a></p>`,
    );
  modal
    .querySelector('.settings-buttons')
    .insertAdjacentHTML(
      'afterend',
      `<section class="backup-settings"><h3>${t('保存与恢复')}</h3><p>${t('覆盖前自动保留原始加密文件。目录授权仅在当前页面保留，刷新后需重新选择。')}</p><p><strong>${e(backupDirectory?.name || t('尚未选择备份目录'))}</strong></p><label class="form-label">${t('当前会话保留备份数量')}<select id="backup-retention">${[5, 10, 20, 50].map((n) => `<option ${n === backupRetention ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div class="settings-buttons">${button('backup-directory', t('选择加密备份目录'), 'folder', 'button secondary')}${button('backups', t('查看加密备份'), 'clock', 'button secondary')}${button('restore-file', t('从文件恢复'), 'upload', 'button secondary')}</div><p class="form-help">${t('仅清理当前页面为当前源文件创建的超额备份，同名库与旧会话备份保留。备份请另存独立设备；下载需确认成功。')}</p><h3>${t('本地加密快照')}</h3><p>${t('保存在浏览器本地，加密且不会上传；清除站点数据会删除。')}</p><label class="form-label">${t('保留数量')}<select id="snapshot-retention">${[5, 10, 20, 50].map((n) => `<option value="${n}" ${n === snapshotRetention ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div class="settings-buttons">${button('snapshots', t('查看本地快照'), 'clock', 'button secondary')}${button('clear-snapshots', t('清除本地快照'), 'trash', 'button secondary')}</div><p class="form-help" id="snapshot-status"></p></section>`,
    );
  const note = modal.querySelector('.settings-note p');
  if (note)
    note.textContent = t(
      '密码库只在内存中解密。最近文件记录只保存名称、句柄和你确认的目录标记，可随时清空；重新打开仍需主密码。',
    );
  modal
    .querySelector('.settings-buttons')
    ?.insertAdjacentHTML(
      'beforeend',
      button('import', t('导入密码'), 'upload', 'button secondary'),
    );
  modal
    .querySelector('.modal-footer')
    ?.insertAdjacentHTML(
      'beforebegin',
      `<div id="recent-files">${recentMarkup(recentEntries, recentFiles.persistent, typeof window.showDirectoryPicker === 'function')}</div>`,
    );
  const snapshotStatus = modal.querySelector('#snapshot-status');
  if (snapshotStatus) {
    if (!snapshotsSupported()) snapshotStatus.textContent = t('当前浏览器不支持本地快照');
    else
      void snapshotStore
        .list(state.name)
        .then((snapshots) => {
          if (snapshotStatus.isConnected)
            snapshotStatus.textContent = snapshots.length
              ? t('当前 {count} 份本地快照', { count: snapshots.length })
              : t('暂无本地快照');
        })
        .catch(() => {
          if (snapshotStatus.isConnected)
            snapshotStatus.textContent = t('当前浏览器不支持本地快照');
        });
  }
}
async function action(name, target) {
  if (state.busy && !['copy-field', 'copy-otp'].includes(name)) return;
  const card = selectedCard();
  switch (name) {
    case 'import':
      if (state.doc) importWizard.open();
      break;
    case 'recent-open':
      await openRecent(target.dataset.id);
      break;
    case 'recent-session':
      if (state.encrypted && !state.doc) showPassword('unlock');
      break;
    case 'recent-directory': {
      const entry = recentEntries.find((item) => item.id === target.dataset.id);
      if (!entry?.handle || !window.showDirectoryPicker) break;
      try {
        const directory = await window.showDirectoryPicker({
          mode: 'read',
          id: 'clearvault-recent-directory',
        });
        await recentFiles.setDirectory(entry.id, directory);
        await refreshRecent();
        toast(t('已确认密码库所在目录'));
      } catch (error) {
        if (error.name !== 'AbortError') throw error;
      }
      break;
    }
    case 'recent-remove':
      await recentFiles.remove(target.dataset.id);
      await refreshRecent();
      break;
    case 'recent-clear':
      await recentFiles.clear();
      await refreshRecent();
      toast(t('最近文件记录已清空'));
      break;
    case 'open':
      await openFile();
      break;
    case 'create':
      if (!state.dirty || (await askDiscard())) showPassword('create');
      break;
    case 'demo':
      state.generation++;
      wipeUnlocked();
      state.doc = demoVault();
      state.demo = true;
      state.dirty = false;
      state.name = t('体验密码库.db');
      state.encrypted = null;
      state.handle = null;
      state.section = 'all';
      render();
      break;
    case 'new':
      showEditor(null, state.section === 'otp');
      break;
    case 'edit':
      if (card) showEditor(card);
      break;
    case 'add-otp':
      if (card) showEditor(card, true);
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'toggle-master': {
      const input = modal.querySelector('[name=password]');
      input.type = input.type === 'password' ? 'text' : 'password';
      break;
    }
    case 'toggle-field': {
      const input = target.closest('.password-input').querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
      break;
    }
    case 'add-field':
    case 'add-website':
    case 'editor-add-otp': {
      const dummy = newCard(state.doc);
      const field = setField(
        dummy,
        name === 'editor-add-otp' ? t('两步验证码') : name === 'add-website' ? t('网站') : '',
        '',
        name === 'editor-add-otp'
          ? 'one_time_password'
          : name === 'add-website'
            ? 'website'
            : 'text',
      );
      editFields.push(field);
      $('#editor-fields').insertAdjacentHTML(
        'beforeend',
        fieldEditor(field, editFields.length - 1),
      );
      modal.querySelector('.editor-field:last-child .field-input').focus();
      break;
    }
    case 'remove-field':
      target.closest('.editor-field').remove();
      break;
    case 'qr-import':
      $('#qr-input').value = '';
      $('#qr-input').click();
      break;
    case 'generate':
      showGenerator();
      break;
    case 'generator-refresh':
      updateGeneratedPassword();
      break;
    case 'generator-cancel':
      closeGenerator();
      break;
    case 'generator-copy':
      if ($('#generated-password')?.value) await copy($('#generated-password').value);
      break;
    case 'save':
      await saveFile();
      break;
    case 'save-copy':
      closeModal();
      await saveFile(true);
      break;
    case 'recovery-kit':
      downloadRecoveryKit();
      break;
    case 'clear-recents':
      clearRecentEntries();
      break;
    case 'backup-directory':
      await chooseBackupDirectory();
      break;
    case 'backups':
      await showBackups();
      break;
    case 'snapshots':
      await showSnapshots();
      break;
    case 'clear-snapshots':
      if (!snapshotsSupported()) {
        toast(t('当前浏览器不支持本地快照'));
        break;
      }
      showModal(
        `${modalHeader(t('清除本地快照'), t('这将删除当前密码库的本地加密快照，无法撤销。'))}<div class="modal-footer">${button('close-modal', t('取消'), null, 'button secondary')}${button('confirm-clear-snapshots', t('清除'), null, 'button danger')}</div>`,
      );
      break;
    case 'confirm-clear-snapshots': {
      const count = await snapshotStore.clear(state.name);
      closeModal();
      toast(t('已清除 {count} 份本地快照', { count }));
      break;
    }
    case 'restore-file':
      await pickRecovery();
      break;
    case 'confirm-recovery':
      confirmRecovery();
      break;
    case 'change-master':
      showPassword('set-password');
      break;
    case 'lock':
      await lockVault();
      break;
    case 'copy-field':
      if (card) {
        await copy(fields(card)[Number(target.dataset.index)].textContent);
        recordRecent(card.getAttribute('id'));
      }
      break;
    case 'copy-otp': {
      const item = cards(state.doc).find((c) => c.getAttribute('id') === target.dataset.id);
      const config = parseOTP(fields(item)[Number(target.dataset.index)].textContent);
      try {
        await copy(await totp(config));
        recordRecent(item.getAttribute('id'));
      } finally {
        config.secret.fill(0);
      }
      break;
    }
    case 'reveal': {
      const field = fields(card)[Number(target.dataset.index)],
        value = document.querySelector(`[data-value-index="${target.dataset.index}"]`);
      const revealed = value.dataset.revealed === 'true';
      value.textContent = revealed ? '••••••••••••' : field.textContent;
      value.dataset.revealed = String(!revealed);
      target.setAttribute('aria-pressed', String(!revealed));
      break;
    }
    case 'star':
      if (card) {
        card.setAttribute('star', card.getAttribute('star') === 'true' ? 'false' : 'true');
        touch(card);
        markDirty();
      }
      break;
    case 'archive':
      if (card) {
        card.setAttribute('archived', isArchived(card) ? 'false' : 'true');
        touch(card);
        markDirty();
      }
      break;
    case 'delete':
      if (card) {
        card.setAttribute('deleted', 'true');
        touch(card);
        markDirty();
        toast(t('已移至回收站，可随时恢复'));
      }
      break;
    case 'restore':
      if (card) {
        card.removeAttribute('deleted');
        card.removeAttribute('archived');
        touch(card);
        markDirty();
        toast(t('已恢复条目'));
      }
      break;
    case 'settings':
      settings();
      break;
    case 'info':
      toast(
        html`${state.name} · 格式版本 ${state.version} · ${state.demo ? t('演示模式') : t('本地解密')}`,
      );
      break;
    case 'quick-search':
      showQuickSearch();
      break;
    case 'more': {
      const list = document.querySelector('.entry-list'),
        more = list?.querySelector('.more-entries');
      if (!list || !more) break;
      const visible = filteredCards(),
        start = state.listLimit;
      state.listLimit += 200;
      more.insertAdjacentHTML(
        'beforebegin',
        visible
          .slice(start, state.listLimit)
          .map((card) => renderRow(card))
          .join(''),
      );
      const remaining = visible.length - state.listLimit;
      if (remaining > 0) more.textContent = t('显示更多（还有 {count} 条）', { count: remaining });
      else more.remove();
      void refreshCodes();
      break;
    }
    case 'conflict-save-copy':
      closeModal();
      await saveFile(true);
      break;
    case 'conflict-reload':
      closeModal();
      await reloadFromDisk();
      break;
    case 'merge-external':
      await mergeExternalChanges();
      break;
    case 'merge-reveal':
      modal.querySelectorAll('.merge-secret').forEach((element) => {
        element.textContent = element.dataset.value || '';
        element.classList.remove('merge-secret');
      });
      target.remove();
      break;
    case 'merge-apply': {
      if (!pendingMerge) break;
      const merge = pendingMerge;
      pendingMerge = null;
      const choices = {};
      for (const conflict of merge.result.conflicts) {
        const section = modal.querySelector(`[data-merge-card="${conflict.id}"]`);
        if (!section) continue;
        const fields = {};
        conflict.fields.forEach((field, index) => {
          const input = section.querySelector(
            `input[name="merge-${conflict.id}-${index}"]:checked`,
          );
          if (input) fields[field.key] = input.value;
        });
        choices[conflict.id] = fields;
      }
      const final = mergeVaults(merge.baseDoc, merge.localDoc, merge.externalDoc, choices);
      state.doc = final.doc;
      state.encrypted = merge.bytes;
      state.signature = merge.hash;
      state.baseXml = serializeVault(merge.externalDoc);
      state.dirty = true;
      state.externalChange = false;
      state.saveError = false;
      state.lastSaved = null;
      state.lastExported = null;
      state.selected = null;
      state.mobileDetail = false;
      closeModal();
      render();
      toast(t('已合并外部更改，请保存数据库'));
      break;
    }
    case 'security-overview':
      showSecurityOverview();
      break;
    case 'manage-labels':
      showLabelManager();
      break;
    case 'label-rename': {
      const label = labelById(target.dataset.id);
      if (label) renameLabelForm(label);
      break;
    }
    case 'label-merge': {
      const label = labelById(target.dataset.id);
      if (label) mergeLabelForm(label);
      break;
    }
    case 'label-delete': {
      const label = labelById(target.dataset.id);
      if (label) deleteLabelForm(label);
      break;
    }
    case 'security-filter':
      closeModal();
      state.section = 'all';
      state.search = '';
      state.securityFilter = target.dataset.filter || null;
      batchMode = false;
      batchSelection.clear();
      state.selected = null;
      state.mobileDetail = false;
      render();
      break;
    case 'clear-security-filter':
      state.securityFilter = null;
      batchMode = false;
      batchSelection.clear();
      render();
      break;
    case 'batch-start':
      batchMode = true;
      batchSelection.clear();
      state.selected = null;
      state.mobileDetail = false;
      render();
      break;
    case 'batch-cancel':
      batchMode = false;
      batchSelection.clear();
      render();
      break;
    case 'batch-clear':
      batchSelection.clear();
      document.querySelectorAll('[data-batch-select]').forEach((input) => {
        input.checked = false;
        input.closest('.entry-row')?.classList.remove('batch-selected');
      });
      updateBatchCount();
      break;
    case 'batch-select-all':
      for (const card of filteredCards()) batchSelection.add(card.getAttribute('id'));
      document.querySelectorAll('[data-batch-select]').forEach((input) => {
        input.checked = true;
        input.closest('.entry-row')?.classList.add('batch-selected');
      });
      updateBatchCount();
      break;
    case 'batch-label':
      showBatchLabel();
      break;
    case 'batch-archive':
      applyBatch((card) => card.setAttribute('archived', 'true'), '已归档 {count} 个条目');
      break;
    case 'batch-trash':
      applyBatch((card) => card.setAttribute('deleted', 'true'), '已将 {count} 个条目移至回收站');
      break;
    case 'onboarding-import':
      if (state.doc) importWizard.open();
      break;
    case 'onboarding-otp':
      showEditor(null, true);
      break;
    case 'onboarding-backup':
      settings();
      break;
    case 'onboarding-dismiss':
      updateOnboarding({ dismissed: true });
      render();
      break;
    case 'clear-search':
      state.search = '';
      state.listLimit = 200;
      render();
      break;
    case 'back-list':
      state.mobileDetail = false;
      render();
      break;
    case 'add-label':
      showModal(
        html`<form id="label-form">${modalHeader(t('新建标签'))}<label class="form-label">标签名称<input name="label" required maxlength="80" placeholder="例如 工作、生活"></label><div class="modal-footer"><button class="button primary" type="submit">创建标签</button></div></form>`,
      );
      break;
    case 'install':
      if (state.install) {
        await state.install.prompt();
        state.install = null;
        render();
      } else showInstallHelp();
      break;
  }
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action], [data-section], [data-select]');
  if (!target) return;
  if (target.dataset.action) {
    event.preventDefault();
    if (['cancel-discard', 'confirm-discard'].includes(target.dataset.action)) return;
    action(target.dataset.action, target).catch((error) => toast(message(error)));
  } else if (!state.busy && target.dataset.section) {
    clearTimeout(searchTimer);
    state.section = target.dataset.section;
    state.search = '';
    state.securityFilter = null;
    batchMode = false;
    batchSelection.clear();
    state.listLimit = 200;
    state.selected = null;
    state.mobileDetail = false;
    render();
  } else if (target.dataset.select) {
    clearTimeout(searchTimer);
    if (batchMode)
      setBatchSelected(target.dataset.select, !batchSelection.has(target.dataset.select));
    else {
      recordRecent(target.dataset.select);
      state.selected = target.dataset.select;
      state.mobileDetail = true;
      render();
    }
  }
});
document.addEventListener('keydown', (event) => {
  if (event.isComposing || event.keyCode === 229) return;
  const command = event.metaKey || event.ctrlKey;
  if (command && event.shiftKey && event.key.toLowerCase() === 'l' && state.doc) {
    event.preventDefault();
    void lockVault();
    return;
  }
  if (command && !event.shiftKey && event.key.toLowerCase() === 'k' && state.doc) {
    event.preventDefault();
    showQuickSearch();
  }
  if (command && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (!modal.open && !quickSearch.isOpen) saveFile();
  }
  if (event.key === 'Enter' && event.target.matches('[data-select]')) {
    clearTimeout(searchTimer);
    if (batchMode)
      setBatchSelected(
        event.target.dataset.select,
        !batchSelection.has(event.target.dataset.select),
      );
    else {
      recordRecent(event.target.dataset.select);
      state.selected = event.target.dataset.select;
      state.mobileDetail = true;
      render();
    }
  }
});
const composingSearchInputs = new WeakSet();
function updateSearch(input) {
  if (input !== $('#search') || input.value === state.search) return;
  const { selectionStart, selectionEnd, selectionDirection } = input;
  const value = input.value;
  const apply = () => {
    state.search = value;
    state.listLimit = 200;
    render();
    const search = $('#search');
    if (!search) return;
    search.focus({ preventScroll: true });
    try {
      search.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
    } catch {}
  };
  clearTimeout(searchTimer);
  if (state.doc && cards(state.doc).length > 500) searchTimer = setTimeout(apply, 120);
  else apply();
}
document.addEventListener('compositionstart', (event) => {
  if (event.target.id === 'search') composingSearchInputs.add(event.target);
});
document.addEventListener('compositionend', (event) => {
  if (event.target.id !== 'search') return;
  composingSearchInputs.delete(event.target);
  updateSearch(event.target);
});
document.addEventListener('input', (event) => {
  if (
    event.target.closest('#generator-form') &&
    !event.target.matches('[name=target], #generated-password')
  ) {
    if (event.target.id === 'generator-length-range')
      $('#generator-length').value = event.target.value;
    if (event.target.id === 'generator-length')
      $('#generator-length-range').value = event.target.value;
    updateGeneratedPassword();
  }
  if (event.target.id === 'search') {
    // IMEs must keep their original focused element until text is committed.
    if (event.isComposing || composingSearchInputs.has(event.target)) return;
    updateSearch(event.target);
  }
});
document.addEventListener('change', (event) => {
  if (event.target.dataset.batchSelect) {
    setBatchSelected(event.target.dataset.batchSelect, event.target.checked);
    return;
  }
  if (event.target.dataset.onboarding) {
    updateOnboarding({ [event.target.dataset.onboarding]: event.target.checked });
    render();
  }
  if (event.target.matches('[data-language]')) {
    const preferencesOpen = Boolean(modal.open && modal.querySelector('#idle-select'));
    setLanguage(event.target.value);
    render();
    if (preferencesOpen) settings();
  }
  if (event.target.id === 'idle-select') state.idleMinutes = Number(event.target.value);
  if (event.target.id === 'clipboard-select') {
    const seconds = Number(event.target.value);
    clipboardGuard.setSeconds(seconds);
    try {
      globalThis.localStorage?.setItem(CLIPBOARD_KEY, String(seconds));
    } catch {
      /* Keep the preference for this page when storage is unavailable. */
    }
  }
  if (event.target.id === 'backup-retention') backupRetention = Number(event.target.value);
  if (event.target.id === 'snapshot-retention') {
    snapshotRetention = Number(event.target.value);
    try {
      globalThis.localStorage?.setItem(SNAPSHOT_KEY, String(snapshotRetention));
    } catch {
      /* Keep the setting for this session when storage is unavailable. */
    }
  }
  if (event.target.matches('.editor-field select')) {
    const row = event.target.closest('.editor-field'),
      index = Number(row.dataset.index),
      temp = editFields[index].cloneNode(true);
    temp.setAttribute('name', row.querySelector('.field-name-input').value);
    temp.setAttribute('type', event.target.value);
    temp.removeAttribute('password');
    temp.textContent = row.querySelector('.field-input').value;
    row.outerHTML = fieldEditor(temp, index);
  }
});
document.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'generator-form') {
    const target = generatorTargets[Number(form.elements.namedItem('target')?.value || 0)];
    const value = $('#generated-password').value;
    if (value && target?.isConnected && !form.querySelector('[type=submit]').disabled) {
      target.querySelector('.field-input').value = value;
      closeGenerator();
      target.querySelector('.field-input').focus();
    }
  }
  if (form.id === 'password-form') submitPassword(form);
  if (form.id === 'editor-form') {
    if (state.busy) return;
    try {
      collectEditor();
      closeModal();
      render();
      if (state.handle && !state.demo) void saveFile();
      else toast(t('条目已更新，请保存数据库'));
    } catch (error) {
      $('#editor-error').textContent = message(error);
    }
  }
  if (form.id === 'label-form') {
    const name = form.elements.label.value.trim();
    if (!name) return;
    const item = newCard(state.doc),
      label = state.doc.createElement('label');
    for (const attr of item.attributes) label.setAttribute(attr.name, attr.value);
    label.removeAttribute('type');
    label.setAttribute('name', name);
    state.doc.documentElement.append(label);
    closeModal();
    markDirty();
  }
});
modal.addEventListener('cancel', (event) => {
  if (event.target !== modal) return;
  event.preventDefault();
  if (!state.busy) closeModal();
});
$('#file-input').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) acceptFile(file).catch((error) => toast(message(error)));
});
$('#qr-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file || !$('#editor-form')) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error(t('请使用小于 20 MB 的二维码图片'));
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = window.jsQR(data.data, data.width, data.height, {
      inversionAttempts: 'attemptBoth',
    });
    canvas.width = 0;
    canvas.height = 0;
    if (!result || !/^otpauth:\/\/totp\//i.test(result.data))
      throw new Error(t('没有识别到 TOTP 二维码，请尝试更清晰的图片或手动粘贴密钥'));
    const config = parseOTP(result.data);
    config.secret.fill(0);
    if (!$('#editor-form')) return;
    let row = [...modal.querySelectorAll('.editor-field')].find(
      (row) =>
        row.querySelector('select').value === 'one_time_password' &&
        !row.querySelector('.field-input').value,
    );
    if (!row) {
      const dummy = newCard(state.doc),
        field = setField(dummy, t('两步验证码'), '', 'one_time_password');
      editFields.push(field);
      $('#editor-fields').insertAdjacentHTML(
        'beforeend',
        fieldEditor(field, editFields.length - 1),
      );
      row = modal.querySelector('.editor-field:last-child');
    }
    row.querySelector('.field-input').value = result.data;
    const form = $('#editor-form');
    if (!form.elements.title.value.trim())
      form.elements.title.value = config.issuer || config.account || t('验证器');
    toast(t('已识别验证密钥，保存条目即可生成验证码'));
  } catch (error) {
    toast(message(error));
  }
});
window.addEventListener('beforeunload', (event) => {
  if (state.dirty || $('#editor-form')) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.install = event;
  if (!modal.open) render();
});
for (const name of ['pointerdown', 'keydown', 'touchstart'])
  document.addEventListener(
    name,
    () => {
      state.lastActivity = Date.now();
    },
    { passive: true },
  );
setInterval(() => {
  if (state.doc) {
    if (Date.now() - state.lastActivity > state.idleMinutes * 60000 && !state.busy) lockVault();
    else refreshCodes();
  }
}, 500);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.doc && Date.now() - state.lastActivity > state.idleMinutes * 60000)
    lockVault();
  if (!document.hidden) void checkExternalChange();
});
window.addEventListener('focus', () => {
  if (state.doc) void checkExternalChange();
});
if ('launchQueue' in window && 'setConsumer' in window.launchQueue) {
  window.launchQueue.setConsumer(async (params) => {
    const handle = params.files?.[0];
    if (!handle) return;
    try {
      if (state.dirty && !(await askDiscard())) return;
      await allowFile(handle);
      await acceptFile(await handle.getFile(), handle);
    } catch (error) {
      toast(message(error));
    }
  });
}
document.addEventListener('dragover', (event) => {
  if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
});
document.addEventListener('drop', async (event) => {
  const file = [...(event.dataTransfer?.files || [])].find((item) => /\.db$/i.test(item.name));
  if (!file) return;
  event.preventDefault();
  if (modal.open) return;
  if (state.dirty && !(await askDiscard())) return;
  try {
    await acceptFile(file);
  } catch (error) {
    toast(message(error));
  }
});
if ('serviceWorker' in navigator)
  navigator.serviceWorker.register('./sw.js').catch(() => toast(t('离线缓存未启用，仍可在线使用')));
if (!crypto.subtle || !('CompressionStream' in window))
  toast(
    t('请使用支持 Web Crypto 和 CompressionStream 的现代浏览器，并通过 HTTPS 或 localhost 打开'),
  );
render();
if (!state.doc && new URLSearchParams(globalThis.location?.search || '').get('demo') === '1')
  void action('demo');
