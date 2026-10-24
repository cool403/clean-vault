# ClearVault 开发、测试与发布

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

## 构建

`npm run release` 更新公开中英文页面和扩展共享代码，生成可读 Web / 扩展目录、三份 ZIP、源码与制品 SHA-256 清单。MIT 和第三方声明复制到部署目录。只使用明确列出的源码目录，不打包 .git、.openai、node_modules、真实数据库和账号配置。不要将工作区上层的分析目录或个人数据库发布到 GitHub。

`GITHUB_REPOSITORY`、`GITHUB_SHA` 和 `GITHUB_RUN_ID` 用于 Actions 构建信息，仓库默认值来自 package.json。线上 build-info.json 对应实际构建输入，ASSET-SHA256SUMS.json 包含部署文件哈希（不包含清单自身）。固定 ZIP 顺序和时间，压缩字节还依赖 Python/zlib；复现时元数据也必须一致。

## 发布与回滚

推送 main 触发 GitHub Actions，所有检查通过才部署同一份 artifact 到 Cloudflare Pages。PR 只检查。Secrets 配置、现有域名迁移、复现和回滚见 [GitHub → Cloudflare 指南](GITHUB-CLOUDFLARE.md)。自托管见 [SELF-HOSTING.md](SELF-HOSTING.md)。

发布后核对 build-info.json、Actions run、首页及中英文下载页。手动验证真实浏览器文件保存、备份恢复、离线启动与扩展授权。自动化测试和开源均不能代替独立安全审计。
