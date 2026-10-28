import { t, getLocale } from './i18n.js';
import { parseCSV, guessCSVMapping, parseImport, planImport } from './import-data.js';

export const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
export function recentMarkup(entries, persistent) {
  entries = entries.slice(0, 1);
  const rows = entries
    .map((entry) => {
      const status = entry.current
        ? t(entry.unsaved ? '解锁并继续未保存的修改' : '解锁当前会话')
        : t(entry.handle ? '重新打开并解锁' : '需要重新选择文件');
      const remove = entry.ephemeral
        ? ''
        : `<button type="button" class="icon-button" data-action="recent-remove" data-id="${escapeHTML(entry.id)}" aria-label="${t('移除记录')}">×</button>`;
      return `<div class="recent-row"><button type="button" class="button secondary recent-open" data-action="${entry.current ? 'recent-session' : 'recent-open'}" data-id="${escapeHTML(entry.id)}"><strong>${escapeHTML(entry.name)}</strong><span class="recent-meta"><small>${status} · ${new Date(entry.time).toLocaleDateString(getLocale())}</small></span></button>${remove ? `<div class="recent-actions">${remove}</div>` : ''}</div>`;
    })
    .join('');
  const unsaved = entries.some((entry) => entry.current && entry.unsaved)
    ? `<p class="workflow-notice">${t('当前会话有未保存的更改，解锁后请先保存；刷新或关闭页面会丢失。')}</p>`
    : '';
  return `<section class="recent-files" aria-label="${t('最近密码库')}"><div class="workflow-heading"><h3>${t('最近密码库')}</h3>${entries.some((entry) => !entry.ephemeral) ? `<button type="button" class="text-button" data-action="recent-clear">${t('清空记录')}</button>` : ''}</div><p class="form-help">${t(persistent ? '仅记住上次打开的文件名和文件访问权限，不保存主密码或密码库内容。网页与扩展分别保留记录。' : '当前浏览器无法持久保存文件记录，记录仅在当前页面有效。')}</p>${rows || `<p class="form-help">${t('打开或保存密码库后，会在这里显示。')}</p>`}${unsaved}</section>`;
}

export function createImportWizard({ dialog, getDoc, show, close, commit }) {
  let plan = null,
    generation = 0,
    opened = false,
    sourceFormat = 'chrome-csv';
  const heading = (title) =>
    `<div class="modal-heading"><div><h2 id="modal-title">${title}</h2><p>${t('文件仅在本地处理，确认前不会修改密码库。')}</p></div><button type="button" class="icon-button" data-import-close aria-label="${t('关闭')}">×</button></div>`;
  const cancel = () =>
    `<button type="button" class="button secondary" data-import-close>${t('取消')}</button>`;
  function present(content) {
    show(content);
    dialog.querySelectorAll('[data-import-close]').forEach((button) => (button.onclick = close));
  }
  function reset() {
    generation++;
    plan = null;
    opened = false;
  }
  function open() {
    reset();
    opened = true;
    const version = generation;
    present(
      `<form id="import-form">${heading(t('导入密码'))}<label class="form-label">${t('导入来源')}<select name="format"><option value="chrome-csv">Chrome CSV</option><option value="bitwarden-csv">Bitwarden CSV</option><option value="bitwarden-json">Bitwarden JSON</option><option value="1password-csv">1Password CSV</option><option value="lastpass-csv">LastPass CSV</option><option value="apple-csv">Apple Passwords CSV</option><option value="generic-csv">${t('通用 CSV（手动映射）')}</option></select></label><p class="form-help">${t('支持 Chrome、Bitwarden、1Password、LastPass、Apple Passwords 以及带表头的通用 CSV。')}</p><label class="form-label">${t('选择导出文件')}<input name="file" type="file" accept=".csv,.json,text/csv,application/json" required></label><p class="workflow-notice">${t('导出文件可能含明文密码，请在完成导入并验证加密保存后妥善清理。')}</p><p class="form-error" role="alert"></p><div class="modal-footer">${cancel()}<button type="submit" class="button primary">${t('预览导入')}</button></div></form>`,
    );
    const form = dialog.querySelector('#import-form');
    form.elements.format.value = sourceFormat;
    form.onsubmit = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const button = form.querySelector('[type=submit]');
      if (button.disabled) return;
      const doc = getDoc(),
        file = form.elements.file.files[0];
      button.disabled = true;
      form.querySelector('.form-error').textContent = '';
      try {
        if (!file || file.size > 20 * 1024 * 1024) throw new Error(t('导入文件不能超过 20 MB'));
        sourceFormat = form.elements.format.value;
        const source = await file.text();
        if (generation !== version || !form.isConnected || getDoc() !== doc || !doc) return;
        if (sourceFormat === 'generic-csv') {
          const rows = parseCSV(source);
          const headers = rows.length ? Object.keys(rows[0]) : [];
          if (!headers.length) throw new Error(t('导入文件中没有条目'));
          form.elements.file.value = '';
          mappingStep(doc, source, headers, version);
          return;
        }
        plan = planImport(doc, parseImport(source, sourceFormat));
        form.elements.file.value = '';
        preview(doc);
      } catch (error) {
        if (generation === version && form.isConnected)
          form.querySelector('.form-error').textContent = error.message || t('操作未完成，请重试');
      } finally {
        button.disabled = false;
      }
    };
  }
  function mappingStep(doc, source, headers, version) {
    const guessed = guessCSVMapping(headers);
    const options = (key) =>
      `<option value="">${t('（不使用）')}</option>${headers
        .map(
          (header) =>
            `<option value="${escapeHTML(header)}" ${guessed[key] === header ? 'selected' : ''}>${escapeHTML(header)}</option>`,
        )
        .join('')}`;
    const field = (key, label) =>
      `<label class="form-label">${label}<select name="${key}">${options(key)}</select></label>`;
    present(
      `<form id="import-map">${heading(t('映射 CSV 字段'))}<p class="form-help">${t('选择对应的列，未使用的列会忽略。')}</p>${field('title', t('条目名称'))}${field('username', t('账号'))}${field('password', t('密码'))}${field('url', t('网站'))}${field('notes', t('备注'))}${field('folder', t('标签'))}${field('otp', t('动态验证码'))}${field('favorite', t('收藏'))}<p class="form-error" role="alert"></p><div class="modal-footer"><button type="button" class="button secondary" data-import-back>${t('重新选择')}</button>${cancel()}<button type="submit" class="button primary">${t('预览导入')}</button></div></form>`,
    );
    dialog.querySelector('[data-import-back]').onclick = open;
    const form = dialog.querySelector('#import-map');
    form.onsubmit = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const mapping = {};
      for (const key of [
        'title',
        'username',
        'password',
        'url',
        'notes',
        'folder',
        'otp',
        'favorite',
      ]) {
        const value = form.elements[key].value;
        if (value) mapping[key] = value;
      }
      try {
        const parsed = parseImport(source, 'generic-csv', { mapping });
        if (generation !== version || !form.isConnected || getDoc() !== doc || !doc) return;
        plan = planImport(doc, parsed);
        preview(doc);
      } catch (error) {
        if (form.isConnected)
          form.querySelector('.form-error').textContent = error.message || t('操作未完成，请重试');
      }
    };
  }
  function preview(doc) {
    present(
      `<form id="import-confirm">${heading(t('确认导入'))}<p class="workflow-summary">${t('新增 {added} · 重复 {duplicates} · 不支持 {skipped}', { added: plan.records.length, duplicates: plan.duplicates, skipped: plan.skipped })}</p><p class="form-help">${t('完全相同的条目会跳过；密码或内容不同的条目将分别保留，不覆盖已有数据。')}</p><p class="form-help">${t('字段对应：名称 → 条目名称，用户名 → 账号，密码 → 密码，网址 → 网站，文件夹 → 标签。')}</p>${plan.skipped ? `<p class="workflow-notice">${t('不支持的条目已跳过，请保留源文件并核对。')}</p>` : ''}${plan.warnings.map((warning) => `<p class="workflow-notice">${escapeHTML(warning)}</p>`).join('')}<ul class="import-preview">${plan.records
        .slice(0, 10)
        .map(
          (item) =>
            `<li><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.fields.find((field) => field.type === 'login')?.value || '')}</small></li>`,
        )
        .join(
          '',
        )}</ul>${plan.records.length > 10 ? `<p class="form-help">${t('仅展示前 10 个条目，确认后导入全部新增条目。')}</p>` : ''}<p class="form-error" role="alert"></p><div class="modal-footer"><button type="button" class="button secondary" data-import-back>${t('重新选择')}</button>${cancel()}<button type="submit" class="button primary" ${plan.records.length ? '' : 'disabled'}>${t('确认导入')}</button></div></form>`,
    );
    dialog.querySelector('[data-import-back]').onclick = open;
    const form = dialog.querySelector('#import-confirm');
    form.onsubmit = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const button = form.querySelector('[type=submit]');
      if (button.disabled || !plan || !getDoc() || getDoc() !== doc) return;
      button.disabled = true;
      try {
        await commit(plan);
      } catch (error) {
        if (form.isConnected) {
          form.querySelector('.form-error').textContent = error.message || t('操作未完成，请重试');
          button.disabled = false;
        }
      }
    };
  }
  return {
    open,
    reset,
    get isOpen() {
      return opened;
    },
  };
}
