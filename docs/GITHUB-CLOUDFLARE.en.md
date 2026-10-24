# GitHub Actions → Cloudflare Pages

English · [简体中文](GITHUB-CLOUDFLARE.md)

Repository: https://github.com/cool403/clean-vault

Production site: https://clear-vault.app

## Initial configuration

1. In Cloudflare, confirm that `clear-vault.app` is still attached to the `clearvault-safeincloud` Pages project, with `main` as its production branch. If the project name differs, update both `--project-name` in the workflow and this guide.
2. Create an API token with **Account → Cloudflare Pages → Edit** access, restricted to the intended account.
3. In GitHub, open Settings → Secrets and variables → Actions and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Alternatively, store them in the workflow's `production` environment. Never put tokens in the repository, frontend configuration or chat.
4. If the Pages project's Git integration also builds automatically, disable that duplicate build trigger. Keep the existing Pages project and custom domain binding.
5. Push to `main`, or manually run **Test and deploy** in Actions. GitHub environment protection rules may require approval before production deployment.

Reference: [Cloudflare's official direct-upload CI guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## Workflow

- Pull requests and `main` use Node.js 24 and Python 3.13 to run `npm ci`, formatting checks, source tests, packaging and production artifact tests.
- `release/web/`, ZIPs and JSON manifests are retained as an Actions artifact for 30 days.
- Only pushes and manual runs on `main` can enter the deployment job. Pull requests do not deploy or receive production secrets.
- The deployment job downloads the tested artifact and uploads its `release/web/` directory without rebuilding. Production runs are serialized to prevent simultaneous deployments.
- Existing Pages Web Analytics settings are preserved. The host injects its analytics script into HTML, so hosted HTML can differ from raw artifact hashes. JavaScript, CSS, icons and download packages can be compared directly. Normal deployments do not change Analytics settings; manage them under the Pages project's Metrics → Web Analytics section in Cloudflare.
- `_headers` is a deployment directive consumed by Cloudflare. It is included in the artifact manifest but is not served as a public file.
- JavaScript stays readable and is not obfuscated. Both web and extension artifacts retain MIT and third-party notices.

## Verifying a release

1. Follow the download page's GitHub links to the source commit and Actions run.
2. Fetch `/build-info.json` and compare its `revision` with the workflow commit.
3. Download the Actions artifact and compare its `ASSET-SHA256SUMS.json` with hosted file hashes. The manifest covers all web build files except itself. Treat `_headers` as a deployment directive, and account for Cloudflare's Analytics injection when comparing HTML.
4. To reproduce the build, check out that commit, use Node.js 24 / Python 3.13 and the lockfile, and set `GITHUB_REPOSITORY`, `GITHUB_SHA` and `GITHUB_RUN_ID` to the same values as the original run. Execute `npm ci` and `npm run test:release`. Different run IDs change metadata and some file hashes. ZIP compression also depends on the Python/zlib version.

Without Actions environment variables, local builds leave the revision and run link empty and display “Local build.” They do not claim to match a production release. Hash manifests and build links improve traceability; they are not digital signatures, independent audits or independent proof of what the host serves.

## Rollback

In the Cloudflare Pages deployment list, roll back to a verified historical production deployment. Then push a fix or revert commit to `main`. Do not simply rerun an old workflow while leaving the problem on `main`, where the next push could publish it again. Actions artifacts expire after their retention period; save a separate copy if long-term archives are needed.

## Troubleshooting

- **Missing secret:** add the two required secrets to the repository or `production` environment, then rerun the failed job.
- **Project not found:** check the account ID, the API token's account scope and the project name. The workflow does not create a Pages project.
- **Checks fail:** fix the source and rerun. Failed builds cannot enter the deployment job.
- **Deployment succeeds but the interface looks old:** check the domain binding and `/build-info.json`, then refresh while online. Update the Service Worker cache version when application resources change.
