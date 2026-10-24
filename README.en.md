# ClearVault

English · [简体中文](README.md)

An offline-first, SafeInCloud-compatible password manager and TOTP authenticator. A static PWA that decrypts vault files locally in your browser, with no account or application server required.

[Open ClearVault](https://clear-vault.app) · [Source](https://github.com/cool403/clean-vault) · [Build history](https://github.com/cool403/clean-vault/actions) · [Security design](SECURITY.md)

## Open source and traceable deployments

Original code is licensed under [MIT](LICENSE): use, modify, distribute and use commercially while retaining the license and copyright notice. See [NOTICE](NOTICE) for third-party licenses. ClearVault is an independent compatibility project, unaffiliated with SafeInCloud.

`dist/` contains readable source. Production builds copy JavaScript **without obfuscation**. A push to `main` runs GitHub Actions to install locked dependencies, check formatting, test source, build packages and test production artifacts. Only a successful build is deployed to Cloudflare Pages. Pull requests run checks without deployment credentials.

The deployed `/build-info.json` identifies the version, Git commit and Actions run. `/ASSET-SHA256SUMS.json` lists deployment file hashes. The downloads page links to the repository, exact source revision and build history. Actions retains web, extension and source ZIPs with SHA-256 manifests. These improve traceability; they do not prove the host serves unmodified code or constitute an independent security audit. You can build and host your own copy.

## Quick start

Requires Node.js 24+ and Python 3.10+.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. Production hosting requires HTTPS; opening HTML directly from disk does not work. After an initial online visit caches application resources, the app can run offline and be installed as a PWA. Clearing browser storage requires another online visit. Cached application files are not a vault backup.

```sh
npm test
npm run test:release
```

Deploy `release/web/`. The extension is built into `release/extension/`; `out/` is an identical web copy. Packaging uses explicit source directories, excluding local account configuration, secrets and personal databases. Only three explicitly listed synthetic compatibility fixtures are included.

## Features

- Open SafeInCloud format 1 / 2 `.db` files. Create format 2 vaults with full Unicode master passwords; preserve the format when saving an existing vault.
- Entries, multiple fields, notes, labels, favorites, archiving, trash, restoration and a password generator.
- TOTP import through Base32, `otpauth://totp` or local QR images. Supports SHA1 / SHA256 / SHA512, 6 / 8 digits and 1–300 second periods. Keep 30-second periods when sharing files with SafeInCloud 26.0.
- Browsers supporting File System Access can write back to the original file. Saving checks the ciphertext SHA-256, verifies an encrypted backup and reads back the written file. Other browsers download encrypted copies.
- Saving an entry in an existing file automatically backs up and writes the database. Choose a separate backup directory before the first write. Cancellation, conflicts and failures preserve the unsaved state. New vaults and download mode require an explicit database save.
- Backup preview and restoration as a new vault, automatic locking after 1 / 5 / 15 / 30 minutes, English / Simplified Chinese, and offline PWA use.
- A Chrome / Edge sidebar extension opens vaults read-only and manually fills one selected account for an exact HTTPS origin, without submitting forms.

Quick search opens automatically after unlocking an existing vault. It searches titles, usernames, emails, websites and labels, excluding passwords, PINs, OTP secrets and notes.

| Action            | Windows / Linux  | macOS         |
| ----------------- | ---------------- | ------------- |
| Open quick search | Ctrl + K         | ⌘ + K         |
| Select result     | ↑ / ↓            | ↑ / ↓         |
| Copy password     | Ctrl + Enter     | ⌘ + Enter     |
| View details      | Enter            | Enter         |
| Lock vault        | Ctrl + Shift + L | ⌘ + Shift + L |
| Close search      | Esc              | Esc           |

Shortcuts work while the application has focus. Search supports IME input and does not interrupt entry editing. Copied data remains in the system clipboard after locking.

## Data and security boundaries

Master passwords, decrypted XML and OTP secrets are not written to localStorage / IndexedDB or uploaded. localStorage stores only the language preference; the Service Worker caches application resources. File permissions, backup permissions and retention settings last only for the current page session. The hosting server can still see your IP and HTTP request metadata.

Editing preserves unknown XML, attachments, images and history. Binary fields are read-only. Attachment management, cloud sync, Passkeys, camera scanning, Firefox extensions and damaged XML repair are not supported. TOTP codes do not add another vault-unlock factor.

Compatibility requires PBKDF2-SHA1 and AES-CBC without body authentication. Browsers cannot guarantee cross-application transaction locks or provable memory erasure. Keep independent encrypted backups and avoid editing a file in two apps at once. Unsaved edits are retained encrypted in page memory while locked; closing or refreshing loses them. Downloading a copy cannot confirm the original file was updated.

No independent security audit has been completed. The extension is not listed in browser stores. Start with synthetic data and a copy of your database. See [SECURITY.md](SECURITY.md) for design limitations and vulnerability reporting.

## GitHub Actions → Cloudflare

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It deploys `main` to the existing `clearvault-safeincloud` Pages project serving `clear-vault.app`.

In **Settings → Secrets and variables → Actions**, configure:

| Secret                  | Value                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | An API token with Pages Edit access for the target Cloudflare account |
| `CLOUDFLARE_ACCOUNT_ID` | The corresponding account ID                                          |

You can also store the secrets in the `production` Environment. Never commit tokens. Push to `main` or run the workflow manually after configuration. Disable duplicate Cloudflare automatic builds if another build integration is enabled. See the [deployment guide](docs/GITHUB-CLOUDFLARE.md) for setup and rollback instructions.

## Extension and self-hosting

Run `npm run build:extension`. Enable Developer mode in Chrome / Edge's extension manager and load `extension/`, or unpack and load the distributed extension ZIP. On the target website, click the extension icon and open your `.db`. Each new site requires authorization. Reopen the file in the extension after changes in the PWA.

For self-hosting, run `npm run test:release` and serve `release/web/` from an HTTPS static host. See [self-hosting](docs/SELF-HOSTING.md) for Docker, backup and installation details.

## Development and contributing

[Developer workflow](docs/DEVELOPER-WORKFLOW.md) · [Contributing](CONTRIBUTING.md)

Update both `dist/locales/zh-CN.js` and `dist/locales/en.js` when adding UI text. Never translate user data. Tests cover database round trips, synthetic compatibility fixtures, Unicode, all 18 RFC 6238 vectors, save conflicts, backup restoration, quick search, languages and extension filling. Windows also checks interoperability against the original application when the expected installation is present; Linux CI uses synthetic fixtures and Web Crypto round trips.

QR decoding uses bundled jsQR 1.4.0. jsdom and Prettier are development tools. See [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html).
