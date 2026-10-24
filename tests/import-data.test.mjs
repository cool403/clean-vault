import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseCSV, parseImport, planImport, applyImport } from '../dist/import-data.js';
import { parseVault, cards, fields, children, serializeVault } from '../dist/vault.js';
import { decryptDatabase, encryptDatabase, passwordBytes } from '../dist/crypto.js';
import { setLanguage } from '../dist/i18n.js';

const dom = new JSDOM();
Object.assign(globalThis, {
  DOMParser: dom.window.DOMParser,
  XMLSerializer: dom.window.XMLSerializer,
});
setLanguage('en');
const chromeCSV =
  '\uFEFFname,url,username,password,note\r\n"中文, Demo",https://example.com,alice,"secret""quoted","line 1\r\nline 2"\r\n';

test('CSV parses BOM, Unicode, escaped quotes and multiline notes without trimming secrets', () => {
  const rows = parseCSV(chromeCSV);
  assert.equal(rows[0].password, 'secret"quoted');
  assert.equal(rows[0].note, 'line 1\r\nline 2');
  assert.equal(rows[0].name, '中文, Demo');
  for (const source of ['name,name\na,b', 'a,b\n"unfinished', 'a,b\na', 'a,b\n"a"x,b'])
    assert.throws(() => parseCSV(source), /CSV/);
  assert.throws(() => parseImport(chromeCSV, 'bitwarden-csv'), /columns/);
});

test('imports never overwrite; repeated imports skip identical content and keep changed passwords', async () => {
  const doc = parseVault('<database><unknown keep="yes"/></database>');
  const parsed = parseImport(
    chromeCSV + chromeCSV.slice(chromeCSV.indexOf('\r\n') + 2),
    'chrome-csv',
  );
  const plan = planImport(doc, parsed);
  assert.equal(plan.duplicates, 1);
  assert.equal(cards(doc).length, 0);
  applyImport(doc, plan);
  assert.equal(planImport(doc, parsed).records.length, 0);
  const changed = parseImport(
    chromeCSV.replace('secret""quoted', ' different password '),
    'chrome-csv',
  );
  applyImport(doc, planImport(doc, changed));
  assert.equal(cards(doc).length, 2);
  assert.equal(
    fields(cards(doc)[1]).find((field) => field.getAttribute('type') === 'password').textContent,
    ' different password ',
  );
  assert.equal(doc.querySelector('unknown').getAttribute('keep'), 'yes');
  const bytes = await encryptDatabase(serializeVault(doc), passwordBytes('synthetic-import'));
  const result = await decryptDatabase(bytes, 'synthetic-import');
  assert.match(result.xml, /line 2/);
  result.credential.fill(0);
});

test('Bitwarden JSON preserves folders, multiple URIs, notes, favorites, custom secrets and TOTP', () => {
  const source = JSON.stringify({
    encrypted: false,
    folders: [{ id: 'work', name: '工作' }],
    items: [
      {
        type: 1,
        name: '<script>Login</script>',
        favorite: true,
        folderId: 'work',
        notes: 'memo',
        login: {
          username: 'a',
          password: 'b',
          uris: [{ uri: 'https://example.com' }, { uri: 'https://accounts.example.com' }],
          totp: 'JBSWY3DPEHPK3PXP',
          fido2Credentials: [{}],
        },
        fields: [
          { name: 'PIN', value: '0012', type: 1 },
          { name: 'enabled', value: 'true', type: 2 },
          { type: 3 },
        ],
        attachments: [{}],
      },
      { type: 2, name: 'A note', notes: 'private note', fields: [] },
      { type: 3, name: 'unsupported card' },
    ],
  });
  const parsed = parseImport(source, 'bitwarden-json');
  assert.equal(parsed.skipped, 1);
  assert.equal(parsed.warnings.length, 1);
  const doc = parseVault('<database/>');
  applyImport(doc, planImport(doc, parsed));
  assert.equal(cards(doc).length, 2);
  const card = cards(doc)[0];
  assert.equal(card.getAttribute('star'), 'true');
  assert.equal(fields(card).filter((field) => field.getAttribute('type') === 'website').length, 2);
  assert.equal(
    fields(card).find((field) => field.getAttribute('type') === 'secret').textContent,
    '0012',
  );
  assert.equal(children(doc.documentElement, 'label')[0].getAttribute('name'), '工作');
  setLanguage('zh-CN');
  assert.equal(planImport(doc, parseImport(source, 'bitwarden-json')).duplicates, 2);
  setLanguage('en');
  assert.equal(doc.querySelector('script'), null);
  assert.throws(
    () => parseImport('{"encrypted":true,"items":[]}', 'bitwarden-json'),
    /unencrypted/,
  );
  assert.throws(() => parseImport('null', 'bitwarden-json'), /unencrypted/);
});

test('Bitwarden CSV retains custom fields and unsupported TOTP as secrets', () => {
  const source =
    'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\nWork,1,login,Example,Note,"custom: private",0,https://example.com,alice,password,steam://secret\n,,note,Note,Keep,,,,,,\n';
  const parsed = parseImport(source, 'bitwarden-csv');
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.warnings.length, 1);
  assert.ok(
    parsed.records[0].fields.some(
      (field) => field.type === 'secret' && field.value === 'steam://secret',
    ),
  );
  assert.ok(
    parsed.records[0].fields.some(
      (field) => field.type === 'secret' && field.value === 'custom: private',
    ),
  );
  assert.throws(() => parseImport('name,url,username,password\n', 'chrome-csv'), /no entries/);
  assert.throws(() => parseImport('x'.repeat(20 * 1024 * 1024 + 1), 'chrome-csv'), /20 MB/);
  assert.throws(
    () => parseImport(JSON.stringify({ items: Array(10001).fill(null) }), 'bitwarden-json'),
    /10,000/,
  );
});
