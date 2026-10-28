# 移动端原生壳与 AutoFill 方案

## 当前状态

仓库目前只有 Web PWA 和 Chrome / Edge 扩展，没有 Android / iOS 原生工程。当前环境没有 JDK、Android SDK、Gradle 或 Xcode，无法编译、签名或在真机上验证原生 AutoFill。因此本文件是实施方案，不是已完成功能；未经验证的原生安全代码不应直接提交。

PWA 已经提供：安装引导、`.db` 文件关联、系统拖放、离线缓存和移动端布局。它没有系统级 AutoFill，不能替代 Android AutofillService 或 iOS Credential Provider。

## 推荐路线

**Capacitor 壳 + 共享 Rust vault core**，而不是只把网页套进 WebView。

- Capacitor 复用现有 Web UI，负责文件选择、分享、生物识别和生命周期。
- Rust core 负责 SafeInCloud 格式解析、加解密、条目/标签模型和合并；通过 UniFFI 同时供 Android、iOS 与 WebView 调用。
- Android AutofillService 与 iOS Credential Provider Extension 直接调用 Rust core，不依赖 WebView 是否存活。
- 现有 JavaScript core 和测试向量作为 Rust 实现的兼容性基准；在 Rust core 通过同一批往返、Unicode、TOTP、保存冲突与合并测试前，不替换 Web 实现。

只做 WebView 壳而不做共享 core 时，系统 AutoFill 无法在应用未打开或进程被回收后读取密码库；每次填充都要求打开应用，体验不成立。

## 安全模型

- 主密码不持久化。解锁后在 native core 中派生密钥；可用 Android Keystore / iOS Keychain 保护一个包装密钥，并以设备生物识别解锁。
- 自动锁定、剪贴板清除、精确来源匹配和“不自动提交”沿用现有边界。
- Android 浏览器按 HTTPS origin 匹配；普通 App 按 package name 与签名证书匹配，并在填充前显示目标应用。
- iOS Credential Provider 由系统选择条目，扩展不自动提交。
- `.db` 文件通过 SAF / iOS document picker 访问；同步仍由用户选择的文件夹工具完成。
- 现有兼容格式没有 AEAD；移动 AutoFill 上线前需要安全审计。若长期投入移动端，建议并行设计带 Argon2id + AEAD 的原生格式，兼容模式继续读写 SafeInCloud。
- 原生工程必须包含：密钥不落盘、日志不记录秘密、崩溃转储不含明文、WebView 与 native core 的边界审查。

## 实施阶段

1. **PWA 移动基础（已完成）**：安装引导、`.db` 文件关联、拖放、iOS/Android 限制说明。
2. **原生壳（2–4 周）**：Capacitor 工程、Android/iOS 文件打开与保存、最近文件、生物识别解锁、离线启动。仍不做 AutoFill。
3. **共享 Rust core（4–8 周）**：移植格式与加密、条目/标签模型、合并；用现有 fixtures 和 RFC 6238 向量做差分测试；通过审计后再切换。
4. **Android AutoFill（4–6 周）**：AutofillService、精确 package/origin 匹配、用户确认、锁定时提示解锁；真机与 Play 审核。
5. **iOS Credential Provider（4–6 周）**：App Group、Keychain、Credential Provider Extension、TestFlight；需要 macOS/Xcode 和 Apple Developer 账号。
6. **发布与审计（持续）**：签名、商店资料、隐私政策、独立安全审计、崩溃/漏洞响应。

## 工具链与前置条件

- Android：JDK 17、Android SDK 35、Gradle、签名 keystore、模拟器或真机；CI 可用 Linux runner。
- iOS：macOS 14+、Xcode 16、Apple Developer Program、Provisioning Profile；必须在 macOS 上构建和签名。
- Rust：stable toolchain、Android NDK、iOS targets、UniFFI。
- 安全：独立审计预算、漏洞报告渠道、可复现构建与 SBOM。

## 待决定

- 是否把移动端作为正式产品投入，而不只是 PWA 伴侣。
- 是否接受为 AutoFill 维护 Rust + JS 双核心，或长期迁移到 native core。
- 是否在移动端引入原生格式/AEAD；这会影响与 SafeInCloud 的兼容范围。
- 同步继续 BYO 文件夹，还是未来提供端到端加密同步服务。

## 与现有代码的关系

- Web 端 BYO 同步与合并已实现：`dist/merge.js`、`merge.test.mjs`、`decryptDatabaseWithCredential`。
- 文件关联与安装引导：`dist/manifest.*.webmanifest`、`dist/app.js`。
- 现有密码库格式、加密和 TOTP 测试可作为 Rust core 的兼容性基准。
