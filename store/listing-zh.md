# Chrome Web Store / Edge 加载项商店文案 — 简体中文

## 名称

ClearVault — 本地密码库与验证器

## 简短说明（不超过 132 个字符）

在浏览器本地打开 SafeInCloud .db，填充账号并复制 TOTP 验证码。无账号、不上传、无遥测。

## 详细说明

ClearVault 是离线优先的 SafeInCloud 兼容密码库与 TOTP 验证器。它是独立的兼容工具，并非 SafeInCloud 官方产品。

密码库始终是你自己的文件。ClearVault 在浏览器本地解密，不需要账号、云服务，也不会上传密码库。

可以做什么：

- 打开并搜索 SafeInCloud 格式 1 / 2 的 .db 文件。
- 在当前 HTTPS 网站填充所选账号和密码，不自动提交。
- 复制账号、密码和 TOTP 验证码，可设置剪贴板自动清除时间。
- 为当前网站新建条目、生成密码并保存到加密文件。
- 在网站修改密码后确认更新条目。
- 导入 Chrome、Bitwarden、1Password、LastPass、Apple Passwords 和通用 CSV。
- 保留最近 5 个密码库，保存前校验并保留加密备份与本地加密快照。
- 网页端支持离线 PWA，界面支持简体中文、英语、德语、日语和西班牙语。

隐私与边界：

- 主密码、解密 XML 和 OTP 密钥不写入扩展存储，也不发送到服务器。
- 扩展不包含跟踪器、远程代码或分析脚本，CSP 禁止网络连接。
- 只匹配精确 HTTPS 来源；新网站需要点击工具栏图标授权。
- 扩展不监听页面输入、不自动提交表单、不在后台采集密码。
- 暂不支持 Firefox、Safari、iframe 填充和 Passkey provider。
- 尚未完成独立安全审计。请阅读安全页面并保留独立备份。

网页端在 Chromium 浏览器中可直接写回原文件；其他浏览器使用加密下载副本。请先用合成数据和数据库副本验证。

## 分类

生产力工具

## 语言

英语、简体中文、德语、日语、西班牙语（扩展界面）

## URL

- 主页：https://clear-vault.app/
- 隐私政策：https://clear-vault.app/privacy/（草稿也见 store/privacy-policy.md）
- 支持：https://github.com/cool403/clean-vault/issues
- 源码：https://github.com/cool403/clean-vault
- 安全：https://clear-vault.app/security/

## 审核测试步骤

1. 打开 https://clear-vault.app/?demo=1，选择“保存为我的密码库”，设置合成主密码并下载生成的 .db。
2. 在开发者模式加载扩展 ZIP，打开一个 HTTPS 测试页并点击 ClearVault 工具栏图标。
3. 选择刚下载的 .db，用合成密码解锁，确认列表出现匹配的演示条目。
4. 点击“填充此账号”或“复制密码”，确认不会自动提交表单。
5. 可选：在网页端添加合成 TOTP 密钥，验证扩展的复制/填入验证码。
6. 扩展不请求全站主机权限，也不发起网络请求。

## 权限

见 `permissions.md`。

## 隐私实践

- 不收集身份、健康、财务、认证、通信、位置、网页历史或用户活动数据。
- 不出售或转让用户数据。
- 密码库在本地处理，无服务器端存储。
- 不使用远程代码。

## 版本说明

<version> — 扩展：本地密码库搜索/复制、TOTP 显示与填入、新建条目、剪贴板自动清除、恢复工具包和加密 OPFS 快照。网页端另含保存冲突提示。
