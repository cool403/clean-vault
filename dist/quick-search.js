import { t } from './i18n.js';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export const modifier = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform || '') ? '⌘' : 'Ctrl';
const RESULT_LIMIT = 50;

// Results contain identifiers and public summaries only. Retrieve a secret only on explicit copy.
export function createQuickSearch({
  items,
  copyPassword,
  copyOTP,
  openEntry,
  lock,
  notify,
  copyNotice,
  commands = [],
}) {
  let dialog,
    results = [],
    selected = 0,
    composing = false,
    previousFocus,
    copying = false,
    commandMode = false,
    total = 0;
  function close(restoreFocus = true) {
    const old = dialog;
    dialog = null;
    results = [];
    copying = false;
    commandMode = false;
    total = 0;
    if (old) {
      old.close();
      old.remove();
    }
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function select(index) {
    selected = index;
    for (const [i, row] of [...dialog.querySelectorAll('[role=option]')].entries()) {
      row.setAttribute('aria-selected', String(i === selected));
      if (i === selected) row.scrollIntoView?.({ block: 'nearest' });
    }
    const input = dialog.querySelector('input');
    if (results.length) input.setAttribute('aria-activedescendant', `quick-result-${selected}`);
    else input.removeAttribute('aria-activedescendant');
    const copyButton = dialog.querySelector('[data-quick-copy]'),
      otpButton = dialog.querySelector('[data-quick-otp]'),
      runButton = dialog.querySelector('[data-quick-run]');
    copyButton.hidden = commandMode;
    otpButton.hidden = commandMode;
    runButton.hidden = !commandMode;
    copyButton.disabled = commandMode || !results[selected]?.hasPassword || copying;
    otpButton.disabled = commandMode || !results[selected]?.hasOTP || copying;
    runButton.disabled = !commandMode || !results[selected];
  }
  function commandSearch(raw) {
    const query = raw.trim().toLocaleLowerCase();
    const available = typeof commands === 'function' ? commands() : commands;
    const matching = available.filter((command) => {
      if (!query) return true;
      return [command.label, command.description, ...(command.keywords || [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);
    });
    total = matching.length;
    results = matching.slice(0, RESULT_LIMIT);
    dialog.querySelector('.quick-scope').textContent = t('命令模式');
    dialog.querySelector('.quick-results').innerHTML = results.length
      ? results
          .map(
            (command, i) =>
              `<div id="quick-result-${i}" role="option" aria-selected="false" data-quick-index="${i}" class="quick-result"><span class="quick-avatar" aria-hidden="true">›</span><span class="quick-result-text"><strong>${escape(command.label)}</strong><small>${escape(command.description || (command.keywords || []).slice(0, 3).join(' · '))}</small></span><span class="quick-result-note">Enter</span></div>`,
          )
          .join('')
      : `<div class="quick-empty">${escape(t('没有找到命令'))}<small>${escape(t('输入 > 查看命令'))}</small></div>`;
    dialog.querySelector('.quick-count').textContent = t('{count} 个命令', { count: total });
    select(0);
  }
  function search() {
    const raw = dialog.querySelector('input').value.trim();
    commandMode = raw.startsWith('>');
    if (commandMode) {
      commandSearch(raw.slice(1));
      return;
    }
    const query = raw.toLocaleLowerCase();
    const matching = items().filter((item) => item.search.toLocaleLowerCase().includes(query));
    matching.sort((a, b) => {
      const left = query && a.title.toLocaleLowerCase().startsWith(query) ? 1 : 0;
      const right = query && b.title.toLocaleLowerCase().startsWith(query) ? 1 : 0;
      return right - left || (b.recent || 0) - (a.recent || 0);
    });
    total = matching.length;
    results = matching.slice(0, RESULT_LIMIT);
    dialog.querySelector('.quick-scope').textContent = t('所有未归档条目 · 仅在本地搜索');
    dialog.querySelector('.quick-results').innerHTML = results.length
      ? results
          .map(
            (item, i) =>
              `<div id="quick-result-${i}" role="option" aria-selected="false" data-quick-index="${i}" class="quick-result"><span class="quick-avatar" aria-hidden="true">${escape([...item.title][0] || '·')}</span><span class="quick-result-text"><strong>${escape(item.title)}</strong><small>${escape(item.subtitle)}</small></span><span class="quick-result-note">${escape(t(item.hasPassword ? '回车查看' : item.hasOTP ? '动态验证码' : '未设置密码'))}</span></div>`,
          )
          .join('')
      : `<div class="quick-empty">${escape(t('没有找到相关条目'))}<small>${escape(t('试试其他关键词'))}</small></div>`;
    dialog.querySelector('.quick-count').textContent =
      t('找到 {count} 个条目', { count: total }) +
      (total > results.length ? ` · ${t('显示前 {count} 条', { count: RESULT_LIMIT })}` : '');
    select(0);
  }
  async function copy() {
    const item = results[selected];
    if (commandMode || !item || !item.hasPassword || copying) return;
    const current = dialog;
    copying = true;
    select(selected);
    try {
      await copyPassword(item.id);
      if (dialog === current) notify(copyNotice ? copyNotice() : t('已复制到剪贴板'));
    } catch {
      if (dialog === current) notify(t('复制失败，请检查浏览器剪贴板权限'));
    } finally {
      if (dialog === current) {
        copying = false;
        select(selected);
      }
    }
  }
  async function copyOtp() {
    const item = results[selected];
    if (commandMode || !item || !item.hasOTP || copying) return;
    const current = dialog;
    copying = true;
    select(selected);
    try {
      await copyOTP(item.id);
      if (dialog === current) notify(copyNotice ? copyNotice() : t('已复制到剪贴板'));
    } catch {
      if (dialog === current) notify(t('复制失败，请检查浏览器剪贴板权限'));
    } finally {
      if (dialog === current) {
        copying = false;
        select(selected);
      }
    }
  }
  function run() {
    if (!commandMode || !results[selected]) return;
    Promise.resolve(results[selected].run()).catch(() => notify(t('操作未完成，请重试')));
  }
  function view() {
    if (commandMode || !results[selected]) return;
    const id = results[selected].id;
    close(false);
    openEntry(id);
  }
  function show() {
    if (dialog) {
      dialog.querySelector('input').focus();
      return;
    }
    previousFocus = document.activeElement;
    dialog = document.createElement('dialog');
    dialog.className = 'quick-dialog';
    dialog.id = 'quick-search-modal';
    dialog.setAttribute('aria-labelledby', 'quick-title');
    dialog.innerHTML = `<div class="quick-heading"><div><span class="quick-eyebrow">CLEARVAULT · QUICK ACCESS</span><h2 id="quick-title">${escape(t('快速查找'))}</h2><p>${escape(t('搜索、复制、锁定，双手不离键盘。'))}</p></div><button type="button" class="icon-button" data-quick-close aria-label="${escape(t('关闭'))}">✕</button></div><div class="quick-search-box"><span aria-hidden="true">⌕</span><input type="text" role="combobox" aria-label="${escape(t('搜索所有条目'))}" aria-autocomplete="list" aria-expanded="true" aria-controls="quick-results" autocomplete="off" spellcheck="false" placeholder="${escape(t('搜索条目、账号或标签…'))}"><kbd>Esc</kbd></div><div class="quick-meta"><span class="quick-scope">${escape(t('所有未归档条目 · 仅在本地搜索'))}</span><span class="quick-count" role="status"></span></div><div id="quick-results" class="quick-results" role="listbox" aria-label="${escape(t('搜索结果'))}"></div><div class="quick-actions"><button type="button" class="button secondary" data-quick-lock>${escape(t('锁定密码库'))}<kbd>${modifier} ⇧ L</kbd></button><button type="button" class="button secondary" data-quick-otp>${escape(t('复制动态验证码'))}<kbd>${modifier} ⇧ ↵</kbd></button><button type="button" class="button primary" data-quick-copy>${escape(t('复制密码'))}<kbd>${modifier} ↵</kbd></button><button type="button" class="button primary" data-quick-run hidden>${escape(t('运行命令'))}<kbd>Enter</kbd></button></div><div class="quick-help"><span><kbd>↑</kbd> <kbd>↓</kbd> ${escape(t('选择条目'))}</span><span><kbd>Enter</kbd> ${escape(t('查看详情'))}</span><span><kbd>Esc</kbd> ${escape(t('关闭'))}</span><span><kbd>&gt;</kbd> ${escape(t('命令模式'))}</span></div>`;
    document.body.append(dialog);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (!composing) close();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-quick-close]')) close();
      else if (event.target.closest('[data-quick-lock]')) void lock();
      else if (event.target.closest('[data-quick-otp]')) void copyOtp();
      else if (event.target.closest('[data-quick-copy]')) void copy();
      else if (event.target.closest('[data-quick-run]')) run();
      else {
        const row = event.target.closest('[data-quick-index]');
        if (row) {
          select(Number(row.dataset.quickIndex));
          if (commandMode) run();
          else dialog.querySelector('input').focus();
        }
      }
    });
    dialog.addEventListener('dblclick', (event) => {
      if (!commandMode && event.target.closest('[data-quick-index]')) view();
    });
    const input = dialog.querySelector('input');
    input.addEventListener('compositionstart', () => {
      composing = true;
    });
    input.addEventListener('compositionend', () => {
      composing = false;
      search();
    });
    input.addEventListener('input', (event) => {
      if (!composing && !event.isComposing) search();
    });
    dialog.addEventListener('keydown', (event) => {
      if (composing || event.isComposing || event.keyCode === 229) {
        event.stopPropagation();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (results.length)
          select(
            (selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length,
          );
      } else if (
        event.key === 'Enter' &&
        (event.target === input || event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        if (commandMode) run();
        else if ((event.ctrlKey || event.metaKey) && event.shiftKey) void copyOtp();
        else if (event.ctrlKey || event.metaKey) void copy();
        else view();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });
    composing = false;
    search();
    dialog.showModal();
    input.focus();
  }
  return {
    show,
    close,
    get isOpen() {
      return Boolean(dialog);
    },
  };
}
