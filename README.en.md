# ClearVault

[![Build and deploy](https://github.com/cool403/clean-vault/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/cool403/clean-vault/actions/workflows/deploy.yml)

English · [简体中文](README.md)

An offline-first, SafeInCloud-compatible password manager and TOTP authenticator. A static PWA that decrypts vault files locally in your browser, with no account or application server required.

The app and extension support Chinese, English, German, Japanese and Spanish, matching browser preferences and remembering manual choices. Vault contents are never translated. See [interface languages](docs/USAGE.en.md#interface-languages).

[Open ClearVault](https://clear-vault.app) · [Source](https://github.com/cool403/clean-vault) · [Build history](https://github.com/cool403/clean-vault/actions) · [Security design](SECURITY.md)

## Open source and traceable deployments

Original code is licensed under [MIT](LICENSE): use, modify, distribute and use commercially while retaining the license and copyright notice. See [NOTICE](NOTICE) for third-party licenses. ClearVault is an independent compatibility project, unaffiliated with SafeInCloud.

`dist/` contains readable source. Production builds copy JavaScript **without obfuscation**. A push to `main` runs GitHub Actions to install locked dependencies, check formatting, test source, build packages and test production artifacts. Only a successful build is deployed to Cloudflare Pages. Pull requests run checks without deployment credentials.

The deployed `/build-info.json` identifies the version, Git commit and Actions run. `/ASSET-SHA256SUMS.json` lists deployment file hashes. The downloads page links to the repository, exact source revision and build history. Actions retains web, extension and source ZIPs with SHA-256 manifests. These improve traceability; they do not prove the host serves unmodified code or constitute an independent security audit. You can build and host your own copy.

The public site retains Cloudflare Pages Web Analytics. The host may inject an analytics script into HTML, subject to the site CSP. Manifests describe build artifacts, so hosted HTML can differ from the original hashes; JavaScript, CSS, images and download packages can be compared directly. Self-hosted packages do not include this platform injection.

## Quick start

Requires Node.js 24+ and Python 3.10+.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. Production hosting requires HTTPS; opening HTML directly from disk does not work. After an initial online visit caches application resources, the app can run offline and be installed as a PWA. Clearing browser storage requires another online visit. Cached application files are not a vault backup. Share the online demo link `https://clear-vault.app/?demo=1` to open a demo vault without a file or master password.

```sh
npm test
npm run test:release
```

Deploy `release/web/`. The extension is built into `release/extension/`; `out/` is an identical web copy. Packaging uses explicit source directories, excluding local account configuration, secrets and personal databases. Only three explicitly listed synthetic compatibility fixtures are included.

## Features

- Open SafeInCloud format 1 / 2 `.db` files. Create format 2 vaults with full Unicode master passwords; preserve the format when saving an existing vault.
- Creating a vault shows a local master-password strength estimate and requires acknowledging that it cannot be recovered. Changing it requires the current password. Preferences or the extension's More actions can download a recovery kit without passwords or OTP secrets.
- Entries, multiple fields, notes, labels, favorites, archiving, trash, restoration and a password generator.
- TOTP import through Base32, `otpauth://totp` or local QR images. Supports SHA1 / SHA256 / SHA512, 6 / 8 digits and 1–300 second periods. Keep 30-second periods when sharing files with SafeInCloud 26.0.
- Browsers supporting File System Access can write back to the original file. Saving checks the ciphertext SHA-256, verifies an encrypted backup and reads back the written file. Other browsers download encrypted copies.
- Saving an entry in an existing file automatically backs up and writes the database. Choose a separate backup directory before the first write. Cancellation, conflicts and failures preserve the unsaved state. New vaults and download mode require an explicit database save.
- Backup preview and restoration as a new vault, automatic locking after 1 / 5 / 15 / 30 minutes, English / Simplified Chinese, and offline PWA use.
- Quick search supports pinyin initials, recency ordering, TOTP copying and a command mode (new entry, generate password, lock, switch vault). Large lists render in batches and search results are capped at 50.
- Each save in the app and extension attempts to write encrypted `.db` ciphertext to a local OPFS snapshot, keeping 10 by default. External file changes prompt you to save a copy or reload instead of overwriting.
- Installed Chromium PWAs can open `.db` files from the file manager, and `.db` files can be dropped onto the page. Install guidance covers Chrome / Edge, Android and iOS. iOS Safari does not support file write-back or browser extensions.
- Put the `.db` in a Syncthing, Nextcloud, OneDrive or iCloud Drive folder. When an external change is detected, merge unsaved local edits with the external version and choose local or external values for each conflicting field before saving.
- The Chrome / Edge extension supports multistep login, multiple explicitly added HTTPS origins, searching all entries, copying usernames/passwords, creating an entry for the current website, showing/copying/filling TOTP codes, confirmed password updates, imports and verified saves, without submitting forms.
- Recent vaults remembers only the last opened file name and handle. The current session also unlocks through this list, preserving unsaved edits. Remove or clear history records anytime.
- Import from Chrome, Bitwarden, 1Password, LastPass and Apple Passwords; map columns for generic CSV. Preview and duplicate checks never overwrite existing entries. The app and extension share this flow.
- New empty vaults show a dismissible getting-started checklist: import/first entry, install the extension, first fill, TOTP and backups.
- Local security overview for weak, reused and old passwords and entries without TOTP. Filter by category, batch-add labels, archive or trash entries, and rename, merge or delete labels.

Quick search opens automatically after unlocking an existing vault. It searches titles, usernames, emails, websites, labels and pinyin initials, excluding passwords, PINs, OTP secrets and notes.

| Action            | Windows / Linux      | macOS             |
| ----------------- | -------------------- | ----------------- |
| Open quick search | Ctrl + K             | ⌘ + K             |
| Select result     | ↑ / ↓                | ↑ / ↓             |
| Copy password     | Ctrl + Enter         | ⌘ + Enter         |
| Copy code         | Ctrl + Shift + Enter | ⌘ + Shift + Enter |
| View details      | Enter                | Enter             |
| Command mode      | Type >               | Type >            |
| Lock vault        | Ctrl + Shift + L     | ⌘ + Shift + L     |
| Close search      | Esc                  | Esc               |

Shortcuts work while the application has focus. Search supports IME input and does not interrupt entry editing. After copying a username, password or code, ClearVault tries to clear the system clipboard after 30 seconds by default; choose 15 / 60 seconds or off in app preferences or the extension's More actions menu. Clearing can fail when the window loses focus or the page closes; clear the clipboard manually on shared devices.

## Data and security boundaries

Master passwords, decrypted XML and OTP secrets are not written to localStorage / IndexedDB or uploaded. localStorage stores only non-sensitive preferences and ordering metadata such as interface language, auto-lock minutes, clipboard-clear delay, snapshot retention, recent entry IDs/times and getting-started checklist completion. IndexedDB stores only the last opened file name, handle, record ID and time, with removable history. OPFS snapshots contain only encrypted `.db` ciphertext, never plaintext vault data. The app and extension keep separate histories; permissions may expire. Unavailable storage falls back to session history. The Service Worker caches app resources only. Backup directory permissions and retention settings last for the current session. The hosting server can still see your IP and HTTP metadata.

Editing preserves unknown XML, attachments, images and history. Binary fields are read-only. Attachment management, cloud sync, Passkeys, camera scanning, Firefox extensions and damaged XML repair are not supported. TOTP codes do not add another vault-unlock factor.

Compatibility requires PBKDF2-SHA1 and AES-CBC without body authentication. Browsers cannot guarantee cross-application transaction locks or provable memory erasure. Keep independent encrypted backups and avoid editing a file in two apps at once. Unsaved edits are retained encrypted in page memory while locked; closing or refreshing loses them. Downloading a copy cannot confirm the original file was updated.

No independent security audit has been completed. The extension is not listed in browser stores. Start with synthetic data and a copy of your database. See [SECURITY.md](SECURITY.md) for design limitations and vulnerability reporting, and the [privacy policy](https://clear-vault.app/privacy/) for data handling.

## GitHub Actions → Cloudflare

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It deploys `main` to the existing `clearvault-safeincloud` Pages project serving `clear-vault.app`.

In **Settings → Secrets and variables → Actions**, configure:

| Secret                  | Value                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | An API token with Pages Edit access for the target Cloudflare account |
| `CLOUDFLARE_ACCOUNT_ID` | The corresponding account ID                                          |

You can also store the secrets in the `production` Environment. Never commit tokens. Push to `main` or run the workflow manually after configuration. Disable duplicate Cloudflare automatic builds if another build integration is enabled. See the [deployment guide](docs/GITHUB-CLOUDFLARE.en.md) for setup and rollback instructions.

## Extension and self-hosting

Run `npm run build:extension`. Enable Developer mode in Chrome / Edge's extension manager and load `extension/`, or unpack and load the distributed extension ZIP. Reload after updating. On the target website, click the icon and open your `.db` or a recent vault. Search all entries, copy usernames/passwords, create an entry for the current website, and copy or fill TOTP codes. New websites need authorization. External changes stop filling: save edits as a copy, reload the file and unlock. Hiding the sidebar no longer locks immediately; the selected idle timeout applies.

See the [usage guide](docs/USAGE.en.md) for recent files, imports, multistep filling, multiple URLs, password updates and saving. Matching public guides are generated at `/en/guides/import-passwords/`, `/en/guides/import-1password/`, `/en/guides/import-lastpass/`, `/en/guides/import-apple-passwords/`, `/en/guides/import-generic-csv/`, `/en/guides/sync-folder/` and `/en/guides/browser-extension/`.

For self-hosting, run `npm run test:release` and serve `release/web/` from an HTTPS static host. See [self-hosting](docs/SELF-HOSTING.en.md) for Docker, backup and installation details.

## Mobile and sync

The project currently provides an installable PWA, `.db` file association, page drag-and-drop and per-platform install guidance. System-level Android AutoFill and the iOS Credential Provider are not implemented; the native shell, shared vault core, toolchain and phased acceptance criteria are in the [mobile native shell and AutoFill plan](docs/MOBILE-NATIVE.en.md). BYO sync and conflict merging are available; see the [usage guide](docs/USAGE.en.md).

## Development and contributing

[Developer workflow](docs/DEVELOPER-WORKFLOW.en.md) · [Contributing](CONTRIBUTING.md)

Update both `dist/locales/zh-CN.js` and `dist/locales/en.js` when adding UI text. Never translate user data. Tests cover database round trips, synthetic compatibility fixtures, Unicode, all 18 RFC 6238 vectors, save conflicts, backup restoration, quick search, languages and extension filling. Windows also checks interoperability against the original application when the expected installation is present; Linux CI uses synthetic fixtures and Web Crypto round trips.

QR decoding uses bundled jsQR 1.4.0. jsdom and Prettier are development tools. See [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html).
