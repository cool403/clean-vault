# Recent vaults, imports and the browser extension

English · [简体中文](USAGE.md)

## Interface languages

The app and browser extension support 简体中文, English, Deutsch, 日本語 and Español. On first use they match the browser's preferred languages, with English as the fallback. Use the language selector at the top of the page or sidebar, or in the app's Preferences. The choice is remembered locally, separately for the app and extension. Switching closes the current dialog, so finish editing first; unsaved changes already applied in the main interface are retained.

Open `/?lang=de`, `/?lang=ja` or `/?lang=es` to launch in a specific language; this parameter takes precedence over the saved choice. Interface text, messages, dates and installation metadata follow the selected language. Vault names, accounts, passwords and notes are never translated. Language switching also works offline. Public guides and security documentation remain available in Chinese and English; other interface languages link to the English documentation.

## Getting-started checklist

A new empty vault shows a dismissible checklist above the list: import or add the first entry, install the browser extension, fill or copy once, add an authenticator, and save with backups. Entry and authenticator steps complete automatically; extension and first-fill steps can be checked manually; choose Later to hide the checklist. Completion is stored per vault name and contains no vault contents.

## Security overview, batch actions and labels

Security overview in the sidebar calculates four local issues: weak passwords (under 12 characters or low strength), passwords reused by multiple entries, entries not changed for over a year, and entries with a password but no TOTP. Choose a card to filter the list; clear the filter at the top. The report is calculated in memory from decrypted entries and never uploads passwords.

Filtered results support batch selection: select all, clear, add a label, archive or move to trash. The gear beside Labels opens Manage labels for rename, merge and delete; deleting a label removes only that label from entries, not the entries themselves.

## Quick search, pinyin and commands

Quick search opens automatically after unlocking, or press Ctrl / ⌘ + K. It searches names, accounts, websites, labels and pinyin initials (for example, `wx` for 微信). Title-prefix matches rank first, followed by recently used entries. Ctrl / ⌘ + Enter copies the password, Ctrl / ⌘ + Shift + Enter copies the code, and Enter opens details.

Type `>` for command mode: new entry, add authenticator, generate password, lock vault, open another vault and preferences. Quick search shows at most 50 results for large vaults; keep typing to narrow them. The main list renders 200 entries first and offers Show more.

Recent usage stores only entry IDs and times for ordering; clear them with Clear recent usage in Preferences. Passwords, OTP secrets and notes are not stored. Polyphonic characters use their primary reading for pinyin indexing.

## Install, file association and drag-and-drop

Chrome / Edge desktop: use the install icon in the address bar or the browser menu. Android Chrome: open the browser menu and choose Install app or Add to Home Screen. iPhone / iPad Safari: tap Share and choose Add to Home Screen. The first installed launch needs an online visit to cache app resources.

Installed Chromium PWAs can open `.db` files from the system file manager, and `.db` files can be dropped directly onto the page. Files are decrypted locally and never uploaded. iOS Safari does not support file write-back or browser extensions; keep encrypted backups.

## Recent vaults

After successfully unlocking or saving a file, the app or extension remembers up to five recent vaults. Records contain only file names, handles, record IDs, times and folder text labels you confirm, never master passwords, entries or vault contents. The app and extension keep separate histories.

Use history on the app home screen, in preferences or on the extension lock screen. Grant file access again if requested, then enter the master password. Moved or deleted files must be selected again. Ordinary file input supplies no reusable handle and is marked accordingly. Unavailable storage falls back to current page session history.

Selected files and locked vaults now use this same list, without a separate reopen link. The current session merges with its history record and shows Unlock current session, or Unlock and continue unsaved changes when edits are pending. It resumes the encrypted copy in this page instead of reopening a disk file. A file not yet unlocked or a new unsaved vault appears as a temporary entry, which may be shown in addition to the five stored records. Clearing history keeps the current encrypted session. Refreshing or closing still loses unsaved edits.

Browsers do not expose complete local absolute paths. When directory selection and a reusable file handle are available, use the folder icon to Confirm containing folder and select a directory containing that vault with read-only access. The app checks that it actually contains the file, then displays Last confirmed folder, such as `Documents/Passwords`: `Documents` is the chosen folder name and `Passwords` is a relative subdirectory. A wrong folder is rejected; cancellation keeps the record unchanged. Directory handles are not stored and other files in the folder are not read. Confirm again after moving files: this label is historical, not a live absolute path. With ordinary file input or unsupported directory selection, verify the location in the system file picker.

Remove individual records or clear history. This removes shortcuts only, not files on disk. History is not a backup and does not save edits.

## Master password and recovery kit

Creating a vault shows a local strength estimate and requires acknowledging that the master password cannot be recovered. Changing it requires the current master password. The estimate is a local heuristic, not a security guarantee; use at least 12–16 characters with a mix of character types, preferably a long passphrase.

Choose Recovery kit in the app's Preferences or the extension's More actions to download a plain-text sheet with blank lines for the master password and backup location, recovery steps and safety notes. It contains no passwords, TOTP secrets or vault contents. Print it, write the master password by hand and store it separately from vault backups. ClearVault cannot recover a lost master password.

## Import from another password manager

1. Export a plaintext file first: Chrome from Google Password Manager as CSV; Bitwarden as unencrypted CSV or JSON; 1Password as CSV; LastPass from account settings as CSV; Apple Passwords from the Passwords app with Export All Passwords. Generic CSV files need a header row. See [Chrome export help](https://support.google.com/chrome/answer/13068232) and [Bitwarden file formats](https://bitwarden.com/help/condition-bitwarden-import/).
2. Open or create a destination vault in the app, or open an existing `.db` in the extension, then unlock. Choose Import passwords from the app toolbar, preferences or extension.
3. Choose the source and file. Chrome, Bitwarden, 1Password, LastPass and Apple Passwords use built-in parsers. Generic CSV asks you to map columns to title, username, password, URL, notes, tags, TOTP and favorite. The limit is 20 MB and 10,000 entries. Preview shows new, duplicate and unsupported counts and the first ten names and accounts, without displaying passwords.
4. Check the mapping: names become titles, usernames become accounts, URLs become website fields and folders/tags become labels. Passwords, notes and favorites are retained. 1Password and Apple OTPAuth values become TOTP codes; multiple 1Password tags become separate labels; LastPass `http://sn` secure notes import as notes without a website. Identical entries are skipped; changed passwords or contents create separate entries without overwriting.
5. Confirm and choose Save database. Select a separate encrypted backup directory before the first overwrite. Reopen the saved `.db` to check the results. Downloads only confirm export was started: check the file on disk. Carefully remove plaintext source exports only after verifying the encrypted save and complete migration.

Attachments, passkeys, archived flags, card/identity types and source URL-matching rules are not migrated. Unsupported TOTP secrets are preserved as private fields. Keep your original data until verification is complete.

Cancel, Esc, locking and completing an import release preview references. Imports do not upload files or automatically save the vault.

## Fill logins and add websites

Install as described in [self-hosting](SELF-HOSTING.en.md). Reload the extension in the browser extension manager after an update, then reopen its sidebar.

1. Visit the intended HTTPS website, click the extension icon to grant access, choose a file or recent vault and unlock.
2. Check the website and account, then click Fill this login. Submit yourself. On username-first sites only a unique, explicit username or email input is filled. Continue on the website, then click Fill again on the password page. A different origin needs fresh toolbar authorization.
3. For another website using the same account, authorize it, choose Add website address, check the full origin, select the entry, confirm and save. The app editor also has Add website address. Hosts, subdomains and ports are matched exactly, without automatic scope expansion.
4. Show all entries lets you update other entries; filling stays disabled for nonmatching websites. Multiple password fields, OTP inputs you did not explicitly click, new-password forms and iframes are not filled automatically.

After unlocking you can also:

- Search all entries by name, account, website or label. Search results can copy a username or password; filling stays disabled for nonmatching websites.
- Choose New entry to save a login for the current website. The HTTPS origin is prefilled and a password can be generated. The entry stays in the current session until you choose Save database.
- Entries with TOTP show the current code and remaining time in the list. Choose Copy to copy it, or Fill code to fill a unique, explicit verification-code input on the matching website. Nothing is submitted automatically; enter the code manually if no unique input is found.

## Confirm password updates

Choose Update password for the entry while changing its website password. Enter the new value twice, or explicitly click Read new password from this website. Reading accepts only visible `new-password` fields on the currently matching HTTPS origin, with equal values for confirmation fields. Enter it manually if identification fails. Reading only populates the extension confirmation form. When an entry has multiple password fields, choose the intended field.

Verify the entry and that the website accepted the change, then confirm and Save database. The extension does not monitor website input or submissions or collect passwords in the background. Unsaved status remains visible after updates and imports.

## Clipboard auto-clear

After copying a username, password or code, ClearVault tries to clear the system clipboard after 30 seconds by default. Choose 15 / 60 seconds or off in app preferences or the extension's More actions menu. Clearing can fail when the browser window loses focus, the page closes or permission is restricted; clear the clipboard manually or lock immediately on shared devices. The setting is local and contains no vault contents.

## Sync with your own folder (BYO sync)

ClearVault does not provide cloud sync. Put the `.db` in a Syncthing, Nextcloud, OneDrive, iCloud Drive or other synced folder and open it in the web app. Your chosen file tool performs the sync; the vault is never uploaded.

When another device changes the external file, a banner appears on focus or when a save conflict is detected. Choose Merge changes to decrypt the external file with the current session's master password and combine unsaved local edits with the external version:

- Entries changed on different sides are kept.
- When both sides change the same entry, the newer `time_stamp` wins; ties keep the local version and are listed as conflicts.
- Labels merge by name; unknown XML, attachments and images travel with the chosen entry version.
- The merged result is previewed first. Confirming it still requires Save database to write the file. If the external file changes again, saving stops to avoid overwriting it.

Limits: the external file must use the same format version and master password; different passwords or versions cannot merge. Conflicts resolve per entry by timestamp, not as a field-level three-way merge. There is no cross-device file lock, and unknown database-level XML is kept from the local side only. Keep independent backups and avoid editing on two devices at once.

## Local encrypted snapshots and save conflicts

The app and extension try to write encrypted `.db` ciphertext to a local OPFS snapshot after each save, keeping 10 by default. Choose 5 / 10 / 20 / 50. Snapshots contain no plaintext, require the master password used at that time to restore, and are deleted when site data is cleared. View and clear them in app Preferences or the extension's More actions; clearing removes only the current vault's snapshots.

If another application or browser tab changes the original file, a banner appears. Saving stops and offers Save a copy / Reload file / Keep current edits, so the external version is not overwritten. Reloading discards unsaved edits after confirmation. External-change detection is best effort; saving still enforces the ciphertext SHA-256 check.

## Save, handle conflicts and lock

The app and extension share SHA-256 conflict checking, verified original-ciphertext backup, a second source check and read-back write verification. Select a separate backup directory before the first overwrite. The extension keeps the ten most recent backups made for that handle in the current page session; other-session backups are not removed by name. Browsers without file writing support use encrypted downloads, which require manual verification.

The extension checks an associated file before filling. If the PWA changed it, filling stops. Save any edits as a copy, choose Reload file and enter the master password. Reloading with unsaved edits requires explicit confirmation to discard; cancel keeps them. Ordinary file input supplies no handle for change detection and must be selected again. Avoid editing one file in two applications simultaneously.

Hiding the sidebar does not lock it immediately; it locks after the selected 1 / 5 / 15 / 30 minutes of inactivity, and the auto-lock choice is remembered by the extension. Unsaved edits remain encrypted in current sidebar memory and can be unlocked again. Closing, refreshing or reloading the extension loses them. Names and history reveal usage metadata on a shared device; clear history when appropriate. They never bypass the master password.
