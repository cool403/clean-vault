# Store submission checklist

Use this after the extension ZIP has been built and tested for a specific version.
ClearVault is an independent SafeInCloud-compatible tool and is not affiliated with
SafeInCloud. Do not claim an audit, code signature or store approval before they exist.

## Ready in this repository

- [x] English and Simplified Chinese listing copy, including reviewer steps.
- [x] Permission and single-purpose justifications in `permissions.md`.
- [x] Dedicated privacy policy text and generated Chinese/English `/privacy/` pages.
- [x] Four synthetic 1280×800 screenshots and an optional 440×280 promotional tile.
- [x] `npm test` and `npm run test:release` pass on the submission commit.
- [ ] Developer-account setup, upload and store review (owner action).

## Preconditions

- Chrome Web Store developer account with 2FA and the one-time registration fee.
- Microsoft Partner Center account for Edge Add-ons.
- A reviewed build from `npm ci && npm run test:release`, using
  `release/clearvault-<version>-extension.zip`.
- A stable privacy policy URL: `https://clear-vault.app/privacy/`.
- Support URL: `https://github.com/cool403/clean-vault/issues`.
- Synthetic screenshots in `store/screenshots/` and optional promotional tile
  `store/promo-440x280.png`. Never use a real vault, account or OTP secret.

## Chrome Web Store fields

| Field                | Value                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Name                 | ClearVault — Local Password Vault & TOTP                                                                   |
| Summary (≤132 chars) | Open SafeInCloud .db vaults locally, fill logins and copy TOTP codes. No account, no upload, no telemetry. |
| Category             | Productivity                                                                                               |
| Language             | English, Simplified Chinese, German, Japanese, Spanish                                                     |
| Homepage             | https://clear-vault.app/                                                                                   |
| Support              | https://github.com/cool403/clean-vault/issues                                                              |
| Privacy policy       | https://clear-vault.app/privacy/                                                                           |
| Distribution         | Public, free, all regions where policy permits                                                             |
| Screenshots          | 01-web-demo.png, 02-web-quick-search.png, 03-extension.png, 04-extension-entries.png                       |
| Promotional tile     | promo-440x280.png (optional)                                                                               |

Detailed description: copy `store/listing-en.md`.

## Privacy practices answers

- Single purpose: open a local SafeInCloud-compatible `.db` vault, search/edit/copy
  credentials and TOTP codes, fill after explicit user action, and save the encrypted
  file when the user asks.
- Data collection: no personally identifiable information, health, financial,
  authentication, personal communications, location, web history or user activity.
- Data sale/transfer: none.
- Server-side vault storage: none.
- Remote code: none.
- Analytics/trackers in the extension: none; extension CSP sets `connect-src 'none'`.
- Permissions: `activeTab`, `scripting`, `sidePanel`; no host permissions, no
  persistent content scripts, no `storage` permission. Justification text:
  `store/permissions.md`.

## Reviewer test steps

1. Open https://clear-vault.app/?demo=1 and choose Save as my vault; set a synthetic
   master password and download the result.
2. Load the unpacked extension (or uploaded build) in Developer mode.
3. Open an HTTPS test page, click the ClearVault toolbar icon, choose the downloaded
   `.db`, and unlock it with the synthetic password.
4. Confirm the matching entry appears. Click Fill this login or Copy password; verify
   no form is submitted automatically.
5. Optionally add a synthetic TOTP secret and verify Copy code / Fill code.
6. Confirm the extension requests no host permissions and makes no network requests.

## Edge Add-ons

- Partner Center → Microsoft Edge → Extensions → New extension.
- Upload the same signed ZIP. Reuse the listing copy, privacy URL, screenshots and
  permission justifications.
- Category: Productivity. Availability: public, free.
- Edge review may ask for the same reviewer steps; include the imported demo vault
  path and synthetic password instructions.

## Rejection risks to pre-empt

- **SafeInCloud trademark**: the listing name uses a neutral product name; compatibility
  is described in the detailed description with an explicit non-affiliation statement.
- **`scripting` permission**: explain that it runs only after a toolbar action and
  fills the selected login/code; no persistent content script or page scraping.
- **Privacy policy**: dedicated page at `/privacy/`, covering storage, analytics,
  permissions, retention and deletion.
- **Screenshots**: use synthetic demo data only; every screenshot is 1280×800.
- **Remote code**: no remote scripts, fonts, analytics or network connections; CSP
  confirms this.
- **Claim scope**: state that no independent audit or store approval is claimed until
  it actually exists.

## Final package check

- Rebuild with `npm run test:release` after the last source change and upload
  `release/clearvault-<version>-extension.zip`.
- Confirm `release/extension/manifest.json` version matches `package.json` and that
  the ZIP loads unpacked with no host permissions and `connect-src 'none'`.
- Confirm `https://clear-vault.app/privacy/` is live and covers the same data
  handling as `store/privacy-policy.md` before entering the URL.
- Recheck that every screenshot and reviewer file contains synthetic data only.

## After approval

1. Add Chrome Web Store and Edge Add-ons links to `dist/downloads/` and both READMEs.
2. Keep the store listing version, privacy page and `store/` copy in sync.
3. Publish the same release notes and build commit in the repository.
4. Monitor the support issue tracker and private vulnerability channel.
