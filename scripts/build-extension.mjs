import { mkdir, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
for (const file of [
  'crypto.js',
  'clipboard.js',
  'password-strength.js',
  'vault.js',
  'totp.js',
  'password-generator.js',
  'safe-save.js',
  'recent-files.js',
  'import-data.js',
  'workflow-ui.js',
  'workflow.css',
  'i18n.js',
  'locales/en.js',
  'locales/zh-CN.js',
  'locales/de.js',
  'locales/ja.js',
  'locales/es.js',
  'icon-16.png',
  'icon-32.png',
  'icon-48.png',
  'icon-128.png',
  'icon-192.png',
]) {
  const target = new URL('extension/core/' + file, root);
  await mkdir(new URL('./', target), { recursive: true });
  await copyFile(new URL('dist/' + file, root), target);
}
console.log(
  'Built extension/ from shared vault core. Load this directory as an unpacked extension.',
);
