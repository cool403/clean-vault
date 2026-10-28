import { cards, children, fieldType, fields, parseVault, serializeVault, title } from './vault.js';
import { t } from './i18n.js';

const time = (card) => Number(card?.getAttribute('time_stamp') || 0);
const sameNode = (left, right) =>
  Boolean(left) === Boolean(right) && (!left || serializeVault(left) === serializeVault(right));

function cardMap(doc) {
  return new Map(doc ? cards(doc).map((card) => [card.getAttribute('id'), card]) : []);
}
function fieldMap(card) {
  const counts = new Map();
  const map = new Map();
  if (!card) return map;
  for (const field of fields(card)) {
    const base = fieldType(field) + '\0' + (field.getAttribute('name') || '');
    const index = counts.get(base) || 0;
    counts.set(base, index + 1);
    map.set(`${base}\0${index}`, field);
  }
  return map;
}
function labelNameMap(doc) {
  return new Map(
    children(doc.documentElement, 'label').map((label) => [
      label.getAttribute('id'),
      label.getAttribute('name') || '',
    ]),
  );
}
function uniqueId(used) {
  let id;
  do id = String(crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff);
  while (id === '0' || used.has(id));
  used.add(id);
  return id;
}
function collectLabels(docs) {
  const names = [];
  for (const doc of docs) {
    if (!doc) continue;
    for (const name of labelNameMap(doc).values())
      if (name && !names.includes(name)) names.push(name);
  }
  return names;
}
function sideLabelMap(doc, canonical) {
  const map = new Map();
  if (!doc) return map;
  for (const [id, name] of labelNameMap(doc)) {
    const target = canonical.get(name);
    if (target) map.set(id, target);
  }
  return map;
}
function cardLabelIds(card, map) {
  return [
    ...new Set(
      children(card, 'label_id')
        .map((reference) => map.get(reference.textContent))
        .filter(Boolean),
    ),
  ];
}
function chooseValue(baseValue, localValue, externalValue, localTime, externalTime, choice, meta) {
  const localChanged = baseValue !== localValue;
  const externalChanged = baseValue !== externalValue;
  if (localChanged && externalChanged && localValue !== externalValue) {
    const chosen =
      choice === 'local' || choice === 'external'
        ? choice
        : localTime >= externalTime
          ? 'local'
          : 'external';
    return {
      value: chosen === 'local' ? localValue : externalValue,
      conflict: { ...meta, local: localValue, external: externalValue, chosen },
    };
  }
  if (localChanged) return { value: localValue };
  if (externalChanged) return { value: externalValue };
  return { value: localValue };
}
function chooseField(baseField, localField, externalField, localTime, externalTime, choice, meta) {
  const localChanged = !sameNode(baseField, localField);
  const externalChanged = !sameNode(baseField, externalField);
  if (localChanged && externalChanged && !sameNode(localField, externalField)) {
    const chosen =
      choice === 'local' || choice === 'external'
        ? choice
        : localTime >= externalTime
          ? 'local'
          : 'external';
    return {
      value: chosen === 'local' ? localField : externalField,
      conflict: {
        ...meta,
        local: localField?.textContent || '',
        external: externalField?.textContent || '',
        chosen,
      },
    };
  }
  if (localChanged) return { value: localField };
  if (externalChanged) return { value: externalField };
  return { value: localField };
}
function mergeChangedCard(
  baseCard,
  localCard,
  externalCard,
  localTime,
  externalTime,
  choiceMap,
  labelMaps,
) {
  const skeleton = localTime >= externalTime ? localCard : externalCard;
  const merged = skeleton.cloneNode(true);
  const conflicts = [];
  merged.setAttribute(
    'time_stamp',
    String(Math.max(localTime, externalTime, Number(baseCard?.getAttribute('time_stamp') || 0))),
  );
  const titleChoice = chooseValue(
    baseCard?.getAttribute('title') || '',
    localCard.getAttribute('title') || '',
    externalCard.getAttribute('title') || '',
    localTime,
    externalTime,
    choiceMap.title,
    { key: 'title', label: t('条目名称'), type: 'text' },
  );
  merged.setAttribute('title', titleChoice.value || t('未命名条目'));
  if (titleChoice.conflict) conflicts.push(titleChoice.conflict);
  const notesOf = (card) => (card ? children(card, 'notes')[0]?.textContent || '' : '');
  const notesChoice = chooseValue(
    notesOf(baseCard),
    notesOf(localCard),
    notesOf(externalCard),
    localTime,
    externalTime,
    choiceMap.notes,
    { key: 'notes', label: t('备注'), type: 'text' },
  );
  const notes = children(merged, 'notes')[0];
  if (notesChoice.value) {
    if (notes) notes.textContent = notesChoice.value;
    else {
      const element = merged.ownerDocument.createElement('notes');
      element.textContent = notesChoice.value;
      merged.append(element);
    }
  } else notes?.remove();
  if (notesChoice.conflict) conflicts.push(notesChoice.conflict);
  const flagOf = (card, key) => (card?.getAttribute(key) === 'true' ? 'true' : 'false');
  for (const [key, label] of [
    ['deleted', t('回收站')],
    ['archived', t('归档')],
    ['star', t('收藏')],
  ]) {
    const choice = chooseValue(
      flagOf(baseCard, key),
      flagOf(localCard, key),
      flagOf(externalCard, key),
      localTime,
      externalTime,
      choiceMap[key],
      { key, label, type: 'flag' },
    );
    if (choice.value === 'true') merged.setAttribute(key, 'true');
    else merged.removeAttribute(key);
    if (choice.conflict) conflicts.push(choice.conflict);
  }
  const baseFields = fieldMap(baseCard),
    localFields = fieldMap(localCard),
    externalFields = fieldMap(externalCard);
  const keys = [
    ...new Set([...localFields.keys(), ...externalFields.keys(), ...baseFields.keys()]),
  ];
  for (const field of fields(merged)) field.remove();
  for (const key of keys) {
    const baseField = baseFields.get(key),
      localField = localFields.get(key),
      externalField = externalFields.get(key);
    const sample = localField || externalField || baseField;
    const type = fieldType(sample);
    const label = sample?.getAttribute('name') || type;
    const choice = chooseField(
      baseField,
      localField,
      externalField,
      localTime,
      externalTime,
      choiceMap['field:' + key],
      { key: 'field:' + key, label, type },
    );
    if (choice.value) merged.append(choice.value.cloneNode(true));
    if (choice.conflict) conflicts.push(choice.conflict);
  }
  for (const reference of children(merged, 'label_id')) reference.remove();
  return {
    card: merged,
    conflicts,
    labelIds: [
      ...new Set([
        ...cardLabelIds(localCard, labelMaps.local),
        ...cardLabelIds(externalCard, labelMaps.external),
      ]),
    ],
  };
}
export function mergeVaults(baseDoc, localDoc, externalDoc, choices = {}) {
  const choiceFor = (id) => (choices && Object.hasOwn(choices, id) ? choices[id] : undefined);
  const base = cardMap(baseDoc),
    local = cardMap(localDoc),
    external = cardMap(externalDoc);
  const canonical = new Map();
  const used = new Set(
    [...localDoc.documentElement.children]
      .map((element) => element.getAttribute('id'))
      .filter(Boolean),
  );
  for (const name of collectLabels([baseDoc, localDoc, externalDoc]))
    canonical.set(name, uniqueId(used));
  const labelMaps = {
    local: sideLabelMap(localDoc, canonical),
    external: sideLabelMap(externalDoc, canonical),
  };
  const selected = [];
  const conflicts = [];
  const ids = [...new Set([...local.keys(), ...external.keys(), ...base.keys()])];
  for (const id of ids) {
    const baseCard = base.get(id),
      localCard = local.get(id),
      externalCard = external.get(id);
    const localChanged = !sameNode(baseCard, localCard),
      externalChanged = !sameNode(baseCard, externalCard);
    const localTime = time(localCard),
      externalTime = time(externalCard);
    const select = (card, map) => selected.push({ card, labelIds: cardLabelIds(card, map) });
    if (!baseCard) {
      if (localCard && externalCard) {
        if (sameNode(localCard, externalCard)) select(localCard, labelMaps.local);
        else {
          const merged = mergeChangedCard(
            null,
            localCard,
            externalCard,
            localTime,
            externalTime,
            choiceFor(id) || {},
            labelMaps,
          );
          selected.push({ card: merged.card, labelIds: merged.labelIds });
          if (merged.conflicts.length)
            conflicts.push({
              id,
              title: title(merged.card),
              chosen: localTime >= externalTime ? 'local' : 'external',
              fields: merged.conflicts,
            });
        }
      } else if (localCard) select(localCard, labelMaps.local);
      else if (externalCard) select(externalCard, labelMaps.external);
    } else if (localChanged && externalChanged) {
      if (!localCard && !externalCard) continue;
      if (!localCard || !externalCard) {
        const card = localCard || externalCard;
        const natural = localCard ? 'local' : 'external';
        const preferred = choiceFor(id)?.card;
        const chosen = ['local', 'external'].includes(preferred) ? preferred : natural;
        const kept = chosen === 'local' ? localCard : externalCard;
        if (kept) select(kept, chosen === 'local' ? labelMaps.local : labelMaps.external);
        conflicts.push({
          id,
          title: title(card),
          chosen,
          fields: [
            {
              key: 'card',
              label: t('条目状态'),
              type: 'existence',
              local: localCard ? t('保留') : t('删除'),
              external: externalCard ? t('保留') : t('删除'),
              chosen,
            },
          ],
        });
      } else if (sameNode(localCard, externalCard)) {
        select(localCard, labelMaps.local);
      } else {
        const merged = mergeChangedCard(
          baseCard,
          localCard,
          externalCard,
          localTime,
          externalTime,
          choiceFor(id) || {},
          labelMaps,
        );
        selected.push({ card: merged.card, labelIds: merged.labelIds });
        if (merged.conflicts.length)
          conflicts.push({
            id,
            title: title(merged.card),
            chosen: localTime >= externalTime ? 'local' : 'external',
            fields: merged.conflicts,
          });
      }
    } else if (localChanged) {
      if (localCard) select(localCard, labelMaps.local);
    } else if (externalChanged) {
      if (externalCard) select(externalCard, labelMaps.external);
    } else if (localCard) select(localCard, labelMaps.local);
    else if (externalCard) select(externalCard, labelMaps.external);
  }
  const output = parseVault(serializeVault(localDoc));
  for (const card of children(output.documentElement, 'card'))
    if (card.getAttribute('template') !== 'true') card.remove();
  for (const label of children(output.documentElement, 'label')) label.remove();
  for (const [name, id] of canonical) {
    const label = output.createElement('label');
    label.setAttribute('id', id);
    label.setAttribute('name', name);
    output.documentElement.append(label);
  }
  for (const { card, labelIds } of selected) {
    const clone = output.importNode(card, true);
    for (const reference of children(clone, 'label_id')) reference.remove();
    for (const target of labelIds) {
      const reference = output.createElement('label_id');
      reference.textContent = target;
      clone.append(reference);
    }
    output.documentElement.append(clone);
  }
  return { doc: output, conflicts, merged: selected.length };
}
