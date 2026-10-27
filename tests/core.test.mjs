import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  decryptDatabase,
  decryptDatabaseWithCredential,
  encryptDatabase,
  passwordBytes,
} from '../dist/crypto.js';
import { parseOTP, totp, decodeBase32 } from '../dist/totp.js';
import {
  parseVault,
  serializeVault,
  demoVault,
  cards,
  fields,
  touch,
  setField,
  newCard,
} from '../dist/vault.js';

const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;
const testsRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(testsRoot, 'fixtures');
const passwords = ['test-ASCII-123!', '中文ab', '😀x'];
const xml =
  '<?xml version="1.0" encoding="utf-8"?><database><card id="1"><field name="test">synthetic only</field></card></database>';

test('SafeInCloud original CIL writer -> Web Crypto; Web Crypto -> original CIL reader', async () => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'clearvault-compat-'));
  for (let i = 0; i < passwords.length; i++) {
    const original = new Uint8Array(await readFile(path.join(fixtures, `original-v1-${i}.db`)));
    const decoded = await decryptDatabase(original, passwords[i]);
    assert.equal(decoded.xml, xml);
    assert.equal(decoded.version, 1);
    decoded.credential.fill(0);
    for (const version of [1, 2]) {
      const credential = passwordBytes(passwords[i], version);
      const bytes = await encryptDatabase(xml, credential, version);
      assert.equal(bytes[150], 96);
      assert.equal(bytes.length % 16, 7);
      assert.equal((await decryptDatabase(bytes, passwords[i])).xml, xml);
      await writeFile(path.join(outputDirectory, `web-v${version}-${i}.db`), bytes);
      credential.fill(0);
    }
    await assert.rejects(decryptDatabase(original, passwords[i] + 'wrong'));
    await assert.rejects(decryptDatabase(original.slice(0, 20), passwords[i]));
    await assert.rejects(decryptDatabase(original.slice(0, -1), passwords[i]));
    const badMagic = original.slice();
    badMagic[0] = 0;
    await assert.rejects(decryptDatabase(badMagic, passwords[i]));
  }
  if (
    process.platform === 'win32' &&
    existsSync(
      'C:\\Program Files\\WindowsApps\\51041SafeInCloud.PasswordManagerSafeInCloud_26.0.0.0_x86__wh7zearnzvtm6\\SafeInCloud\\SafeInCloud.exe',
    )
  ) {
    const ps = path.join(process.env.WINDIR, 'SysWOW64/WindowsPowerShell/v1.0/powershell.exe');
    const output = execFileSync(
      ps,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(testsRoot, 'original-verifier.ps1'),
        '-Mode',
        'verify',
        '-InputPrefix',
        'web',
        '-FixtureDirectory',
        outputDirectory,
      ],
      { encoding: 'utf8' },
    );
    assert.match(output, /verify passed/);
  }
});

test('password encoding preserves version 1 UTF-16 code unit semantics', () => {
  assert.deepEqual([...passwordBytes('中😀', 1)], [45, 61, 0]);
  assert.deepEqual(passwordBytes('中', 1), passwordBytes('-', 1));
  assert.notDeepEqual(passwordBytes('中', 2), passwordBytes('-', 2));
  assert.throws(() => passwordBytes('abc', 7));
});

test('RFC 6238 all 18 SHA1/SHA256/SHA512 TOTP test vectors', async () => {
  const vectors = [
    [59, '94287082', '46119246', '90693936'],
    [1111111109, '07081804', '68084774', '25091201'],
    [1111111111, '14050471', '67062674', '99943326'],
    [1234567890, '89005924', '91819424', '93441116'],
    [2000000000, '69279037', '90698825', '38618901'],
    [20000000000, '65353130', '77737706', '47863826'],
  ];
  const secrets = [
    '12345678901234567890',
    '12345678901234567890123456789012',
    '1234567890123456789012345678901234567890123456789012345678901234',
  ];
  for (const [seconds, ...expected] of vectors) {
    for (const [index, algorithm] of ['SHA1', 'SHA256', 'SHA512'].entries()) {
      assert.equal(
        await totp(
          { secret: new TextEncoder().encode(secrets[index]), algorithm, digits: 8, period: 30 },
          seconds * 1000,
        ),
        expected[index],
      );
    }
  }
  const config = parseOTP(
    'otpauth://totp/Example:alice?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Example&period=60&digits=6',
  );
  assert.equal(config.period, 60);
  assert.equal(config.account, 'alice');
  assert.equal(await totp(config, 59000), '755224');
});

test('OTP parsing rejects ambiguous or unsupported parameters', () => {
  assert.deepEqual(decodeBase32('JBSW Y3DP-EHPK3PXP'), decodeBase32('JBSWY3DPEHPK3PXP'));
  for (const value of [
    'otpauth://hotp/Test?secret=JBSWY3DPEHPK3PXP',
    'otpauth://totp/Test?secret=BAD1',
    'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&digits=7',
    'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&period=0',
  ])
    assert.throws(() => parseOTP(value));
});

test('editing known XML retains attachments, unknown elements, templates and attributes', async () => {
  const doc = parseVault(
    '<database custom="keep"><card id="8" title="Original" time_stamp="9999999999999"><field type="password" history="keep">secret</field><file name="x">eJwDAAAAAAE=</file><custom extension="keep"/><notes>旧备注</notes></card><card id="9" template="true"/><record id="10"><unknown/></record></database>',
  );
  const card = cards(doc)[0];
  card.setAttribute('title', '<新名称>');
  touch(card);
  setField(card, '验证码', 'JBSWY3DPEHPK3PXP', 'one_time_password');
  assert.equal(card.getAttribute('time_stamp'), '10000000000001');
  const copy = parseVault(serializeVault(doc));
  assert.equal(copy.querySelector('file').textContent, 'eJwDAAAAAAE=');
  assert.equal(copy.querySelector('custom').getAttribute('extension'), 'keep');
  assert.equal(copy.querySelector('field').getAttribute('history'), 'keep');
  assert.equal(copy.querySelector('database').getAttribute('custom'), 'keep');
  assert.ok(copy.querySelector('record unknown'));
  assert.equal(cards(copy).length, 1);
  const credential = passwordBytes('roundtrip-中文😀', 2);
  const encrypted = await encryptDatabase(serializeVault(copy), credential, 2);
  const reopened = parseVault((await decryptDatabase(encrypted, 'roundtrip-中文😀')).xml);
  assert.equal(reopened.querySelector('card').getAttribute('title'), '<新名称>');
  assert.equal(reopened.querySelector('file').textContent, 'eJwDAAAAAAE=');
  assert.ok(Number(newCard(reopened).getAttribute('id')) > 0);
});

test('invalid/DTD XML fails closed; demo has four usable authenticators', () => {
  assert.throws(() => parseVault('<bad>'));
  assert.throws(() => parseVault('<!DOCTYPE database [<!ENTITY x "value">]><database/>'));
  const doc = demoVault();
  assert.equal(cards(doc).length, 6);
  assert.equal(
    cards(doc)
      .flatMap(fields)
      .filter((field) => field.getAttribute('type') === 'one_time_password').length,
    4,
  );
});

test('decrypting with an in-memory credential matches password decryption', async () => {
  const password = 'merge-credential-test';
  const bytes = await encryptDatabase('<database/>', passwordBytes(password));
  const result = await decryptDatabaseWithCredential(bytes, passwordBytes(password));
  assert.equal(result.xml, '<database/>');
  const normal = await decryptDatabase(bytes, password);
  assert.equal(normal.xml, result.xml);
  result.credential.fill(0);
  normal.credential.fill(0);
  await assert.rejects(
    decryptDatabaseWithCredential(bytes, passwordBytes('wrong')),
    /主密码不正确/,
  );
});
