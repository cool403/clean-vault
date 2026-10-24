# ClearVault 开发、测试与发布

[English](DEVELOPER-WORKFLOW.en.md) · 简体中文

## 环境与目录

Node.js 24+、Python 3.10+。`dist/` 是可读 Web 源码，`extension/` 是扩展源码，`extension/core/` 由共享模块生成。`release/web/` 为生产部署目录，`release/extension/` 为分发扩展，`out/` 是 Web 的相同副本。生产 JavaScript 不混淆，便于与公开提交逐字节比对。

## 开发

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4173 。修改 dist、extension 和 scripts 中的源码，不修改生成目录。新增文案同步维护两个语言包，不翻译用户数据。更新应用资源时递增 `dist/sw.js` 的缓存号。

## 提交前验证

```sh
npm run format
npm run format:check
npm test
npm run test:release
```

源码测试覆盖密码库格式、Unicode、TOTP、写入冲突、备份恢复、语言与 UI。正式产物检查还会解析 JavaScript、拒绝 eval / Function、确认可读核心文件一致、校验部署哈希并对生产副本运行完整测试。Windows 有对应原始安装时进行额外互通验证；Linux 使用随附合成样本。

最近文件由 `dist/recent-files.js` 管理，IndexedDB 仅存名称、文件句柄、记录 ID、时间和可选 `folder` 文字标记，禁止加入密文、解密数据或凭证。`setDirectory` 使用用户只读选择的目录句柄 `resolve(fileHandle)` 核对归属，再存所选文件夹名与相对目录，不保存目录句柄、不扫描其他文件，也不声称获取绝对路径；再次打开同一文件时保留标记，另存其他文件不会继承。`dist/import-data.js` 负责 CSV / JSON 解析、去重与增量添加，`dist/workflow-ui.js` 和 `dist/workflow.css` 提供网页与扩展一致的预览和最近文件交互。共享文件由 `scripts/build-extension.mjs` 复制到 `extension/core/`，不要直接改生成副本。扩展写回复用 `safe-save.js`；填充与显式读取新密码保持可由 Chrome 序列化的独立函数。

修改这些流程需同时验证网页、侧栏、中英文和窄屏。测试覆盖重复导入、差异密码保留、未知 XML 保留、元数据持久化、权限失败、保存备份、冲突停止填充及锁定后的异步请求。使用教程维护 `docs/USAGE*.md` 与 `scripts/public-content.mjs`，执行 `npm run build:public` 生成中英文教程、站点地图和 robots；新资源同步加入离线清单。

`mergeRecentSession` 仅合并显示模型，通过记录 ID 或 `isSameEntry` 判断同一文件，不把会话标记写回历史存储。无匹配记录时创建临时行，确保新库和取消首次解锁后的文件仍可访问。当前会话行使用 `recent-session` 动作解锁加密内存副本，其他历史行仍重新选取或读取文件。锁定、清空历史和刷新界面不能覆盖未保存的加密副本。

## 构建

`npm run release` 更新公开中英文页面和扩展共享代码，生成可读 Web / 扩展目录、三份 ZIP、源码与制品 SHA-256 清单。MIT 和第三方声明复制到部署目录。只使用明确列出的源码目录，不打包 .git、.openai、node_modules、真实数据库和账号配置。不要将工作区上层的分析目录或个人数据库发布到 GitHub。

`GITHUB_REPOSITORY`、`GITHUB_SHA` 和 `GITHUB_RUN_ID` 用于 Actions 构建信息，仓库默认值来自 package.json。线上 build-info.json 对应实际构建输入，ASSET-SHA256SUMS.json 包含部署文件哈希（不包含清单自身）。固定 ZIP 顺序和时间，压缩字节还依赖 Python/zlib；复现时元数据也必须一致。

下载页通过 GitHub 提供源码入口，仅保留扩展下载。源码 ZIP 仍随 Actions 制品保留，供发布校验。

## 发布与回滚

推送 main 触发 GitHub Actions，所有检查通过才部署同一份 artifact 到 Cloudflare Pages。PR 只检查。Secrets 配置、现有域名迁移、复现和回滚见 [GitHub → Cloudflare 指南](GITHUB-CLOUDFLARE.md)。自托管见 [SELF-HOSTING.md](SELF-HOSTING.md)。

发布后核对 build-info.json、Actions run、首页及中英文下载页。手动验证真实浏览器文件保存、备份恢复、离线启动与扩展授权。自动化测试和开源均不能代替独立安全审计。
