# Self-hosting and verifiable releases

English · [简体中文](SELF-HOSTING.md)

Building and testing require Node.js 24+ and Python 3.10+ for ZIP creation. Serving the resulting static application does not require a Node or Python backend.

```sh
npm ci
npm test
npm run build:extension
npm run test:release
```

`release/web/` and `release/extension/` contain readable production JavaScript. `dist/` and `extension/` remain the development source. `release/` also contains web, extension and source ZIPs, plus `SHA256SUMS.json` and `SOURCE-FILES.json`. ZIP entry order, permissions and timestamps are fixed. Identical inputs should produce identical ZIPs with the same Python/zlib toolchain. Across different compression toolchains, compare the extracted source files against `SOURCE-FILES.json`. Checksums distributed alongside unsigned packages detect file differences but do not prove publisher identity. Releases are not currently signed or independently audited.

Packaging uses explicit source directories. It does not read the parent workspace or include `.git`, `.openai`, `node_modules` or personal vaults. Only three explicitly listed synthetic `.db` compatibility fixtures are included. Review the manifest before publishing and never add personal data.

## Cloudflare Pages

Production releases are tested and deployed through GitHub Actions. See the [GitHub → Cloudflare guide](GITHUB-CLOUDFLARE.en.md) for configuration. For your own hosting, upload `release/web/` to your Pages project.

The public ClearVault site retains Pages Web Analytics. This host-side HTML injection is not part of the self-hosting package. Your own hosting settings determine whether analytics is added. The deployment workflow does not modify those settings.

## Docker / Nginx

Run the build commands above first. Docker copies the readable `release/web/` directory.

```sh
docker build -t clearvault:0.3.8 .
docker run --rm -p 127.0.0.1:8080:80 clearvault:0.3.8
```

Open http://localhost:8080 locally. Remote access requires an HTTPS reverse proxy; otherwise Web Crypto, file APIs and the Service Worker may be unavailable. For production, validate and pin the Nginx base image to a digest. This is a general template, not a claim that the image build has been verified.

## Browser extension: developer installation

Run `npm run build:extension`. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge, enable Developer mode, and load the unpacked `extension/` directory. You can also unpack and load the release extension ZIP. No vault upload or API token is required.

On the intended HTTPS website, click the toolbar extension icon, select your `.db`, enter the master password and choose a matching account to fill. The entry's website field must use the exact origin: `accounts.example.com` and `example.com` are not treated as equivalent. Each new website needs authorization through the extension icon. Reopen the database in the extension after the PWA modifies it; the extension does not synchronize or write vault files.

The sidebar locks when closed or hidden, and defaults to locking after five idle minutes. Filling requires one visible password field. Multi-step username pages, iframes and Passkeys are not supported.

Browser store publication requires a publisher account, a privacy policy and manual review; it has not been completed. Chromium browsers need the `sidePanel` API, available in Chrome 116+. Test the intended Edge version separately. Firefox is not supported.

## Sites output

The generated `out/` directory is an identical copy of `release/web/` and is used by the local Sites static-directory configuration. Deploy the tested production output rather than the development `dist/` directory.
