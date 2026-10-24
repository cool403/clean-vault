import { t } from './i18n.js';
export const children = (node, tag) => [...node.children].filter((el) => el.tagName === tag);
export function parseVault(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error(t('不支持包含 DTD 的数据库'));
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.tagName !== 'database')
    throw new Error(t('数据库 XML 无效'));
  return doc;
}
export function serializeVault(doc) {
  return new XMLSerializer().serializeToString(doc);
}
export function cards(doc) {
  return children(doc.documentElement, 'card').filter(
    (el) =>
      el.getAttribute('template') !== 'true' && ['card', null].includes(el.getAttribute('type')),
  );
}
export function fields(card) {
  return children(card, 'field');
}
export const fieldType = (field) =>
  field.getAttribute('password') === 'true' ? 'password' : field.getAttribute('type') || 'text';
export const isOTP = (field) => fieldType(field) === 'one_time_password';
export const hasOTP = (field) => isOTP(field) && Boolean(field.textContent.trim());
export const title = (card) => card.getAttribute('title') || t('未命名条目');
export function touch(card) {
  const stamp = Math.max(Date.now(), Number(card.getAttribute('time_stamp') || 0) + 2);
  if (!card.getAttribute('first_stamp'))
    card.setAttribute('first_stamp', card.getAttribute('time_stamp') || String(stamp));
  card.setAttribute('time_stamp', String(stamp));
}
export function newCard(doc) {
  const card = doc.createElement('card');
  const ids = new Set([...doc.documentElement.children].map((el) => el.getAttribute('id')));
  let id;
  do {
    id = String(crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff);
  } while (id === '0' || ids.has(id));
  card.setAttribute('id', id);
  card.setAttribute('type', 'card');
  card.setAttribute('color', '0xff7960d4');
  card.setAttribute('symbol', 'key');
  touch(card);
  return card;
}
export function setField(card, name, value, type) {
  const field = card.ownerDocument.createElement('field');
  field.setAttribute('name', name);
  field.setAttribute('type', type);
  field.textContent = value;
  card.append(field);
  return field;
}
export function demoVault() {
  const doc = parseVault('<database/>');
  const data = [
    ['GitHub', 'hello@clearvault.app', 'github.com', true, t('开发与协作')],
    ['Google', 'hello@clearvault.app', 'accounts.google.com', true, t('日常生活')],
    ['Figma', 'design@clearvault.app', 'figma.com', false, t('开发与协作')],
    ['Notion', 'hello@clearvault.app', 'notion.so', true, t('日常生活')],
    ['Proton Mail', 'hello@proton.me', 'proton.me', false, t('日常生活')],
    ['Cloudflare', 'hello@clearvault.app', 'dash.cloudflare.com', true, t('开发与协作')],
  ];
  [t('开发与协作'), t('日常生活')].forEach((name, index) => {
    const el = doc.createElement('label');
    el.setAttribute('id', String(index + 1));
    el.setAttribute('name', name);
    doc.documentElement.append(el);
  });
  for (const [name, account, website, otp, group] of data) {
    const card = newCard(doc);
    card.setAttribute('title', name);
    if (['GitHub', 'Google'].includes(name)) card.setAttribute('star', 'true');
    setField(card, t('账号'), account, 'login');
    setField(card, t('密码'), 'Demo-Only!2026', 'password');
    setField(card, t('网站'), 'https://' + website, 'website');
    if (otp)
      setField(
        card,
        t('两步验证码'),
        'otpauth://totp/' + name + ':demo?secret=JBSWY3DPEHPK3PXP&issuer=' + name,
        'one_time_password',
      );
    const label = doc.createElement('label_id');
    label.textContent = group === t('开发与协作') ? '1' : '2';
    card.append(label);
    const notes = doc.createElement('notes');
    notes.textContent = t('这是演示条目，可以自由编辑。真实密码库仅在你的设备上解密。');
    card.append(notes);
    doc.documentElement.append(card);
  }
  return doc;
}
