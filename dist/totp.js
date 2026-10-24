import { t } from './i18n.js';
export function decodeBase32(text) {
  const clean = text.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!clean || /[^A-Z2-7]/.test(clean))
    throw new Error(t('请输入有效的 Base32 密钥或 otpauth:// 链接'));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let buffer = 0,
    bits = 0;
  const result = [];
  for (const char of clean) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      result.push((buffer >>> bits) & 255);
    }
  }
  if (!result.length || (bits && buffer & ((1 << bits) - 1)))
    throw new Error(t('Base32 密钥末尾无效'));
  return Uint8Array.from(result);
}
export function parseOTP(text) {
  let secret = text.trim(),
    algorithm = 'SHA1',
    digits = 6,
    period = 30,
    issuer = '',
    account = '';
  if (/^otpauth:/i.test(secret)) {
    const url = new URL(secret);
    if (url.protocol !== 'otpauth:' || url.hostname !== 'totp')
      throw new Error(t('仅支持基于时间的 TOTP 链接'));
    secret = url.searchParams.get('secret') || '';
    algorithm = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase().replace('-', '');
    digits = Number(url.searchParams.get('digits') || 6);
    period = Number(url.searchParams.get('period') || 30);
    const label = decodeURIComponent(url.pathname.slice(1));
    issuer = url.searchParams.get('issuer') || label.split(':')[0];
    account = label.includes(':') ? label.slice(label.indexOf(':') + 1) : label;
  }
  if (!['SHA1', 'SHA256', 'SHA512'].includes(algorithm))
    throw new Error(t('仅支持 SHA1、SHA256 和 SHA512'));
  if (![6, 8].includes(digits)) throw new Error(t('验证码位数应为 6 或 8'));
  if (!Number.isInteger(period) || period < 1 || period > 300)
    throw new Error(t('验证码周期应为 1–300 秒'));
  return { secret: decodeBase32(secret), algorithm, digits, period, issuer, account };
}
export async function totp(config, now = Date.now()) {
  const counter = BigInt(Math.floor(now / 1000 / config.period));
  const message = new Uint8Array(8);
  new DataView(message.buffer).setBigUint64(0, counter);
  const hash = config.algorithm.replace('SHA', 'SHA-');
  const key = await crypto.subtle.importKey('raw', config.secret, { name: 'HMAC', hash }, false, [
    'sign',
  ]);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = digest[digest.length - 1] & 15;
  const value = new DataView(digest.buffer).getUint32(offset) & 0x7fffffff;
  return String(value % 10 ** config.digits).padStart(config.digits, '0');
}
