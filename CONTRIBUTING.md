# 贡献

参与开发前可先阅读[开发、测试与发布流程](docs/DEVELOPER-WORKFLOW.md)。

运行 `npm ci && npm test`。运行 `npm run build:extension` 后加载 extension/ 验证浏览器集成。扩展 core/ 由 dist 中共享代码生成，不直接编辑。

新增文案须同时更新中英文词典，禁止翻译密码库内容。任何格式改动必须保持未知 XML、附件和历史，增加合成测试。不可提交真实密码库、密码、token 或含秘密的截图。提交前检查 git diff 与 release/SOURCE-FILES.json。

发布前检查：保存/备份失败、同大小同时间冲突、恢复新副本、错误密码、锁定期间异步操作、错误/相似域名与 iframe 不填充、权限撤销与未授权网站。不要以测试通过代替独立安全审计。隐私边界见 SECURITY.md。

## 源码格式化

- `npm run format`：使用项目固定版本的 Prettier 格式化源码。
- `npm run format:check`：检查格式，适合提交前和 CI 使用。
- 统一使用两空格缩进、单引号、分号和 LF 换行，建议行宽为 100 字符。
- 第三方库、扩展生成的 `core/`、发布包和本地测试产物不参与格式化。
- 模板字符串内的 HTML 参与翻译字典的字面量匹配，因此关闭内嵌语言重排，保留字符串内容。

正式发布运行 `npm run test:release`。仓库中的 `dist/`、`extension/` 继续维护可读源码；不要手工修改生成的 `release/` 目录。部署目录是 `release/web/`，扩展分发目录是 `release/extension/`。
