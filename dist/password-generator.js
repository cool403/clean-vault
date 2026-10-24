import { t } from './i18n.js';
export const defaultRules = {
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeSimilar: false,
  exclude: '',
};
const sets = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
};
function randomIndex(limit) {
  const ceiling = Math.floor(256 / limit) * limit;
  const byte = new Uint8Array(1);
  do {
    crypto.getRandomValues(byte);
  } while (byte[0] >= ceiling);
  return byte[0] % limit;
}
export function generatePassword(rules = defaultRules) {
  if (!Number.isInteger(rules.length) || rules.length < 4 || rules.length > 128)
    throw new Error(t('密码长度应为 4–128 个字符'));
  const excluded = new Set((rules.exclude || '') + (rules.excludeSimilar ? 'iIlL1oO0|' : ''));
  const groups = Object.entries(sets)
    .filter(([name]) => rules[name])
    .map(([, chars]) => [...chars].filter((char) => !excluded.has(char)).join(''));
  if (!groups.length) throw new Error(t('请至少选择一种字符类型'));
  if (groups.some((group) => !group.length))
    throw new Error(t('某种已选字符类型被全部排除，请调整规则'));
  const alphabet = groups.join('');
  // Rejection sampling is uniform over passwords satisfying every selected group.
  // Cap attempts so extreme exclusion rules cannot freeze the interface.
  for (let attempt = 0; attempt < 10000; attempt++) {
    let value = '';
    for (let i = 0; i < rules.length; i++) value += alphabet[randomIndex(alphabet.length)];
    if (groups.every((group) => [...value].some((char) => group.includes(char)))) return value;
  }
  throw new Error(t('当前规则较难满足，请增加密码长度或减少排除字符'));
}
