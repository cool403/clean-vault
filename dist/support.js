import { getLocale } from './i18n.js';

// Plain outbound link: no widget, remote image, analytics or prefetch.
export function mountSupportLinks(selector = '.welcome-footer, .page-footer') {
  for (const footer of document.querySelectorAll(selector)) {
    footer.querySelectorAll('[data-support-link]').forEach((link) => link.remove());
    if (getLocale() !== 'en') continue;
    const link = document.createElement('a');
    link.dataset.supportLink = '';
    link.className = 'support-link';
    link.href = 'https://ko-fi.com/lurefun';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.textContent = '☕ Support on Ko-fi';
    footer.append(link);
  }
}
