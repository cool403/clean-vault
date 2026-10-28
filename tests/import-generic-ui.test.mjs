import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createImportWizard } from '../dist/workflow-ui.js';
import { applyImport } from '../dist/import-data.js';
import { parseVault, cards, fields } from '../dist/vault.js';
import { setLanguage } from '../dist/i18n.js';

// 验证通用 CSV 导入先要求映射列，再预览结果并确认写入。
test('generic CSV import asks for column mapping before previewing and committing', async () => {
  const dom = new JSDOM('<dialog id="modal"></dialog>', { url: 'http://localhost/' });
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  const dialog = dom.window.document.querySelector('#modal');
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  setLanguage('en');
  const doc = parseVault('<database/>');
  let committed = false;
  const wizard = createImportWizard({
    dialog,
    getDoc: () => doc,
    show: (content) => {
      dialog.innerHTML = content;
      if (!dialog.open) dialog.showModal();
    },
    close: () => {
      dialog.close();
      dialog.replaceChildren();
    },
    commit: (plan) => {
      applyImport(doc, plan);
      committed = true;
    },
  });
  const submit = () =>
    dialog
      .querySelector('form')
      .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const wait = async (check) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (check()) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.fail('import UI timeout');
  };

  wizard.open();
  const form = dialog.querySelector('#import-form');
  form.elements.format.value = 'generic-csv';
  const source =
    'Name,Login,Secret,Site,Memo,Group,Code,Star\nMapped,carol,pass,https://example.com,note,Team,JBSWY3DPEHPK3PXP,1\n';
  Object.defineProperty(form.elements.file, 'files', {
    configurable: true,
    value: [{ size: source.length, text: async () => source }],
  });
  submit();
  await wait(() => !!dialog.querySelector('#import-map'));
  const mapping = dialog.querySelector('#import-map');
  for (const [key, header] of Object.entries({
    title: 'name',
    username: 'login',
    password: 'secret',
    url: 'site',
    notes: 'memo',
    folder: 'group',
    otp: 'code',
    favorite: 'star',
  }))
    mapping.elements[key].value = header;
  mapping.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(() => !!dialog.querySelector('#import-confirm'));
  assert.match(dialog.querySelector('#import-confirm').textContent, /New 1/);
  dialog
    .querySelector('#import-confirm')
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(() => committed && cards(doc).length === 1);
  const card = cards(doc)[0];
  assert.equal(card.getAttribute('title'), 'Mapped');
  assert.equal(
    fields(card).find((field) => field.getAttribute('type') === 'login').textContent,
    'carol',
  );
  assert.ok(fields(card).some((field) => field.getAttribute('type') === 'one_time_password'));
  assert.equal(doc.querySelector('label').getAttribute('name'), 'Team');
  dom.window.close();
});
