import { cards, children, parseVault, serializeVault, title } from './vault.js';

const time = (card) => Number(card?.getAttribute('time_stamp') || 0);
const same = (left, right) =>
  Boolean(left) === Boolean(right) && (!left || serializeVault(left) === serializeVault(right));

function cardMap(doc) {
  return new Map(doc ? cards(doc).map((card) => [card.getAttribute('id'), card]) : []);
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
export function mergeVaults(baseDoc, localDoc, externalDoc) {
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
  const maps = {
    local: sideLabelMap(localDoc, canonical),
    external: sideLabelMap(externalDoc, canonical),
  };
  const selected = [];
  const conflicts = [];
  const ids = [...new Set([...local.keys(), ...external.keys(), ...base.keys()])];
  for (const id of ids) {
    const b = base.get(id),
      l = local.get(id),
      e = external.get(id);
    const localChanged = !same(b, l),
      externalChanged = !same(b, e);
    let chosen = null,
      side = null;
    if (!b) {
      if (l && e) {
        if (same(l, e)) ((chosen = l), (side = 'local'));
        else {
          chosen = time(e) > time(l) ? e : l;
          side = chosen === e ? 'external' : 'local';
          conflicts.push({ id, title: title(chosen), chosen: side });
        }
      } else if (l) ((chosen = l), (side = 'local'));
      else if (e) ((chosen = e), (side = 'external'));
    } else if (localChanged && externalChanged) {
      if (same(l, e)) ((chosen = l), (side = 'local'));
      else if (!l || !e) {
        chosen = l || e;
        side = l ? 'local' : 'external';
        conflicts.push({ id, title: title(chosen), chosen: side });
      } else {
        chosen = time(e) > time(l) ? e : l;
        side = chosen === e ? 'external' : 'local';
        conflicts.push({ id, title: title(chosen), chosen: side });
      }
    } else if (localChanged) ((chosen = l), (side = l ? 'local' : null));
    else if (externalChanged) ((chosen = e), (side = e ? 'external' : null));
    else ((chosen = l), (side = l ? 'local' : null));
    if (chosen && side) selected.push({ card: chosen, side });
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
  for (const { card, side } of selected) {
    const clone = output.importNode(card, true);
    const references = children(clone, 'label_id');
    const mapped = [];
    for (const reference of references) {
      const target = maps[side].get(reference.textContent);
      if (target && !mapped.includes(target)) mapped.push(target);
      reference.remove();
    }
    for (const target of mapped) {
      const reference = output.createElement('label_id');
      reference.textContent = target;
      clone.append(reference);
    }
    output.documentElement.append(clone);
  }
  return { doc: output, conflicts, merged: selected.length };
}
