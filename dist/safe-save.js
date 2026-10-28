import { t } from './i18n.js';
// Browser handles have no stable cross-session file identity. Never prune a
// different file's backups just because it shares the same name.
const sessionBackups = new WeakMap();
function conflict(message) {
  const error = new Error(message);
  error.code = 'conflict';
  return error;
}

export async function fingerprint(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
export async function readBytes(handle) {
  const file = await handle.getFile();
  if (file.size > 64 * 1024 * 1024) throw new Error(t('文件超过 64 MB，请使用桌面客户端处理'));
  return new Uint8Array(await file.arrayBuffer());
}
export async function writeVerified(handle, bytes) {
  const stream = await handle.createWritable({ mode: 'exclusive' });
  try {
    await stream.write(bytes);
    await stream.close();
  } catch (error) {
    await stream.abort().catch(() => {});
    throw error;
  }
  if ((await fingerprint(await readBytes(handle))) !== (await fingerprint(bytes)))
    throw new Error(t('写入后验证失败，请保留当前页面并另存副本'));
}
export async function backupPrefix(name) {
  return 'clearvault-' + (await fingerprint(new TextEncoder().encode(name))).slice(0, 16) + '-';
}
export async function listBackups(directory, name) {
  const prefix = await backupPrefix(name),
    result = [];
  for await (const [fileName, handle] of directory.entries()) {
    if (
      handle.kind === 'file' &&
      fileName.startsWith(prefix) &&
      /^\d{13}-[\da-f-]{36}\.db$/.test(fileName.slice(prefix.length))
    )
      result.push({
        name: fileName,
        handle,
        time: Number(fileName.slice(prefix.length, prefix.length + 13)),
      });
  }
  return result.sort((a, b) => b.time - a.time || b.name.localeCompare(a.name));
}
// Backups contain the ORIGINAL ciphertext, including its original password.
export async function saveSafely({
  handle,
  bytes,
  expectedHash = null,
  directory = null,
  name,
  retention = 10,
}) {
  const original = await readBytes(handle);
  if (expectedHash && (await fingerprint(original)) !== expectedHash)
    throw conflict(t('原文件已被其他应用修改，请在设置中另存为副本，避免覆盖'));
  let backup = null;
  let owned;
  if (directory && original.length) {
    const backupName = (await backupPrefix(name)) + Date.now() + '-' + crypto.randomUUID() + '.db';
    backup = await directory.getFileHandle(backupName, { create: true });
    if (await backup.isSameEntry?.(handle)) throw new Error(t('备份文件不能与保存目标相同'));
    await writeVerified(backup, original);
    if (!sessionBackups.has(directory)) sessionBackups.set(directory, new WeakMap());
    const sources = sessionBackups.get(directory);
    if (!sources.has(handle)) sources.set(handle, []);
    owned = sources.get(handle);
    owned.push({ name: backupName, handle: backup });
  }
  // Recheck after asynchronous backup I/O. This narrows, but cannot remove,
  // the race with another application; browser APIs provide no cross-app CAS.
  if ((await fingerprint(await readBytes(handle))) !== (await fingerprint(original)))
    throw conflict(t('原文件已被其他应用修改，请在设置中另存为副本，避免覆盖'));
  await writeVerified(handle, bytes);
  let retentionWarning = false;
  if (directory && backup) {
    try {
      while (owned.length > Math.max(1, retention)) {
        const old = owned[0];
        if (!(await old.handle.isSameEntry?.(handle))) await directory.removeEntry(old.name);
        owned.shift();
      }
    } catch {
      retentionWarning = true;
    }
  }
  return { hash: await fingerprint(bytes), backup: Boolean(backup), retentionWarning };
}
