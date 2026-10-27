# Chrome Web Store / Edge Add-ons listing — English

## Name

ClearVault — Local Password Vault & TOTP

## Short description (max 132 characters)

Open SafeInCloud .db vaults locally, fill logins and copy TOTP codes. No account, no upload, no telemetry.

## Detailed description

ClearVault is an offline-first password vault and TOTP companion for SafeInCloud-compatible .db files. It is an independent compatible tool, not an official SafeInCloud product.

Your vault stays a file you control. ClearVault decrypts it locally in the browser, without an account, cloud service or vault upload.

What you can do:

- Open and search a SafeInCloud format 1 or 2 .db file.
- Fill a selected username/password on the current HTTPS site — never automatically submit.
- Copy usernames, passwords and TOTP codes, with a configurable clipboard-clear delay.
- Add an entry for the current website, generate a password and save it to the encrypted file.
- Update a password after you change it on the website.
- Import Chrome, Bitwarden, 1Password, LastPass, Apple Passwords and mapped generic CSV files.
- Keep up to five recent vaults, with verified saves and encrypted backups.
- Use the web app as an offline PWA, in Chinese, English, German, Japanese or Spanish.

Privacy and boundaries:

- The master password, decrypted XML and OTP secrets are not written to extension storage or sent to a server.
- No trackers, remote code or analytics in the extension. The extension CSP disables network connections.
- Only exact HTTPS origins are matched; new sites require an explicit toolbar action.
- The extension does not monitor page input, auto-submit forms or collect passwords in the background.
- Firefox, Safari, iframe filling and Passkey provider support are not available.
- No independent security audit has been completed. Read the security page and keep independent backups.

The web app requires a Chromium-based browser for direct file write-back. Other browsers can download encrypted copies. Start with synthetic data and a copy of your database.

## Category

Productivity

## Languages

English, Simplified Chinese, German, Japanese, Spanish (extension UI)

## URLs

- Homepage: https://clear-vault.app/
- Privacy policy: https://clear-vault.app/security/ (draft policy also in store/privacy-policy.md)
- Support: https://github.com/cool403/clean-vault/issues
- Source: https://github.com/cool403/clean-vault
- Security: https://clear-vault.app/security/

## Reviewer test steps

1. Open https://clear-vault.app/?demo=1, choose Save as my vault, set a synthetic master password and download the resulting .db file.
2. Load the extension ZIP in Developer mode, open an HTTPS test page and click the ClearVault toolbar icon.
3. Choose the downloaded .db file, unlock with the synthetic password and confirm that the matching demo entry is listed.
4. Click Fill this login or Copy password; verify that no form is submitted automatically.
5. Optionally add a synthetic TOTP secret in the web app and verify Copy code / Fill code in the extension.
6. The extension requests no host permissions and makes no network requests.

## Permissions

See `permissions.md`.

## Privacy practices

- Does not collect personally identifiable information, health, financial, authentication,
  personal communications, location, web history or user activity.
- Does not sell or transfer user data.
- Vault processing is local; no server-side vault storage.
- ClearVault does not use remote code.

## Release notes

<version> — extension: local vault search/copy, TOTP display and fill, new-entry flow,
clipboard auto-clear and recovery kit. Web app: encrypted OPFS snapshots and
save-conflict prompts.
