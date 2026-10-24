# 自托管与可验证发布

需要 Node.js 24+（开发与测试）、Python 3.10+（生成 ZIP）。静态运行无需 Node/Python 服务端。

```sh
npm ci
npm test
npm run build:extension
npm run test:release
```

`release/web/` 和 `release/extension/` 是保留可读 JavaScript 的部署目录；`dist/` 和 `extension/` 仍为可读开发源码。`release/` 同时输出 web、extension、source 三份 ZIP，以及 SHA256SUMS.json、SOURCE-FILES.json。ZIP 文件顺序、权限和时间固定，同一输入在同一 Python/zlib 工具链上应产生相同结果。不同压缩工具链可用解压后的 SOURCE-FILES.json 文件哈希比对。校验值随未签名发布包一起分发只能检测传输差异，不能证明发布者身份。当前没有签名与外部审计。

源码包采用明确目录清单，不读取上层工作区、不包含 .git/.openai/node_modules 或用户密码库。仅保留三个明确列出的人工兼容测试 .db。发布前审阅清单，禁止放入真实文件。

## Cloudflare Pages

生产发布改由 GitHub Actions 测试和部署，配置详见 [GitHub → Cloudflare 指南](GITHUB-CLOUDFLARE.md)。自托管可将 `release/web/` 上传到自己的 Pages 项目。

## Docker / Nginx

先执行前面的构建命令，Docker 会复制可读的 `release/web/`。

```sh
docker build -t clearvault:0.3.8 .
docker run --rm -p 127.0.0.1:8080:80 clearvault:0.3.8
```

本机访问 http://localhost:8080。远程访问必须加 HTTPS 反向代理，否则 Web Crypto、文件 API、Service Worker 可能不可用。生产环境应在验证后将 Nginx 基础镜像固定到 digest；这里提供通用模板，不声称镜像构建已验证。

## 浏览器扩展（开发者安装）

执行 `npm run build:extension`，打开 Chrome 的 chrome://extensions 或 Edge 的 edge://extensions，启用开发者模式，加载已解压的 `extension/` 目录。也可解压 release 中的 extension ZIP 后加载。无需上传密码库或 API token。

在目标 HTTPS 网站点击工具栏扩展图标，侧栏选择 .db、输入主密码，点击匹配账号填充。密码库内网站字段必须填写该网站的精确域名；accounts.example.com 和 example.com 不自动等价。新站点需再次点击扩展图标授权。文件被 PWA 修改后，需要在扩展中重新打开；第一版不会同步或写回。侧栏关闭/隐藏会锁定，空闲默认 5 分钟。仅检测一个可见密码框，不支持多步骤用户名页面、iframe 或 Passkey。

浏览器商店上架需要发布者账号、隐私政策链接与人工审核，尚未完成。支持具备 sidePanel API 的 Chromium（Chrome 116+）；Edge 应在目标版本实测。Firefox 暂不支持。

Sites 的静态目录配置使用自动生成的 `out/`，它是 `release/web/` 的相同副本；不要部署开发源码 `dist/`。
