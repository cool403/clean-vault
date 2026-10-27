# ClearVault Privacy Policy

Last updated: 2026-10-27

ClearVault is an independent, local-first password manager and TOTP companion for
SafeInCloud-compatible `.db` files. It is not affiliated with SafeInCloud.

## Data ClearVault handles

- The `.db` vault file selected by the user.
- The master password entered by the user, used only to decrypt that file locally.
- Vault entries, notes, TOTP secrets and other fields inside the file.
- Local preferences such as interface language, auto-lock minutes, clipboard-clear
  delay and snapshot retention.
- Recent-vault metadata: file name, file handle, record ID, time and an optional
  user-confirmed directory text label.
- Recent-usage metadata: entry IDs and times used only to order quick-search results.
- Getting-started checklist completion flags, stored per vault name.
- Encrypted snapshots of the `.db` ciphertext in the browser's origin-private file
  system (OPFS), when supported.

## How data is stored

- The master password, decrypted XML and TOTP secrets are kept in page memory while
  the vault is unlocked. They are not written to `localStorage`, IndexedDB, OPFS or
  extension storage.
- `localStorage` stores only non-sensitive preferences and ordering metadata.
- IndexedDB stores recent-vault metadata, never passwords or vault contents.
- OPFS snapshots contain encrypted `.db` ciphertext only.
- The browser extension has no `storage` permission and makes no network requests.
  Its CSP sets `connect-src 'none'`.

## Network and analytics

The extension does not upload vault data, make network requests or include analytics.
The hosted ClearVault website is a static PWA. The public Cloudflare Pages deployment
retains Cloudflare Pages Web Analytics, which may inject a hosting-platform script
into HTML; it does not receive vault contents. Self-hosted copies do not include this
injection. The hosting provider can see IP addresses and HTTP metadata for site visits.

## Sharing and sale

ClearVault does not sell, rent or transfer user data. There is no account system and
no server-side vault storage. Clipboard contents may be readable by other local
applications until cleared; clearing is best effort.

## Permissions

`activeTab` grants temporary access after the user clicks the extension icon.
`scripting` fills only the selected credentials or code into the active tab after an
explicit action. `sidePanel` provides the extension interface. ClearVault does not
request global host permissions or use persistent content scripts.

## Retention and deletion

Locking or closing the extension releases memory. Recent-vault records can be removed
individually or cleared. Recent usage can be cleared in Preferences. Local snapshots
can be cleared in Preferences; clearing site data also deletes them. The user controls
the `.db` file and any exported CSV or recovery kit.

## Children

ClearVault is a general-purpose password tool and is not directed at children.

## Changes and contact

Material changes will be documented in the repository. Report privacy or security
issues through the repository's issue tracker without including real vault data,
master passwords or OTP secrets. The project has not completed an independent security
audit.

Repository: https://github.com/cool403/clean-vault
