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
