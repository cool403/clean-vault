import { t } from './i18n.js';

// Plain outbound link: no widget, remote image, analytics or prefetch.
export function supportLinkHtml() {
  return `<a class="support-link" data-support-link href="https://ko-fi.com/lurefun" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${t('支持作者')}</a>`;
}

export function mountSupportLinks(selector = '.page-footer') {
  for (const container of document.querySelectorAll(selector)) {
    container.querySelectorAll('[data-support-link]').forEach((link) => link.remove());
    container.insertAdjacentHTML('beforeend', supportLinkHtml());
  }
}
