import en from './locales/en.js';
import zhCN from './locales/zh-CN.js';

export const supportedLocales = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
];
export const LANGUAGE_KEY = 'clearvault.language';
const catalogs = { 'zh-CN': zhCN, en };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sourcePhrases = new RegExp(
  Object.keys(en)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|'),
  'g',
);
let language = 'zh-CN';

export function detectLanguage(languages = []) {
  for (const locale of languages) {
    if (/^zh(?:-|$)/i.test(locale)) return 'zh-CN';
    if (/^en(?:-|$)/i.test(locale)) return 'en';
  }
  return 'en';
}
export function getLocale() {
  return language;
}
export function t(source, parameters = {}) {
  const catalog = catalogs[language];
  const translated =
    catalog[source] ??
    (language === 'en'
      ? source.replace(sourcePhrases, (phrase) => catalog[phrase] ?? phrase)
      : source);
  return translated.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(parameters, key) ? String(parameters[key]) : match,
  );
}
// Only developer-authored literal segments are localized. Interpolated vault data
// is appended verbatim, so a title, password or note can never become a UI key.
export function html(parts, ...values) {
  return parts
    .map((part, index) => t(part) + (index < values.length ? String(values[index]) : ''))
    .join('');
}
function updateMetadata() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document
    .querySelector('link[rel=manifest]')
    ?.setAttribute(
      'href',
      language === 'en' ? './manifest.en.webmanifest' : './manifest.webmanifest',
    );
  document.title = t('ClearVault · SafeInCloud 兼容密码管理器与双重验证器');
  document
    .querySelector('meta[name=description]')
    ?.setAttribute(
      'content',
      t('ClearVault，本地优先的密码库与双重验证器。打开、管理和保存 SafeInCloud 数据库。'),
    );
}
export function initializeLanguage(
  languages = globalThis.navigator?.languages || [globalThis.navigator?.language || 'zh-CN'],
) {
  let saved;
  try {
    saved = globalThis.localStorage?.getItem(LANGUAGE_KEY);
  } catch {
    /* Storage can be disabled in private contexts. */
  }
  let requested;
  try {
    requested = new URL(globalThis.document?.location?.href).searchParams.get('lang');
  } catch {
    /* Extensions and non-browser environments may have no document URL. */
  }
  language = Object.hasOwn(catalogs, requested)
    ? requested
    : Object.hasOwn(catalogs, saved)
      ? saved
      : detectLanguage(languages);
  updateMetadata();
  return language;
}
export function setLanguage(locale) {
  if (!Object.hasOwn(catalogs, locale)) throw new Error('Unsupported interface language');
  language = locale;
  try {
    globalThis.localStorage?.setItem(LANGUAGE_KEY, locale);
  } catch {
    /* Keep the preference for this page even without storage. */
  }
  updateMetadata();
}
