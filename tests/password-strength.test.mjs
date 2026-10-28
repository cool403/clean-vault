import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordStrength, strengthLabels } from '../dist/password-strength.js';

test('master password strength is conservative for common, repeated and sequential values', () => {
  assert.equal(strengthLabels.length, 5);
  assert.equal(passwordStrength('').score, 0);
  for (const weak of [
    'password123',
    'P@ssword!2026',
    'aaaaaaaaaaaa',
    'abcdefgh1234',
    '123456789012',
  ]) {
    assert.ok(passwordStrength(weak).score <= 1, weak);
  }
  const medium = passwordStrength('N7!vQ2#rL9@x');
  assert.equal(medium.score, 3);
  assert.equal(medium.label, '强');
  const strong = passwordStrength('N7!vQ2#rL9@xT4$m');
  assert.equal(strong.score, 4);
  assert.equal(strong.label, '很强');
  assert.ok(strengthLabels.includes(medium.label));
  assert.ok(medium.suggestions.every((suggestion) => typeof suggestion === 'string'));
});
