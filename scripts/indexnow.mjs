// Submit the published URLs to IndexNow (Bing, Yandex, Naver, Seznam).
//
//   1. Pick a key: 8-128 characters of [A-Za-z0-9-]. It is public by design.
//   2. Export it as INDEXNOW_KEY (locally) or as a GitHub Actions secret.
//   3. npm run release     – writes /<key>.txt into the deployment.
//   4. Deploy, then run `npm run indexnow`.
//
// The key file has to be live before the URLs are submitted: IndexNow verifies it by
// fetching https://<host>/<key>.txt and answers 403 while it is missing.
import { readFile, writeFile } from 'node:fs/promises';

const host = 'clear-vault.app';
const endpoint = 'https://api.indexnow.org/indexnow';
const dist = new URL('../dist/', import.meta.url);
const key = (process.env.INDEXNOW_KEY || '').trim();
const dryRun = process.argv.includes('--dry-run');

if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  console.error('INDEXNOW_KEY must be 8-128 characters of [A-Za-z0-9-].');
  process.exit(2);
}

const keyLocation = `https://${host}/${key}.txt`;
const keyFile = new URL(`${key}.txt`, dist);
let existing = null;
try {
  existing = await readFile(keyFile, 'utf8');
} catch {
  // First run for this key: create the file the deployment has to serve.
}
if (existing === null) {
  await writeFile(keyFile, `${key}\n`);
  console.log(`Wrote dist/${key}.txt — it must be deployed before submitting.`);
} else if (existing.trim() !== key) {
  console.error(`dist/${key}.txt already exists with different content; refusing to overwrite.`);
  process.exit(2);
}

const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
if (urlList.length === 0) {
  console.error('No URLs found in dist/sitemap.xml.');
  process.exit(2);
}
if (dryRun) {
  console.log(`Would submit ${urlList.length} URLs to ${endpoint}:`);
  for (const url of urlList) console.log(`  ${url}`);
  process.exit(0);
}

// Preflight: a key file that does not answer yet makes IndexNow reject the whole batch.
const preflight = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
const served = preflight.ok ? (await preflight.text()).trim() : '';
if (served !== key) {
  console.error(`Key file ${keyLocation} is not live (HTTP ${preflight.status}). Deploy first.`);
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
  signal: AbortSignal.timeout(20000),
});
// 200 accepted, 202 accepted and queued, 403 key file missing, 422 key mismatch.
if (response.status === 200 || response.status === 202) {
  console.log(`Submitted ${urlList.length} URLs to IndexNow (HTTP ${response.status}).`);
} else {
  console.error(`IndexNow rejected the submission: HTTP ${response.status}`);
  console.error((await response.text()).slice(0, 500));
  process.exit(1);
}
