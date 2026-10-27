# ClearVault store listing kit

This directory prepares the Chrome Web Store and Microsoft Edge Add-ons submission.
It is not proof of approval, audit or store availability. ClearVault is an independent
SafeInCloud-compatible tool and is not affiliated with SafeInCloud.

## Files

- `listing-en.md` — English store copy, category, URLs and reviewer notes.
- `listing-zh.md` — Simplified Chinese store copy.
- `privacy-policy.md` — dedicated privacy policy text.
- `permissions.md` — permission and single-purpose justifications for review.

## Checklist

1. Create a Chrome Web Store developer account, enable 2FA and pay the one-time
   registration fee. Edge Add-ons uses Partner Center and has no registration fee.
2. Run `npm ci && npm run test:release` and upload
   `release/clearvault-<version>-extension.zip`.
3. Use the copy in `listing-en.md` / `listing-zh.md`; category: Productivity.
4. Set the privacy policy URL. Until a dedicated `/privacy/` page is hosted, use
   `https://clear-vault.app/security/` (the policy text in this folder is the
   authoritative draft; host it at a stable URL before submission if preferred).
5. Complete the privacy practices form: no collection, sale or transfer of user data;
   single purpose; local processing only.
6. Paste the permission justifications from `permissions.md`.
7. Capture at least one 1280×800 or 640×400 screenshot (up to five). Suggested:
   unlocked extension with search and OTP, demo vault dashboard, quick search.
   Use synthetic data only. Add a 440×280 promotional tile if desired.
8. Provide reviewer test steps from `listing-en.md` and submit.
9. Do not claim an independent security audit or store approval until they exist.
10. After approval, add store links to the downloads page and README.

## Suggested screenshots

| Shot | Size     | Content                                                                  |
| ---- | -------- | ------------------------------------------------------------------------ |
| 1    | 1280×800 | Extension sidebar: site match, search, OTP code, copy/fill actions       |
| 2    | 1280×800 | Web app demo vault and quick search                                      |
| 3    | 1280×800 | Create vault modal with strength meter and unrecoverable-password notice |
| 4    | 1280×800 | Settings showing clipboard, local snapshots and recovery kit             |
| 5    | 1280×800 | Import wizard preview with synthetic entries                             |

Do not include real vault names, accounts, passwords, OTP secrets or file paths.
