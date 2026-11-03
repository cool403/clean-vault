# 搜索引擎收录

站点只有一套静态产物，但四个搜索引擎是四套互相独立的索引。Google 收录不会传导到其他引擎：Bing 需要单独验证并提交，百度需要单独验证并推送，DuckDuckGo 直接使用 Bing 的索引。

## 抓取策略

`dist/robots.txt` 由 `scripts/build-public-pages.mjs` 每次完整重新生成，不再依赖手工维护的白名单：

- `User-agent: *` 默认 `Allow: /`。新页面一发布即可被抓取，不需要再补 `Allow` 行。
- 只有 AI 训练与批量抓取爬虫（`GPTBot`、`CCBot`、`ClaudeBot`、`Google-Extended`、`Applebot-Extended`、`Bytespider`、`Amazonbot`、`meta-externalagent`、`PerplexityBot`）被整站禁止。这些 token 与搜索收录无关：Googlebot、bingbot、Baiduspider、DuckDuckBot 都走默认规则。
- 旧的“全局 `Disallow: /` + 逐条 `Allow`”写法已废弃：新页面漏加一条就永久不被收录，而且不实现 `$` 的爬虫会误判整站禁止。

`sitemap.xml` 同样每次重建。`lastmod` 取自被构建的提交日期（`SOURCE_DATE_EPOCH`，其次 `git log -1 --format=%cs`），因此同一版本重复构建的结果一致；在非 Git 环境下会省略并打印提示，不会伪造时间戳。

## 提交收录

### Google（已完成）

Search Console 已验证。改动后可在“网址检查”里对首页与指南页请求编入索引。

### Bing

1. [Bing Webmaster Tools](https://www.bing.com/webmasters) 添加站点，直接从 Search Console 导入验证最省事。
2. 提交 `https://clear-vault.app/sitemap.xml`。
3. 用 IndexNow 推送（见下节），这是新域名最快的通道。
4. 注意 `cn.bing.com`（国内版）是过滤版，与 `bing.com` 全球版不是同一个结果集。验证时用 `https://www.bing.com/search?q=site%3Aclear-vault.app&ensearch=1`。

### 百度

百度不主动遍历全网，靠站长平台提交和外链发现，因此必须手动做：

1. [百度搜索资源平台](https://ziyuan.baidu.com/) 添加站点，验证方式选 HTML 文件或 CNAME。
2. 提交 sitemap，再用“普通收录”逐条提交首页与中文指南页。
3. 确认站点从中国大陆可访问。Cloudflare 的海外节点在国内经常超时，抓取失败率是百度不收录境外站的常见原因。
4. 无 ICP 备案的境外站点权重天然偏低，需要靠已收录的中文站点外链带动。

### DuckDuckGo

没有提交入口，结果来自 Bing 索引。Bing 收录后会自动出现。

## IndexNow

`scripts/indexnow.mjs` 把 sitemap 里的全部 URL 一次性推给 Bing、Yandex、Naver 和 Seznam。

```bash
# 1. 生成一个 key（8-128 位 [A-Za-z0-9-]），它本身就是公开的
export INDEXNOW_KEY=your-key-here      # Windows: $env:INDEXNOW_KEY='your-key-here'

# 2. 构建，产物里会写入 /<key>.txt
npm run release

# 3. 部署完成后推送
npm run indexnow

# 只看要提交哪些 URL，不发请求
npm run indexnow -- --dry-run
```

脚本会先确认 `https://clear-vault.app/<key>.txt` 返回的内容与 key 一致，再发送请求。key 文件没上线时 IndexNow 会直接拒绝整批提交（403），所以顺序必须是“构建 → 部署 → 推送”。

在 GitHub Actions 里使用时，把 `INDEXNOW_KEY` 配成仓库 secret；构建阶段会读取它写入 key 文件，部署后再执行一次 `npm run indexnow`。

## 广告与 CSP

AdSense 只出现在生成的文档页（`/guides/`、`/security/`、`/privacy/`、`/en/` 等），密码库入口 `/` 和 `/downloads/` 不加载任何广告脚本：

- 响应头 `Content-Security-Policy`（`dist/_headers`）是允许广告的那一套，文档页依赖它。
- `dist/index.html` 与 `dist/downloads/index.html` 各自带一条更严格的 CSP `meta`。多条策略取交集，所以这两个页面不会继承广告权限，`SECURITY.md` 里“不引入第三方脚本”的承诺仍然成立。

新增页面如果加载广告，要确认它没有带更严格的 `meta` CSP；反之，涉及密码库代码的页面必须保留严格策略。

## 已知事项

`dist/index.html` 里保留了两条 `google-site-verification`，token 不同，对应 Search Console 的两个资源（域名资源与前缀资源）。没有 SEO 影响，删错会掉验证，暂时都留着。
