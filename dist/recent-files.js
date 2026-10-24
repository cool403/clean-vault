import { t } from './i18n.js';

export async function allowFile(handle, mode = 'read') {
  if (!handle?.queryPermission) return;
  if ((await handle.queryPermission({ mode })) === 'granted') return;
  if ((await handle.requestPermission({ mode })) !== 'granted')
    throw new Error(t('文件授权未完成，请重新授权或重新选择文件'));
}

export function fileError(error) {
  if (error?.name === 'NotFoundError') return t('文件已移动或删除，请重新选择文件');
  if (['NotAllowedError', 'SecurityError'].includes(error?.name))
    return t('文件授权未完成，请重新授权或重新选择文件');
  if (error?.name === 'AbortError') return t('操作已取消');
  return error?.message || t('操作未完成，请重试');
}

export function createRecentFiles(factory) {
  if (!arguments.length) {
    try {
      factory = globalThis.indexedDB;
    } catch {}
  }
  let memory = [],
    database,
    persistent = Boolean(factory),
    queue = Promise.resolve();
  function serialize(operation) {
    const next = queue.then(operation);
    queue = next.catch(() => {});
    return next;
  }
  async function connect() {
    if (!persistent) return null;
    if (!database)
      database = new Promise((resolve, reject) => {
        const request = factory.open('clearvault-files', 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore('recent', { keyPath: 'id' });
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Storage unavailable'));
      });
    return database;
  }
  async function transaction(mode, operation) {
    try {
      const db = await connect();
      if (!db) return null;
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('recent', mode);
        const result = operation(tx.objectStore('recent'));
        tx.oncomplete = () => resolve(result?.result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Storage unavailable'));
      });
    } catch {
      persistent = false;
      return null;
    }
  }
  async function list() {
    const saved = await transaction('readonly', (store) => store.getAll());
    if (saved) memory = saved;
    return [...memory].sort((left, right) => right.time - left.time).slice(0, 5);
  }
  async function remember(name, handle = null) {
    const entries = await list();
    let previous;
    for (const entry of entries) {
      try {
        if (
          handle &&
          entry.handle &&
          (handle === entry.handle || (await handle.isSameEntry?.(entry.handle)))
        ) {
          previous = entry;
          break;
        }
        if (!handle && !entry.handle && entry.name === name) previous = entry;
      } catch {}
    }
    const entry = {
      id: previous?.id || crypto.randomUUID(),
      name,
      handle,
      time: Math.max(Date.now(), ...entries.map((item) => item.time + 1)),
    };
    if (previous?.folder) entry.folder = previous.folder;
    memory = [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, 5);
    await transaction('readwrite', (store) => {
      store.put(entry);
      for (const item of entries)
        if (!memory.some((kept) => kept.id === item.id)) store.delete(item.id);
    });
    return entry;
  }
  async function setDirectory(id, directory) {
    const entry = (await list()).find((item) => item.id === id);
    if (!entry?.handle) throw new Error(t('记录已失效，请重新打开密码库'));
    const relative = await directory.resolve(entry.handle);
    if (!Array.isArray(relative) || !relative.length)
      throw new Error(t('所选文件夹不包含此密码库，请重新选择'));
    const updated = {
      ...entry,
      folder: [directory.name || t('所选文件夹'), ...relative.slice(0, -1)].join('/'),
    };
    memory = memory.map((item) => (item.id === id ? updated : item));
    await transaction('readwrite', (store) => store.put(updated));
    return updated;
  }
  async function remove(id) {
    await list();
    memory = memory.filter((entry) => entry.id !== id);
    await transaction('readwrite', (store) => store.delete(id));
  }
  async function clear() {
    memory = [];
    await transaction('readwrite', (store) => store.clear());
  }
  return {
    list: () => serialize(list),
    remember: (name, handle) => serialize(() => remember(name, handle)),
    setDirectory: (id, directory) => serialize(() => setDirectory(id, directory)),
    remove: (id) => serialize(() => remove(id)),
    clear: () => serialize(clear),
    get persistent() {
      return persistent;
    },
  };
}
