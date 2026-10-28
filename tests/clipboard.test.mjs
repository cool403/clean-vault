import test from 'node:test';
import assert from 'node:assert/strict';
import { createClipboardGuard } from '../dist/clipboard.js';

test('clipboard guard clears secrets after the timeout, resets and can be disabled', async () => {
  let now = 0,
    nextId = 0;
  const timers = new Map(),
    written = [];
  const setTimeout = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  const clearTimeout = (id) => timers.delete(id);
  const advance = (milliseconds) => {
    now += milliseconds;
    for (const [id, timer] of [...timers])
      if (timer.at <= now) {
        timers.delete(id);
        timer.callback();
      }
  };
  const guard = createClipboardGuard({
    writeText: async (value) => written.push(value),
    setTimeout,
    clearTimeout,
    seconds: 30,
  });

  await guard.write('secret');
  assert.deepEqual(written, ['secret']);
  assert.equal(guard.pending, true);
  advance(29999);
  assert.deepEqual(written, ['secret']);
  advance(1);
  assert.deepEqual(written, ['secret', '']);
  assert.equal(guard.pending, false);

  guard.setSeconds(15);
  await guard.write('first');
  advance(10000);
  await guard.write('second');
  advance(10000);
  assert.deepEqual(written.slice(-2), ['first', 'second']);
  advance(5000);
  assert.equal(written.at(-1), '');

  guard.setSeconds(0);
  await guard.write('kept');
  assert.equal(guard.pending, false);
  advance(60000);
  assert.equal(written.at(-1), 'kept');

  guard.setSeconds(30);
  await guard.write('rescheduled');
  advance(10000);
  guard.setSeconds(5);
  advance(5000);
  assert.equal(written.at(-1), '');

  await guard.write('cleared-now');
  await guard.clearNow();
  assert.deepEqual(written.slice(-2), ['cleared-now', '']);
  assert.equal(guard.pending, false);
});

test('a failed clipboard write does not schedule a misleading clear', async () => {
  let timers = 0;
  const guard = createClipboardGuard({
    writeText: async () => {
      throw new Error('Clipboard unavailable');
    },
    setTimeout: () => ++timers,
    clearTimeout: () => {},
  });
  await assert.rejects(guard.write('secret'), /Clipboard unavailable/);
  assert.equal(timers, 0);
  assert.equal(guard.pending, false);
});
