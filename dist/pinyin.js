// Local-only pinyin initial search. Polyphonic characters use their primary reading.
import { pinyinChars, pinyinInitials as initialsData } from './vendor/pinyin-initials.js';

const initials = new Map();
for (let index = 0; index < pinyinChars.length; index++)
  initials.set(pinyinChars[index], initialsData[index]);

export function pinyinSearch(text) {
  let result = '';
  for (const char of String(text || '')) {
    const initial = initials.get(char);
    result += initial || char.toLocaleLowerCase();
  }
  return result;
}
