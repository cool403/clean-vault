# Mobile native shell and AutoFill plan

## Current status

The repository currently contains the web PWA and a Chrome / Edge extension. There is no Android or iOS native project. This environment has no JDK, Android SDK, Gradle or Xcode, so native AutoFill cannot be compiled, signed or verified on a device here. This document is an implementation plan, not a completed feature; unverified native security code should not be committed as if it were production-ready.

The PWA already provides install guidance, `.db` file association, drag-and-drop, offline caching and mobile layouts. It has no system-level AutoFill and cannot replace Android AutofillService or an iOS Credential Provider extension.

## Recommendation

**Capacitor shell + shared Rust vault core**, not just a WebView wrapper.

- Capacitor reuses the existing web UI and handles file selection, sharing, biometrics and lifecycle.
- A Rust core implements SafeInCloud parsing, encryption, the entry/label model and merge; UniFFI exposes it to Android, iOS and the WebView.
- Android AutofillService and the iOS Credential Provider Extension call the Rust core directly, independent of whether the WebView is alive.
- The existing JavaScript core and test vectors are the compatibility baseline for Rust. Do not replace the web implementation until the Rust core passes the same round-trip, Unicode, TOTP, save-conflict and merge tests.

A WebView shell without a shared core cannot serve system AutoFill after the app is closed or its process is reclaimed; requiring the app to open for every fill is not acceptable.

## Security model

- The master password is never persisted. Derive keys in the native core after unlock; Android Keystore / iOS Keychain can wrap a key protected by device biometrics.
- Auto-lock, clipboard clearing, exact-origin matching and “never auto-submit” retain the existing boundaries.
- Android browsers match by HTTPS origin; ordinary apps match by package name and signing certificate, with the target shown before filling.
- The iOS Credential Provider lets the system choose an entry; the extension does not submit.
- `.db` files are accessed through SAF / the iOS document picker; syncing remains the user's chosen folder tool.
- The compatible format has no AEAD. A security audit is required before mobile AutoFill ships. A long-term mobile product should also design a native Argon2id + AEAD format while retaining SafeInCloud compatibility mode.
- Native projects must keep keys off disk, exclude secrets from logs and crash dumps, and review the WebView/native-core boundary.

## Phases

1. **Mobile PWA foundation (done)**: install guidance, `.db` file association, drag-and-drop, iOS/Android limitations.
2. **Native shell (2–4 weeks)**: Capacitor project, Android/iOS file open/save, recent files, biometric unlock, offline launch. No AutoFill yet.
3. **Shared Rust core (4–8 weeks)**: port format, crypto, entry/label model and merge; differential tests against existing fixtures and RFC 6238 vectors; switch only after audit.
4. **Android AutoFill (4–6 weeks)**: AutofillService, exact package/origin matching, user confirmation, unlock prompt; device tests and Play review.
5. **iOS Credential Provider (4–6 weeks)**: App Group, Keychain, Credential Provider Extension, TestFlight; requires macOS/Xcode and an Apple Developer account.
6. **Release and audit (ongoing)**: signing, store materials, privacy policy, independent audit, incident response.

## Tooling and prerequisites

- Android: JDK 17, Android SDK 35, Gradle, signing keystore, emulator or device; Linux CI runner.
- iOS: macOS 14+, Xcode 16, Apple Developer Program, provisioning; builds and signing must run on macOS.
- Rust: stable toolchain, Android NDK, iOS targets, UniFFI.
- Security: audit budget, vulnerability reporting channel, reproducible builds and SBOM.

## Open decisions

- Whether mobile is a first-class product rather than a PWA companion.
- Whether to maintain Rust + JS dual cores for AutoFill, or migrate to a native core long term.
- Whether to add a native format/AEAD on mobile, and how much SafeInCloud compatibility to retain.
- Whether syncing remains BYO folders or gains an end-to-end encrypted sync service.

## Relationship to existing code

- Web BYO sync and merge are implemented in `dist/merge.js`, `merge.test.mjs` and `decryptDatabaseWithCredential`.
- File association and install guidance live in `dist/manifest.*.webmanifest` and `dist/app.js`.
- The existing vault format, crypto and TOTP tests are the compatibility baseline for a Rust core.
