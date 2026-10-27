# ClearVault

[![构建与部署](https://github.com/cool403/clean-vault/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/cool403/clean-vault/actions/workflows/deploy.yml)

[English](README.en.md) · 简体中文

离线优先的 SafeInCloud 兼容密码管理器与 TOTP 验证器。纯静态 PWA，密码库在浏览器本地解密，无需账号或后端服务。

网页和扩展界面支持简体中文、英语、德语、日语和西班牙语，可自动匹配浏览器语言并记住手动选择。语言切换不翻译密码库内容；详见[界面语言说明](docs/USAGE.md#界面语言)。

[使用 ClearVault](https://clear-vault.app) · [GitHub 源码](https://github.com/cool403/clean-vault) · [构建记录](https://github.com/cool403/clean-vault/actions) · [安全设计](SECURITY.md)

## 开源与可验证发布

自有代码采用 [MIT 许可证](LICENSE)，允许使用、修改、分发和商业使用，须保留许可和版权声明。第三方许可见 [NOTICE](NOTICE)。ClearVault 是独立兼容工具，与 SafeInCloud 官方无隶属关系。

仓库中的 `dist/` 是可读源码。生产构建直接复制 JavaScript，**不再混淆**。推送到 `main` 后，GitHub Actions 安装锁定依赖、检查格式、测试源码、打包并测试正式产物，成功后将同一份产物部署到 Cloudflare Pages。Pull Request 只运行检查，不获取部署凭据。

线上 `/build-info.json` 记录版本、Git 提交和 Actions 运行链接；`/ASSET-SHA256SUMS.json` 记录部署文件哈希。下载页提供仓库、具体提交和构建记录入口；Actions 保存 Web、扩展、源码 ZIP 和 SHA-256 清单。开源与校验提高可追溯性，不能证明托管方未修改代码，也不代表经过独立安全审计。可自行构建和托管。

公开站点保留 Cloudflare Pages Web Analytics，托管平台可能向 HTML 注入统计脚本，其加载和执行受 CSP 限制。清单描述构建产物，线上 HTML 因此可能与原始哈希不同；JavaScript、CSS、图片和下载包可直接核对。自行托管包不包含这项平台注入。

## 快速开始

需要 Node.js 24+ 和 Python 3.10+。

```sh
npm ci
npm run dev
```

访问 `http://127.0.0.1:4173`。正式环境使用 HTTPS；不能直接双击 HTML。首次联网缓存资源后可离线使用或安装为 PWA。浏览器存储清理后需要重新联网，缓存不等于密码库备份。可直接分享在线体验链接 `https://clear-vault.app/?demo=1`，打开后进入演示密码库，不需要文件或主密码。

```sh
npm test
npm run test:release
```

`release/web/` 是部署目录，`release/extension/` 是扩展目录，`out/` 是 Web 的相同副本。发布脚本只包含明确列出的源码目录，排除本地账号配置、密钥及真实数据库，仅包含三个人工兼容测试样本。

## 功能

- 打开 SafeInCloud 格式 1 / 2 的 `.db`，支持新建格式 2 和完整 Unicode 主密码；保存保留已有格式。
- 创建密码库时显示本地主密码强度提示并要求确认无法找回；更改主密码需验证当前密码；偏好设置或扩展“更多操作”可下载不含密码或 OTP 密钥的恢复工具包。
- 条目、多个字段、备注、标签、收藏、归档、回收站和密码生成器。
- TOTP：Base32、`otpauth://totp` 和本地二维码图片；SHA1 / SHA256 / SHA512、6 / 8 位、1–300 秒周期。与 SafeInCloud 26.0 共用时保留 30 秒周期。
- 支持文件 API 的浏览器可写回原文件；写回前检查密文 SHA-256，备份并校验，写入后读回验证。其他浏览器下载加密副本。
- 已有文件的条目保存自动备份并写回。首次写回需选择独立备份目录；失败、取消或冲突保留未保存状态。新库和下载模式需显式保存数据库。
- 备份预览与恢复为新库、自动锁定（1 / 5 / 15 / 30 分钟）、中英文界面、离线 PWA。
- 快速查找支持拼音首字母、最近使用排序、TOTP 复制和命令模式（新建 / 生成密码 / 锁定 / 切换库）；大库列表分批渲染，搜索结果限制前 50 条。
- 网页和扩展每次保存后尝试把加密 `.db` 密文写入浏览器 OPFS 本地快照，默认保留 10 份；外部文件变化会提示另存副本或重新加载，避免覆盖。
- PWA 在 Chromium 安装后可从文件管理器打开 `.db`，也可以把 `.db` 拖到页面；安装引导覆盖 Chrome / Edge、Android 和 iOS。iOS Safari 不提供文件写回和浏览器扩展。
- Chrome / Edge 扩展支持分步登录、多个明确添加的 HTTPS 地址、搜索所有条目、复制账号/密码、为当前网站新建条目、显示/复制/填入 TOTP 验证码、确认更新密码、导入与验证保存；不自动提交。
- 最近 5 个密码库：记住名称和文件句柄，可选择包含文件的目录并显示上次确认的文件夹名及相对目录；当前会话也统一在列表中解锁并保留未保存修改；可移除或清空历史记录。
- Chrome、Bitwarden、1Password、LastPass、Apple Passwords 导入；通用 CSV 可手动映射列。预览、重复检测，不覆盖已有条目。网页与扩展共用导入流程。
- 新建空密码库时显示可关闭的新手清单：导入/首条记录、安装扩展、首次填充、TOTP、备份。
- 本地安全概览：弱密码、重复使用、长期未更新、未启用 TOTP；支持按类别筛选、批量添加标签/归档/移至回收站，以及标签重命名、合并和删除。

解锁已有库时自动打开快速查找，搜索标题、账号、邮箱、网站、标签和拼音首字母，不索引密码、PIN、OTP 或备注。

| 操作       | Windows / Linux      | macOS             |
| ---------- | -------------------- | ----------------- |
| 快速查找   | Ctrl + K             | ⌘ + K             |
| 上下选择   | ↑ / ↓                | ↑ / ↓             |
| 复制密码   | Ctrl + Enter         | ⌘ + Enter         |
| 复制验证码 | Ctrl + Shift + Enter | ⌘ + Shift + Enter |
| 查看详情   | Enter                | Enter             |
| 命令模式   | 输入 >               | 输入 >            |
| 锁定密码库 | Ctrl + Shift + L     | ⌘ + Shift + L     |
| 关闭查找   | Esc                  | Esc               |

快捷键仅在应用获得焦点时生效，支持中文输入法。编辑表单不被快速查找打断。复制账号、密码或验证码后，默认 30 秒后尝试清空系统剪贴板；可在网页偏好设置或扩展“更多操作”中改为 15 / 60 秒或关闭。窗口失去焦点或页面关闭时清除可能失败，共用设备请手动清空剪贴板。

## 数据与安全边界

主密码、解密 XML 和 OTP 密钥不写入 localStorage / IndexedDB，不通过网络上传。localStorage 只保存界面语言、自动锁定分钟数、剪贴板清除时间、快照保留数量、最近使用条目 ID/时间和新手清单完成状态等非敏感偏好与排序元数据；IndexedDB 只保存最近文件名称、句柄、记录 ID、时间和用户确认的目录文字标记，可清空。OPFS 本地快照只保存加密 `.db` 密文，不包含明文密码库。浏览器不提供完整本地路径，目录标记为历史信息，目录句柄不保存。网页与扩展的最近记录相互独立，权限可能过期；存储不可用时仅保留会话记录。Service Worker 只缓存应用资源，备份目录和保留设置仅在当前会话有效。托管服务器仍能看到访问 IP 和 HTTP 元数据。

编辑保留未知 XML、附件、图片和历史；二进制字段只读。当前不支持附件管理、云同步、Passkey、摄像头扫描、Firefox 扩展和损坏 XML 修复。TOTP 不是额外的密码库解锁认证。

格式兼容沿用 PBKDF2-SHA1 和 AES-CBC，没有正文认证。浏览器无法提供跨应用事务锁或可证明的内存擦除，请保留独立加密备份并避免同时编辑。锁定时未保存修改仅加密保留在本页内存，刷新或关闭仍会丢失；下载导出无法确认原文件已更新。

尚未经过独立安全审计，扩展尚未在浏览器商店上架。请先用合成数据和数据库副本验证。详细边界和漏洞报告方式见 [SECURITY.md](SECURITY.md)。

## GitHub Actions → Cloudflare

工作流：[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。默认部署 `main` 到现有 Pages 项目 `clearvault-safeincloud`，继续使用 `clear-vault.app`。

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 设置：

| Secret                  | 内容                                        |
| ----------------------- | ------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | 目标 Cloudflare 账号的 Pages Edit API Token |
| `CLOUDFLARE_ACCOUNT_ID` | 对应账号 ID                                 |

如 `production` Environment 已配置单独 Secrets，也可将它们保存在该环境。不要将 Token 写入源码。配置后推送 `main`，或在 Actions 手动运行工作流。Cloudflare 若启用了另一套自动构建，应关闭重复触发，保留此工作流作为发布入口。配置和回滚详见[自动部署指南](docs/GITHUB-CLOUDFLARE.md)。

## 扩展与自托管

运行 `npm run build:extension`，在 Chrome / Edge 扩展管理页面开启开发者模式，加载 `extension/`；也可下载扩展 ZIP 并解压加载。更新后在扩展管理页重新加载。目标网站点击扩展图标后打开 `.db` 或最近密码库，可搜索所有条目、复制账号/密码、为当前网站新建条目，并在条目含 TOTP 时复制或填入验证码。新网站需重新授权；PWA 修改原文件后，扩展在填充前检测变化并停止填充，先另存未保存编辑，再点击“重新加载文件”并解锁。侧栏隐藏不再立即锁定，默认按所选空闲时间锁定。

完整步骤见 [导入教程](docs/USAGE.md)（[English](docs/USAGE.en.md)），涵盖最近文件、导入、分步填充、多网址、密码更新与保存。公开教程由同一源码生成：`/guides/import-passwords/`、`/guides/import-1password/`、`/guides/import-lastpass/`、`/guides/import-apple-passwords/`、`/guides/import-generic-csv/`、`/guides/browser-extension/` 及对应英文页面。

自行托管运行 `npm run test:release` 后上传 `release/web/` 到 HTTPS 静态服务器。Docker、备份与安装说明见[自托管文档](docs/SELF-HOSTING.md)。

## 开发与贡献

[开发流程](docs/DEVELOPER-WORKFLOW.md) · [贡献指南](CONTRIBUTING.md)

新增文案需同时更新 `dist/locales/zh-CN.js` 和 `dist/locales/en.js`，仅翻译界面，不翻译用户数据。测试覆盖数据库往返、人工兼容样本、Unicode、RFC 6238 全部 18 组向量、保存冲突、备份恢复、快速查找、语言和扩展填充。Windows 上存在对应原始安装时还会运行原始程序互通验证；Linux CI 使用人工样本和 Web Crypto 往返测试。

第三方二维码解码使用 jsQR 1.4.0，随应用本地打包；jsdom 和 Prettier 仅用于开发。参见 [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html)。
