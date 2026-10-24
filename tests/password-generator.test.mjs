import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword, defaultRules } from '../dist/password-generator.js';

test('password generator obeys length, character classes and exclusions', () => {
  for (const length of [4, 20, 128]) {
    for (let i = 0; i < 30; i++) {
      const password = generatePassword({ ...defaultRules, length });
      assert.equal(password.length, length);
      for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/])
        assert.match(password, pattern);
    }
  }
  for (let i = 0; i < 20; i++) {
    const digits = generatePassword({
      ...defaultRules,
      upper: false,
      lower: false,
      symbols: false,
      excludeSimilar: true,
      exclude: '234',
    });
    assert.match(digits, /^[56789]{20}$/);
    const lower = generatePassword({
      ...defaultRules,
      upper: false,
      digits: false,
      symbols: false,
      excludeSimilar: true,
    });
    assert.match(lower, /^[a-hj-km-np-z]{20}$/);
  }
});

test('invalid password rules cannot produce a fillable password', () => {
  for (const length of [0, 3, 129, 4.5, NaN])
    assert.throws(() => generatePassword({ ...defaultRules, length }));
  assert.throws(() =>
    generatePassword({
      ...defaultRules,
      upper: false,
      lower: false,
      digits: false,
      symbols: false,
    }),
  );
  assert.throws(() => generatePassword({ ...defaultRules, exclude: '0123456789' }));
});
