# ClearVault development, testing and releases

English · [简体中文](DEVELOPER-WORKFLOW.md)

## Requirements and directories

Use Node.js 24+ and Python 3.10+. `dist/` contains readable web source, `extension/` contains extension source, and `extension/core/` is generated from shared modules. `release/web/` is the production deployment directory, `release/extension/` contains the packaged extension, and `out/` is an identical copy of the web build. Production JavaScript is not obfuscated, making it easier to compare with the public source.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. Edit source in `dist/`, `extension/` and `scripts/`, rather than generated output. Update both language catalogs when adding interface text; never translate user data. Increment the cache version in `dist/sw.js` when changing application resources.

## Checks before committing

```sh
npm run format
npm run format:check
npm test
npm run test:release
```

Source tests cover vault formats, Unicode, TOTP, write conflicts, backup restoration, localization and the interface. Production checks also parse JavaScript, reject `eval` / `Function`, compare readable application files with source, verify artifact hashes and run the full suite against the production copy. Windows performs additional interoperability checks when the expected original application is installed. Linux uses the bundled synthetic fixtures.

## Building

`npm run release` generates the public English and Chinese pages, copies shared extension modules, and creates readable web / extension directories, three ZIPs, and source / artifact SHA-256 manifests. MIT and third-party notices are copied into the deployment directories. Only explicitly listed source directories are packaged. The build excludes `.git`, `.openai`, `node_modules`, personal databases and account configuration. Do not publish the parent workspace's analysis files or personal database to GitHub.

`GITHUB_REPOSITORY`, `GITHUB_SHA` and `GITHUB_RUN_ID` identify Actions builds; the default repository comes from `package.json`. The deployed `build-info.json` records the build inputs, while `ASSET-SHA256SUMS.json` lists deployment file hashes, excluding itself. ZIP entry order and timestamps are fixed, but compressed bytes also depend on Python/zlib. Reproduction requires matching metadata and toolchain versions.

The downloads page links to GitHub for source code and provides the extension download. Source ZIPs remain available in Actions artifacts for release verification.

## Deployment and rollback

Pushing to `main` triggers GitHub Actions. All checks must pass before the same tested artifact is deployed to Cloudflare Pages. Pull requests run checks only. See the [GitHub → Cloudflare guide](GITHUB-CLOUDFLARE.en.md) for secrets, the existing domain, reproduction and rollback. See [self-hosting](SELF-HOSTING.en.md) for other deployment options.

After publishing, check `build-info.json`, the Actions run, the home page and both download pages. Pages Analytics settings are managed in the Cloudflare dashboard and remain unchanged by the workflow. Analytics injection may change hosted HTML hashes; other assets can be compared directly. Manually verify file saving, backup restoration, offline startup and extension permissions in real browsers. Tests and open source do not replace an independent security audit.
