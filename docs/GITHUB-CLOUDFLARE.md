# GitHub Actions → Cloudflare Pages

仓库：https://github.com/cool403/clean-vault

生产域名：https://clear-vault.app

## 首次配置

1. 在 Cloudflare 控制台确认 `clear-vault.app` 仍绑定 Pages 项目 `clearvault-safeincloud`，生产分支为 `main`。若项目名不同，同时更新工作流中的 `--project-name` 和本文档。
2. 创建仅对目标账号生效、具有 **Account → Cloudflare Pages → Edit** 权限的 API Token。
3. 在 GitHub 的 Settings → Secrets and variables → Actions 中添加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。也可放到工作流使用的 `production` Environment 中。Token 不应出现在仓库、前端配置或聊天中。
4. 若现有 Pages Git 集成开启自动部署，关闭它的自动构建，避免与 Actions 重复发布。保留原自定义域名绑定和 Pages 项目。
5. 推送到 `main` 或在 Actions 中手动运行 **Test and deploy**。生产环境保护规则可能需要在 GitHub 手动批准。

参考：[Cloudflare 官方 CI 直接上传指南](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)。

## 工作流

- PR 和 main：Node.js 24、Python 3.13、`npm ci`、格式检查、源码测试、构建与正式产物测试。
- 保存 `release/web/`、ZIP 和 JSON 清单为 Actions artifact，保留 30 天。
- 仅 main 的 push / 手动运行可进入部署 job；PR 不部署、不读取生产 Secrets。
- 部署 job 下载已通过测试的 artifact，上传其 `release/web/`，不重新构建。main 串行执行发布，避免同时覆盖生产。
- 保留现有 Pages Web Analytics 配置。HTML 会被托管平台注入统计脚本，因此原始 HTML 哈希与线上响应可能不同；JavaScript、CSS、图标和下载包仍可直接核对。正常发布不修改 Analytics 设置。若需要恢复误关的原有配置，可手动运行工作流并勾选 `restore_pages_analytics`，从部署历史恢复原统计配置。
- `_headers` 是 Cloudflare 消费的部署指令，虽记录于制品清单，但不会作为线上文件提供。
- 可读 JavaScript 与源码保持一致，不混淆。Web 与扩展产物保留 MIT 和第三方声明。

## 核对版本

1. 打开下载页，沿 GitHub 链接查看当前提交和 Actions run。
2. 获取 `/build-info.json`，核对 `revision` 与 workflow 的提交。
3. 下载该 Actions artifact，比较 `ASSET-SHA256SUMS.json` 与线上文件的 SHA-256；清单包含所有 Web 文件，自身除外。
4. 若自行复现，检出该提交，使用 Node.js 24 / Python 3.13 与锁文件，并设置与该 run 相同的 `GITHUB_REPOSITORY`、`GITHUB_SHA`、`GITHUB_RUN_ID` 后执行 `npm ci`、`npm run test:release`。元数据含 run ID，不同 run 的部分文件哈希不同。ZIP 压缩字节还依赖 Python/zlib 版本。

本地无 Actions 环境变量时，提交和构建链接为空，界面显示“本地构建”，不伪称与某次生产发布相同。校验清单和构建链接可追溯发布，但并非数字签名、外部审计或对托管方的独立证明。

## 回滚

在 Cloudflare Pages 的部署列表中将已核验的历史生产部署回滚为当前版本；之后将修复或 revert 提交推送到 main。不要只在 Actions 上重新运行旧 run 后继续推送未经修复的 main。Actions artifact 超过保留期后会删除，长期存档需另行保存。

## 故障排查

- Missing secret：在仓库或 production 环境补齐上述两个 Secrets，再重新运行。
- 项目不存在：检查 account ID、Token 的账号范围和项目名。工作流不会自动创建 Pages 项目。
- 检查失败：修复源码并重跑；失败的构建不会进入部署 job。
- 部署成功但界面旧：核对域名绑定和 `/build-info.json`，重新联网刷新；Service Worker 已更新缓存号。

## Initial setup (English)

Keep the existing `clearvault-safeincloud` Pages project and its `clear-vault.app` domain. Set its production branch to `main`. Add `CLOUDFLARE_API_TOKEN` (Pages Edit, restricted to the intended account) and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets, optionally in the `production` environment. Disable duplicate Cloudflare automatic builds if enabled. Push to main or manually run **Test and deploy**.

Normal deployments preserve Pages Web Analytics settings. Hosted HTML may include an injected analytics script and therefore differ from raw artifact hashes; JavaScript, CSS, images and packages remain directly comparable. The optional manual `restore_pages_analytics` input recovers a previously disabled configuration from deployment history. `_headers` is a deployment directive consumed by Cloudflare rather than a publicly served asset. Pull requests only run checks. Deployment downloads the tested artifact without rebuilding. Inspect `/build-info.json`, the linked commit / run, and `/ASSET-SHA256SUMS.json` to compare deployed assets. Local builds have no claimed Actions revision. For reproduction, use the same source, lockfile, toolchain and GITHUB_REPOSITORY / GITHUB_SHA / GITHUB_RUN_ID metadata. Hashes are not signatures or audits. Use the Cloudflare deployment list to roll back to a verified production deployment, then fix or revert main.
