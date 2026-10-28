import test from 'node:test';
import assert from 'node:assert/strict';
import { pinyinSearch } from '../dist/pinyin.js';

// 验证中文标题可按拼音首字母搜索，且拉丁文本保持原样。
test('pinyin search indexes Chinese titles by initial and preserves Latin text', () => {
  assert.equal(pinyinSearch('微信'), 'wx');
  assert.equal(pinyinSearch('支付宝'), 'zfb');
  assert.equal(pinyinSearch('GitHub 微信'), 'github wx');
  assert.equal(pinyinSearch(''), '');
  assert.ok(pinyinSearch('微信').includes('wx'));
});
