import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mergeVaults } from '../dist/merge.js';
import { parseVault, cards, fields, children } from '../dist/vault.js';

const dom = new JSDOM();
Object.assign(globalThis, {
  DOMParser: dom.window.DOMParser,
  XMLSerializer: dom.window.XMLSerializer,
});

const card = (id, stamp, title, password, label = '1', extra = '') =>
  `<card id="${id}" title="${title}" time_stamp="${stamp}"><field type="website">https://example.com</field><field type="login">user${id}</field><field type="password">${password}</field>${label ? `<label_id>${label}</label_id>` : ''}${extra}</card>`;
const vault = (cardsXml, labels = '<label id="1" name="Work"/>') =>
  parseVault(`<database>${labels}${cardsXml}</database>`);

// 验证三方合并保留本地和外部各自独立的修改，并合并标签。
test('three-way merge keeps independent local and external changes and merges labels', () => {
  const base = vault(card(1, 100, 'One', 'old-one') + card(2, 100, 'Two', 'old-two'));
  const local = vault(
    card(1, 200, 'One', 'local-one') +
      card(2, 100, 'Two', 'old-two') +
      card(3, 300, 'Local only', 'three', '2'),
    '<label id="1" name="Work"/><label id="2" name="Personal"/>',
  );
  const external = vault(
    card(1, 100, 'One', 'old-one') +
      card(2, 200, 'Two', 'external-two', '5') +
      card(4, 300, 'External only', 'four', '5'),
    '<label id="5" name="Work"/>',
  );
  const result = mergeVaults(base, local, external);
  assert.equal(result.merged, 4);
  assert.equal(result.conflicts.length, 0);
  const byTitle = new Map(cards(result.doc).map((entry) => [entry.getAttribute('title'), entry]));
  assert.equal(
    fields(byTitle.get('One')).find((field) => field.getAttribute('type') === 'password')
      .textContent,
    'local-one',
  );
  assert.equal(
    fields(byTitle.get('Two')).find((field) => field.getAttribute('type') === 'password')
      .textContent,
    'external-two',
  );
  assert.ok(byTitle.has('Local only'));
  assert.ok(byTitle.has('External only'));
  const labels = children(result.doc.documentElement, 'label');
  assert.deepEqual(labels.map((label) => label.getAttribute('name')).sort(), ['Personal', 'Work']);
  const labelId = (name) =>
    labels.find((label) => label.getAttribute('name') === name).getAttribute('id');
  assert.equal(children(byTitle.get('Two'), 'label_id')[0].textContent, labelId('Work'));
  assert.equal(children(byTitle.get('External only'), 'label_id')[0].textContent, labelId('Work'));
  assert.equal(children(byTitle.get('Local only'), 'label_id')[0].textContent, labelId('Personal'));
});

// 验证按时间戳合并时记录冲突并优先采用较新数据，较新的删除操作生效。
test('timestamp merge records conflicts and prefers the newer side; deletions win when newer', () => {
  const base = vault(card(1, 100, 'Entry', 'base'));
  const localNewer = mergeVaults(
    base,
    vault(card(1, 300, 'Entry', 'local')),
    vault(card(1, 200, 'Entry', 'external')),
  );
  assert.equal(localNewer.conflicts.length, 1);
  assert.equal(localNewer.conflicts[0].chosen, 'local');
  assert.equal(
    fields(cards(localNewer.doc)[0]).find((field) => field.getAttribute('type') === 'password')
      .textContent,
    'local',
  );
  const externalNewer = mergeVaults(
    base,
    vault(card(1, 200, 'Entry', 'local')),
    vault(card(1, 300, 'Entry', 'external')),
  );
  assert.equal(externalNewer.conflicts[0].chosen, 'external');
  const deleted = mergeVaults(
    base,
    vault(
      card(1, 400, 'Entry', 'local', '1', '<notes>gone</notes>').replace(
        'time_stamp="400"',
        'time_stamp="400" deleted="true"',
      ),
    ),
    vault(card(1, 300, 'Entry', 'external')),
  );
  assert.equal(deleted.conflicts[0].chosen, 'local');
  assert.equal(cards(deleted.doc)[0].getAttribute('deleted'), 'true');
});

// 验证首次合并缺少共同基线时纳入双方条目，并保留本地未知 XML 节点。
test('a first merge without a base includes both sides and preserves unknown local XML', () => {
  const local = parseVault(
    `<database><custom keep="yes"/>${card(1, 100, 'Local', 'one')}</database>`,
  );
  const external = vault(card(1, 200, 'Local', 'external') + card(2, 200, 'External', 'two'));
  const result = mergeVaults(null, local, external);
  assert.equal(result.merged, 2);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.doc.querySelector('custom')?.getAttribute('keep'), 'yes');
  assert.equal(cards(result.doc).length, 2);
});

// 验证同一条目的多个字段冲突可分别选择本地或外部值。
test('field-level conflicts can choose local or external values independently', () => {
  const source = (title, stamp, password, notes) =>
    parseVault(
      `<database><label id="1" name="Work"/><card id="1" title="${title}" time_stamp="${stamp}"><field name="Account" type="login">user</field><field name="Password" type="password">${password}</field><notes>${notes}</notes></card></database>`,
    );
  const base = source('Base', 100, 'base-pass', 'base-note');
  const local = source('Local', 200, 'local-pass', 'local-note');
  const external = source('External', 300, 'external-pass', 'external-note');
  const automatic = mergeVaults(base, local, external);
  assert.equal(automatic.conflicts.length, 1);
  const conflict = automatic.conflicts[0];
  assert.ok(conflict.fields.some((field) => field.key === 'title' && field.type === 'text'));
  assert.ok(conflict.fields.some((field) => field.key === 'notes' && field.type === 'text'));
  assert.ok(conflict.fields.some((field) => field.type === 'password'));
  assert.equal(cards(automatic.doc)[0].getAttribute('title'), 'External');
  assert.equal(children(cards(automatic.doc)[0], 'notes')[0].textContent, 'external-note');
  assert.equal(
    fields(cards(automatic.doc)[0]).find((field) => field.getAttribute('type') === 'password')
      .textContent,
    'external-pass',
  );

  const titleKey = conflict.fields.find((field) => field.key === 'title').key;
  const notesKey = conflict.fields.find((field) => field.key === 'notes').key;
  const passwordKey = conflict.fields.find((field) => field.type === 'password').key;
  const chosen = mergeVaults(base, local, external, {
    1: {
      [titleKey]: 'local',
      [notesKey]: 'external',
      [passwordKey]: 'local',
    },
  });
  const card = cards(chosen.doc)[0];
  assert.equal(card.getAttribute('title'), 'Local');
  assert.equal(children(card, 'notes')[0].textContent, 'external-note');
  assert.equal(
    fields(card).find((field) => field.getAttribute('type') === 'password').textContent,
    'local-pass',
  );
  assert.equal(
    fields(card).find((field) => field.getAttribute('type') === 'login').textContent,
    'user',
  );
});

// 验证双方均删除同一条目时直接移除，不产生冲突。
test('both sides deleting the same entry removes it without a conflict', () => {
  const base = vault(card(1, 100, 'Entry', 'base'));
  const result = mergeVaults(base, vault(''), vault(''));
  assert.equal(result.merged, 0);
  assert.equal(result.conflicts.length, 0);
  assert.equal(cards(result.doc).length, 0);
});

// 验证仅一方删除条目时产生明确冲突，允许选择保留或删除。
test('a deletion on one side is an explicit keep-or-delete conflict', () => {
  const base = vault(card(1, 100, 'Entry', 'base'));
  const deleted = vault('');
  const changed = vault(card(1, 200, 'Entry', 'external'));
  const automatic = mergeVaults(base, deleted, changed);
  assert.equal(automatic.conflicts.length, 1);
  const [presence] = automatic.conflicts[0].fields;
  assert.equal(presence.key, 'card');
  assert.equal(presence.type, 'existence');
  assert.equal(presence.local, '删除');
  assert.equal(presence.external, '保留');
  assert.equal(automatic.conflicts[0].chosen, 'external');
  assert.equal(cards(automatic.doc).length, 1);

  const removed = mergeVaults(base, deleted, changed, { 1: { card: 'local' } });
  assert.equal(cards(removed.doc).length, 0);
  assert.equal(removed.conflicts[0].chosen, 'local');

  const mirrored = mergeVaults(base, changed, deleted);
  assert.equal(mirrored.conflicts[0].fields[0].local, '保留');
  assert.equal(mirrored.conflicts[0].fields[0].external, '删除');
  assert.equal(mirrored.conflicts[0].chosen, 'local');
  assert.equal(cards(mirrored.doc).length, 1);

  const removedExternal = mergeVaults(base, changed, deleted, { 1: { card: 'external' } });
  assert.equal(cards(removedExternal.doc).length, 0);
});

// 验证卡片 ID 与对象原型属性同名时，仍能正确保存并应用合并选择。
test('card ids that collide with object prototype keys keep their choices', () => {
  const source = (title, password, stamp) =>
    parseVault(
      `<database><card id="__proto__" title="${title}" time_stamp="${stamp}"><field type="password">${password}</field></card></database>`,
    );
  const choices = JSON.parse('{"__proto__":{"title":"local"}}');
  const result = mergeVaults(
    source('Base', 'base-pass', 100),
    source('Local', 'local-pass', 200),
    source('External', 'external-pass', 300),
    choices,
  );
  const card = cards(result.doc)[0];
  assert.equal(card.getAttribute('title'), 'Local');
  assert.equal(
    fields(card).find((field) => field.getAttribute('type') === 'password').textContent,
    'external-pass',
  );
});
