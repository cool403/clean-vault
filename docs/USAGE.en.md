# Recent vaults, imports and the browser extension

English · [简体中文](USAGE.md)

## Recent vaults

After successfully unlocking or saving a file, the app or extension remembers up to five recent vaults. Records contain only file names, handles, record IDs, times and folder text labels you confirm, never master passwords, entries or vault contents. The app and extension keep separate histories.

Use history on the app home screen, in preferences or on the extension lock screen. Grant file access again if requested, then enter the master password. Moved or deleted files must be selected again. Ordinary file input supplies no reusable handle and is marked accordingly. Unavailable storage falls back to current page session history.

Browsers do not expose complete local absolute paths. When directory selection and a reusable file handle are available, use the folder icon to Confirm containing folder and select a directory containing that vault with read-only access. The app checks that it actually contains the file, then displays Last confirmed folder, such as `Documents/Passwords`: `Documents` is the chosen folder name and `Passwords` is a relative subdirectory. A wrong folder is rejected; cancellation keeps the record unchanged. Directory handles are not stored and other files in the folder are not read. Confirm again after moving files: this label is historical, not a live absolute path. With ordinary file input or unsupported directory selection, verify the location in the system file picker.

Remove individual records or clear history. This removes shortcuts only, not files on disk. History is not a backup and does not save edits.

## Import Chrome or Bitwarden data

1. Export Chrome passwords from Google Password Manager settings, completing system authentication. Export Bitwarden as unencrypted CSV or JSON; prefer JSON for multiple URLs and typed custom fields. See [Chrome export help](https://support.google.com/chrome/answer/13068232) and [Bitwarden file formats](https://bitwarden.com/help/condition-bitwarden-import/).
2. Open or create a destination vault in the app, or open an existing `.db` in the extension, then unlock. Choose Import passwords from the app toolbar, preferences or extension.
3. Select the matching format and original export file, then preview. The limit is 20 MB and 10,000 entries. Preview shows new, duplicate and unsupported counts and the first ten names and accounts, without displaying passwords.
4. Check mapping: names become titles, usernames become accounts, URLs become website fields and folders become labels. Passwords, notes and favorites are retained. Identical entries are skipped; changed passwords or contents create separate entries without overwriting.
5. Confirm and choose Save database. Select a separate encrypted backup directory before the first overwrite. Reopen the saved `.db` to check the results. Downloads only confirm export was started: check the file on disk. Carefully remove plain text source exports only after verifying the encrypted save and complete migration.

Bitwarden login entries and secure notes are supported. JSON retains multiple URLs and custom text, boolean and hidden fields. CSV custom fields are kept together as a private field. Unsupported TOTP secrets are preserved as private fields. Unsupported types such as cards and identities are counted and skipped; attachments, passkeys and linked fields generate warnings. Bitwarden URI matching and reprompt policies are not migrated; extension matching always uses exact HTTPS origins. Keep your original data until verification is complete.

Cancel, Esc, locking and completing an import release preview references. Imports do not upload files or automatically save the vault.

## Fill logins and add websites

Install as described in [self-hosting](SELF-HOSTING.en.md). Reload the extension in the browser extension manager after an update, then reopen its sidebar.

1. Visit the intended HTTPS website, click the extension icon to grant access, choose a file or recent vault and unlock.
2. Check the website and account, then click Fill this login. Submit yourself. On username-first sites only a unique, explicit username or email input is filled. Continue on the website, then click Fill again on the password page. A different origin needs fresh toolbar authorization.
3. For another website using the same account, authorize it, choose Add website address, check the full origin, select the entry, confirm and save. The app editor also has Add website address. Hosts, subdomains and ports are matched exactly, without automatic scope expansion.
4. Show all entries lets you update other entries; filling stays disabled for nonmatching websites. Multiple password fields, OTP inputs, new-password forms and iframes are not filled automatically.

## Confirm password updates

Choose Update password for the entry while changing its website password. Enter the new value twice, or explicitly click Read new password from this website. Reading accepts only visible `new-password` fields on the currently matching HTTPS origin, with equal values for confirmation fields. Enter it manually if identification fails. Reading only populates the extension confirmation form. When an entry has multiple password fields, choose the intended field.

Verify the entry and that the website accepted the change, then confirm and Save database. The extension does not monitor website input or submissions or collect passwords in the background. Unsaved status remains visible after updates and imports.

## Save, handle conflicts and lock

The app and extension share SHA-256 conflict checking, verified original-ciphertext backup, a second source check and read-back write verification. Select a separate backup directory before the first overwrite. The extension keeps the ten most recent backups made for that handle in the current page session; other-session backups are not removed by name. Browsers without file writing support use encrypted downloads, which require manual verification.

The extension checks an associated file before filling. If the PWA changed it, filling stops. Save any edits as a copy, choose Reload file and enter the master password. Reloading with unsaved edits requires explicit confirmation to discard; cancel keeps them. Ordinary file input supplies no handle for change detection and must be selected again. Avoid editing one file in two applications simultaneously.

Hiding the sidebar or inactivity locks it. Unsaved edits remain encrypted in current sidebar memory and can be unlocked again. Closing, refreshing or reloading the extension loses them. Names and history reveal usage metadata on a shared device; clear history when appropriate. They never bypass the master password.
