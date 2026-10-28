# Permission and single-purpose justifications

## Single purpose

ClearVault opens a local SafeInCloud-compatible `.db` password vault in the browser,
lets the user search, edit, copy and fill their own credentials and TOTP codes, and
saves the encrypted file back when the user explicitly chooses to.

## Permissions

### `activeTab`

Granted only after the user clicks the ClearVault toolbar icon on the current tab.
It provides temporary access to that tab so the user can fill the selected login or
verification code. ClearVault does not request global host permissions and does not
run a persistent content script.

### `scripting`

Used only after an explicit user action to run a small self-contained function in
frame 0 of the active tab. The function fills the selected username/password or a
unique verification-code field. It never submits a form, reads page content for
collection, or runs in the background.

### `sidePanel`

Provides the extension user interface in Chrome's side panel. The panel is the only
place where the local vault is unlocked and where the user selects an entry.

## Not requested

- No `storage` permission: recent file metadata uses browser IndexedDB; preferences
  use extension-local `localStorage`.
- No `<all_urls>` or host permissions.
- No persistent content scripts.
- No `externally_connectable` or external message handlers.
- No remote code, remote fonts, analytics or network connections. The extension CSP
  sets `connect-src 'none'`.

## Data handling summary

Vault contents and TOTP secrets are decrypted only in the extension side panel memory.
The master password, decrypted XML and OTP secrets are not written to extension
storage or sent over the network. Recent records contain only file names, handles,
record IDs, times and optional confirmed folder labels. Clipboard copies are cleared
after the user-selected delay on a best-effort basis.
