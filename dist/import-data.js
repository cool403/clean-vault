import { t } from './i18n.js';
import { parseOTP } from './totp.js';
import { cards, children, fields, fieldType, newCard, setField } from './vault.js';

export function parseCSV(source) {
  const rows = [];
  let row = [],
    value = '',
    quoted = false,
    closed = false;
  source = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
        closed = true;
      } else value += character;
    } else if (character === '"') {
      if (value || closed) throw new Error(t('CSV 格式无效，请使用原始导出文件'));
      quoted = true;
    } else if (character === ',' || character === '\n' || character === '\r') {
      row.push(value);
      value = '';
      closed = false;
      if (character !== ',') {
        if (row.some((cell) => cell !== '')) rows.push(row);
        row = [];
        if (character === '\r' && source[index + 1] === '\n') index++;
      }
    } else {
      if (closed) throw new Error(t('CSV 格式无效，请使用原始导出文件'));
      value += character;
    }
    if (rows.length > 10001) throw new Error(t('一次最多导入 10000 个条目，请拆分文件'));
  }
  if (quoted) throw new Error(t('CSV 格式无效，请使用原始导出文件'));
  row.push(value);
  if (row.some((cell) => cell !== '')) rows.push(row);
  const headers = rows.shift()?.map((header) => header.trim().toLowerCase());
  if (rows.length > 10000) throw new Error(t('一次最多导入 10000 个条目，请拆分文件'));
  if (!headers?.length || new Set(headers).size !== headers.length)
    throw new Error(t('CSV 格式无效，请使用原始导出文件'));
  return rows.map((cells) => {
    if (cells.length !== headers.length) throw new Error(t('CSV 列数不一致，请使用原始导出文件'));
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}
const string = (value) => (typeof value === 'string' ? value : '');
const aliases = {
  title: ['title', 'name', 'entry', 'item'],
  username: ['username', 'login_username', 'user', 'login', 'account'],
  password: ['password', 'login_password', 'pass', 'secret'],
  url: ['url', 'website', 'login_uri', 'uri', 'web site', 'site', 'link'],
  notes: ['notes', 'note', 'extra', 'comments', 'memo'],
  folder: ['folder', 'grouping', 'tags', 'group', 'category'],
  otp: ['otpauth', 'otp', 'one-time password', 'one_time_password', 'totp', '2fa'],
  favorite: ['favorite', 'fav', 'starred', 'star'],
};
export function guessCSVMapping(headers) {
  const normalized = headers.map((header) => String(header).trim().toLowerCase());
  const mapping = {};
  for (const [key, candidates] of Object.entries(aliases)) {
    const found = candidates.find((candidate) => normalized.includes(candidate));
    if (found) mapping[key] = found;
  }
  return mapping;
}
function mappedValue(row, mapping, key) {
  const header = mapping?.[key];
  return header ? string(row[String(header).trim().toLowerCase()]) : '';
}
function mappedFolders(value) {
  return [
    ...new Set(
      String(value || '')
        .split(/[,;]/)
        .map((folder) => folder.trim())
        .filter(Boolean),
    ),
  ];
}
const mappedFavorite = (value) => ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
function folderIdentity(item) {
  const folders = item.folders?.filter(Boolean) || (item.folder ? [item.folder] : []);
  return [...new Set(folders)].sort().join('\n');
}
const coreNames = () => ({
  login: t('账号'),
  password: t('密码'),
  website: t('网站'),
  one_time_password: t('两步验证码'),
});
function record(name, notes, favorite, folder, values) {
  return { title: name || t('未命名条目'), notes, favorite, folder, fields: values };
}
function basicFields(username, password, uris, otp, warnings) {
  const names = coreNames();
  const values = [
    ['login', username],
    ['password', password],
    ...uris.map((uri) => ['website', uri]),
  ];
  if (otp) {
    try {
      const config = parseOTP(otp);
      config.secret.fill(0);
      values.push(['one_time_password', otp]);
    } catch {
      warnings.add(t('部分验证密钥不受支持，已原样保留为私密字段'));
      values.push(['secret', otp]);
    }
  }
  return values
    .filter(([, value]) => value !== '')
    .map(([type, value]) => ({ type, value, name: names[type] || t('验证密钥') }));
}
export function parseImport(source, format, options = {}) {
  if (new TextEncoder().encode(source).length > 20 * 1024 * 1024)
    throw new Error(t('导入文件不能超过 20 MB'));
  let records = [],
    skipped = 0;
  const warnings = new Set();
  if (format === 'bitwarden-json') {
    let data;
    try {
      data = JSON.parse(source.replace(/^\uFEFF/, ''));
    } catch {
      throw new Error(t('JSON 格式无效，请选择未加密的 Bitwarden JSON 导出'));
    }
    if (!data || data.encrypted || !Array.isArray(data.items))
      throw new Error(t('JSON 格式无效，请选择未加密的 Bitwarden JSON 导出'));
    if (data.items.length > 10000) throw new Error(t('一次最多导入 10000 个条目，请拆分文件'));
    const folders = new Map(
      (Array.isArray(data.folders) ? data.folders : [])
        .filter(Boolean)
        .map((folder) => [folder.id, string(folder.name)]),
    );
    for (const item of data.items) {
      if (
        !item ||
        ![1, 2].includes(item.type) ||
        (item.type === 1 && (!item.login || typeof item.login !== 'object'))
      ) {
        skipped++;
        continue;
      }
      const login = item.login || {};
      const values = basicFields(
        string(login.username),
        string(login.password),
        (Array.isArray(login.uris) ? login.uris : [])
          .map((uri) => string(uri?.uri))
          .filter(Boolean),
        string(login.totp),
        warnings,
      );
      for (const custom of Array.isArray(item.fields) ? item.fields : []) {
        if (custom && [0, 1, 2].includes(custom.type))
          values.push({
            name: string(custom.name),
            type: custom.type === 1 ? 'secret' : 'text',
            value: string(custom.value),
          });
        else warnings.add(t('附件、通行密钥和关联字段未导入，请保留源数据'));
      }
      if (item.attachments?.length || login.fido2Credentials?.length)
        warnings.add(t('附件、通行密钥和关联字段未导入，请保留源数据'));
      records.push(
        record(
          string(item.name),
          string(item.notes),
          item.favorite === true,
          folders.get(item.folderId) || '',
          values,
        ),
      );
    }
  } else {
    const rows = parseCSV(source);
    if (format === 'chrome-csv') {
      for (const row of rows) {
        if (!['name', 'url', 'username', 'password'].every((key) => Object.hasOwn(row, key)))
          throw new Error(t('文件列与所选来源不匹配，请检查导入格式'));
        records.push(
          record(
            row.name,
            row.note || row.notes || '',
            false,
            '',
            basicFields(row.username, row.password, [row.url].filter(Boolean), '', warnings),
          ),
        );
      }
    } else if (format === 'bitwarden-csv') {
      for (const row of rows) {
        if (
          !['type', 'name', 'login_uri', 'login_username', 'login_password'].every((key) =>
            Object.hasOwn(row, key),
          )
        )
          throw new Error(t('文件列与所选来源不匹配，请检查导入格式'));
        if (!['login', 'note'].includes(row.type)) {
          skipped++;
          continue;
        }
        const values = basicFields(
          row.login_username,
          row.login_password,
          [row.login_uri].filter(Boolean),
          row.login_totp || '',
          warnings,
        );
        if (row.fields)
          values.push({ name: t('导入的自定义字段'), type: 'secret', value: row.fields });
        records.push(
          record(
            row.name,
            row.notes || '',
            row.favorite === '1' || row.favorite === 'true',
            row.folder || '',
            values,
          ),
        );
      }
    } else {
      const headers = rows.length ? Object.keys(rows[0]) : [];
      let mapping;
      if (format === 'lastpass-csv') {
        if (!['name', 'url', 'username', 'password'].every((key) => headers.includes(key)))
          throw new Error(t('文件列与所选来源不匹配，请检查导入格式'));
        mapping = {
          title: 'name',
          username: 'username',
          password: 'password',
          url: 'url',
          notes: 'extra',
          folder: 'grouping',
          favorite: 'fav',
        };
      } else if (format === '1password-csv' || format === 'apple-csv' || format === 'generic-csv') {
        mapping =
          format === 'generic-csv'
            ? options.mapping || guessCSVMapping(headers)
            : guessCSVMapping(headers);
        if (format === 'generic-csv') {
          if (!mapping || !Object.values(mapping).some(Boolean))
            throw new Error(t('请至少映射一个 CSV 字段'));
          if (!['title', 'username', 'password', 'url', 'notes'].some((key) => mapping[key]))
            throw new Error(t('请至少映射条目名称、账号、密码、网址或备注中的一列'));
        } else if (
          !['title', 'name'].some((key) => headers.includes(key)) ||
          !['username', 'password', 'url', 'website', 'otpauth', 'notes', 'note'].some((key) =>
            headers.includes(key),
          )
        ) {
          throw new Error(t('文件列与所选来源不匹配，请检查导入格式'));
        }
      } else throw new Error(t('文件列与所选来源不匹配，请检查导入格式'));
      for (const row of rows) {
        const title = mappedValue(row, mapping, 'title');
        const username = mappedValue(row, mapping, 'username');
        const password = mappedValue(row, mapping, 'password');
        const notes = mappedValue(row, mapping, 'notes');
        const otp = mappedValue(row, mapping, 'otp').trim();
        let url = mappedValue(row, mapping, 'url').trim();
        if (format === 'lastpass-csv' && url.toLowerCase() === 'http://sn') url = '';
        if (![title, username, password, url, notes, otp].some(Boolean)) {
          skipped++;
          continue;
        }
        const folders = mappedFolders(mappedValue(row, mapping, 'folder'));
        const entry = record(
          title,
          notes,
          mappedFavorite(mappedValue(row, mapping, 'favorite')),
          folders.length === 1 ? folders[0] : '',
          basicFields(username, password, url ? [url] : [], otp, warnings),
        );
        if (folders.length > 1) entry.folders = folders;
        records.push(entry);
      }
    }
  }
  if (!records.length && !skipped) throw new Error(t('导入文件中没有条目'));
  return { records, skipped, warnings: [...warnings] };
}
function identity(item) {
  return JSON.stringify([
    item.title,
    item.notes,
    item.favorite,
    folderIdentity(item),
    item.fields
      .map((field) => [
        field.type,
        ['login', 'email', 'password', 'website', 'one_time_password'].includes(field.type)
          ? ''
          : field.name,
        field.value,
      ])
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  ]);
}
export function planImport(doc, parsed) {
  const labels = new Map(
    children(doc.documentElement, 'label').map((label) => [
      label.getAttribute('id'),
      label.getAttribute('name'),
    ]),
  );
  const known = new Set(
    cards(doc)
      .filter((card) => card.getAttribute('deleted') !== 'true')
      .map((card) => {
        const folder = children(card, 'label_id')
          .map((label) => labels.get(label.textContent))
          .filter(Boolean)
          .sort()
          .join('\n');
        const values = fields(card).map((field) => ({
          type: fieldType(field),
          name: field.getAttribute('name') || '',
          value: field.textContent,
        }));
        return identity(
          record(
            card.getAttribute('title') || t('未命名条目'),
            children(card, 'notes')[0]?.textContent || '',
            card.getAttribute('star') === 'true',
            folder,
            values,
          ),
        );
      }),
  );
  const records = [];
  let duplicates = 0;
  for (const item of parsed.records) {
    const key = identity(item);
    if (known.has(key)) duplicates++;
    else {
      known.add(key);
      records.push(item);
    }
  }
  return { ...parsed, records, duplicates };
}
export function applyImport(doc, plan) {
  const created = [];
  const ids = new Set([...doc.documentElement.children].map((entry) => entry.getAttribute('id')));
  const labels = new Map(
    children(doc.documentElement, 'label').map((entry) => [entry.getAttribute('name'), entry]),
  );
  const pending = doc.createDocumentFragment();
  for (const item of plan.records) {
    const card = newCard(doc, ids);
    card.setAttribute('title', item.title);
    if (item.favorite) card.setAttribute('star', 'true');
    for (const field of item.fields) setField(card, field.name, field.value, field.type);
    if (item.notes) {
      const notes = doc.createElement('notes');
      notes.textContent = item.notes;
      card.append(notes);
    }
    const folders = item.folders?.filter(Boolean) || (item.folder ? [item.folder] : []);
    for (const folderName of new Set(folders)) {
      let label = labels.get(folderName);
      if (!label) {
        label = doc.createElement('label');
        label.setAttribute('id', newCard(doc, ids).getAttribute('id'));
        label.setAttribute('name', folderName);
        doc.documentElement.append(label);
        labels.set(folderName, label);
      }
      const reference = doc.createElement('label_id');
      reference.textContent = label.getAttribute('id');
      card.append(reference);
    }
    pending.append(card);
    created.push(card);
  }
  doc.documentElement.append(pending);
  return created;
}
