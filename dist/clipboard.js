// Copies a secret, then attempts to clear it after a configurable delay.
// Clearing can fail when the page loses focus; callers must treat it as best effort.
export function createClipboardGuard({
  writeText = (value) => globalThis.navigator.clipboard.writeText(value),
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
  seconds = 30,
} = {}) {
  let timer = null;
  let timeout = Number(seconds) || 0;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    cancel();
    if (timeout <= 0) return;
    timer = setTimeout(() => {
      timer = null;
      Promise.resolve(writeText('')).catch(() => {});
    }, timeout * 1000);
  };
  async function write(value) {
    await writeText(value);
    schedule();
  }
  function setSeconds(value) {
    timeout = Number(value) || 0;
    if (timer !== null) schedule();
  }
  async function clearNow() {
    cancel();
    try {
      await writeText('');
    } catch {
      /* Clipboard access may be unavailable outside a focused document. */
    }
  }
  return {
    write,
    setSeconds,
    cancel,
    clearNow,
    get seconds() {
      return timeout;
    },
    get pending() {
      return timer !== null;
    },
  };
}
