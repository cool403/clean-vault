import { t } from './i18n.js';
const encoder = new TextEncoder();
export const encode = (text) => encoder.encode(text);
export function passwordBytes(password, version = 2) {
  if (version === 1)
    return Uint8Array.from({ length: password.length }, (_, i) => password.charCodeAt(i) & 255);
  if (version === 2) return encode(password);
  throw new Error(t('不支持此数据库版本'));
}
export function concat(...parts) {
  const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
const blob = (bytes) => concat(Uint8Array.of(bytes.length), bytes);
const random = (length) => crypto.getRandomValues(new Uint8Array(length));
async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-1', salt, iterations }, key, 256),
  );
}
async function aes(operation, bytes, keyBytes, iv) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, [operation]);
  return new Uint8Array(await crypto.subtle[operation]({ name: 'AES-CBC', iv }, key, bytes));
}
function reader(bytes) {
  let offset = 0;
  const take = (length) => {
    if (offset + length > bytes.length) throw new Error(t('文件不完整'));
    const value = bytes.slice(offset, offset + length);
    offset += length;
    return value;
  };
  return { take, blob: () => take(take(1)[0]), rest: () => take(bytes.length - offset) };
}
async function transform(bytes, compress) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(compress ? new CompressionStream('deflate') : new DecompressionStream('deflate'));
  // Bound decompression to avoid an accidental compressed-data memory bomb.
  const source = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await source.read();
      if (done) break;
      size += value.length;
      if (size > 128 * 1024 * 1024) {
        await source.cancel();
        throw new Error(t('数据库解压后超过 128 MB 限制'));
      }
      chunks.push(value);
    }
    return concat(...chunks);
  } finally {
    source.releaseLock();
  }
}
async function decryptBytes(bytes, credential) {
  const input = reader(bytes);
  const magic = input.take(2);
  if (magic[0] !== 5 || magic[1] !== 5) throw new Error(t('这不是兼容的 SafeInCloud .db 文件'));
  const version = input.take(1)[0];
  let userKey, header, dataKey;
  try {
    const salt = input.blob(),
      iv = input.blob(),
      checkSalt = input.blob(),
      encryptedHeader = input.blob();
    userKey = await derive(credential, salt, 10000);
    try {
      header = await aes('decrypt', encryptedHeader, userKey, iv);
      const inner = reader(header),
        dataIV = inner.blob();
      dataKey = inner.blob();
      const check = inner.blob();
      if (
        dataIV.length !== 16 ||
        dataKey.length !== 32 ||
        check.length !== 32 ||
        inner.rest().length
      )
        throw new Error();
      const expected = await derive(dataKey, checkSalt, 1000);
      let diff = 0;
      for (let i = 0; i < 32; i++) diff |= expected[i] ^ check[i];
      expected.fill(0);
      if (diff) throw new Error();
      const compressed = await aes('decrypt', input.rest(), dataKey, dataIV);
      const xml = new TextDecoder('utf-8', { fatal: true }).decode(
        await transform(compressed, false),
      );
      return { xml, credential, version };
    } catch (error) {
      throw new Error(t('主密码不正确，或数据库文件已损坏'), { cause: error });
    }
  } finally {
    userKey?.fill(0);
    header?.fill(0);
    dataKey?.fill(0);
  }
}
export async function decryptDatabase(bytes, password) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 3)
    throw new Error(t('这不是兼容的 SafeInCloud .db 文件'));
  const credential = passwordBytes(password, bytes[2]);
  try {
    return await decryptBytes(bytes, credential);
  } catch (error) {
    credential.fill(0);
    throw error;
  }
}
export async function decryptDatabaseWithCredential(bytes, credential) {
  if (!(credential instanceof Uint8Array)) throw new Error(t('密码库不可用'));
  const copy = credential.slice();
  try {
    return await decryptBytes(bytes, copy);
  } catch (error) {
    copy.fill(0);
    throw error;
  }
}
export async function encryptDatabase(xml, credential, version = 2) {
  if (![1, 2].includes(version)) throw new Error(t('不支持此数据库版本'));
  const salt = random(64),
    iv = random(16),
    checkSalt = random(64),
    dataIV = random(16),
    dataKey = random(32);
  const userKey = await derive(credential, salt, 10000);
  try {
    const check = await derive(dataKey, checkSalt, 1000);
    const header = concat(blob(dataIV), blob(dataKey), blob(check));
    const encryptedHeader = await aes('encrypt', header, userKey, iv);
    header.fill(0);
    check.fill(0);
    const body = await aes('encrypt', await transform(encode(xml), true), dataKey, dataIV);
    return concat(
      Uint8Array.of(5, 5, version),
      blob(salt),
      blob(iv),
      blob(checkSalt),
      blob(encryptedHeader),
      body,
    );
  } finally {
    userKey.fill(0);
    dataKey.fill(0);
  }
}
