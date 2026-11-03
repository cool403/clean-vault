# Search engine indexing

The site ships one static artifact, but the search engines keep four independent indexes. A Google listing does not carry over: Bing needs its own verification and submission, Baidu needs its own, and DuckDuckGo simply reads Bing's index.

## Crawl policy

`dist/robots.txt` is now regenerated from scratch by `scripts/build-public-pages.mjs` instead of being patched, and it no longer depends on a hand-maintained allowlist:

- `User-agent: *` allows `/`. A page is crawlable as soon as it is published.
- Only AI-training and bulk-scraping crawlers (`GPTBot`, `CCBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `Bytespider`, `Amazonbot`, `meta-externalagent`, `PerplexityBot`) are disallowed site-wide. Those tokens are separate from search indexing: Googlebot, bingbot, Baiduspider and DuckDuckBot all fall through to the default rule.
- The previous "global `Disallow: /` plus per-path `Allow`" scheme is gone. One forgotten line hid a page forever, and crawlers that do not implement `$` read the file as a full block.

`sitemap.xml` is rebuilt the same way. `lastmod` comes from the commit being built (`SOURCE_DATE_EPOCH`, then `git log -1 --format=%cs`), so rebuilding a revision is deterministic. Outside a Git checkout the field is omitted with a warning rather than filled with a made-up timestamp.

## Submitting

### Google (done)

Verified in Search Console. After a change, request indexing for the home page and the guide pages from URL inspection.

### Bing

1. Add the site in [Bing Webmaster Tools](https://www.bing.com/webmasters); importing from Search Console is the fewest steps.
2. Submit `https://clear-vault.app/sitemap.xml`.
3. Push with IndexNow (below). It is the fastest path for a new domain.
4. `cn.bing.com` is a filtered edition with a different result set from the global index. Check with `https://www.bing.com/search?q=site%3Aclear-vault.app&ensearch=1`.

### Baidu

Baidu does not crawl the open web the way Google does; it relies on its webmaster platform and on links from sites it already knows, so this is manual work:

1. Add the site at [Baidu Search Resource Platform](https://ziyuan.baidu.com/) and verify with an HTML file or a CNAME record.
2. Submit the sitemap, then submit the home page and the Chinese guides one by one.
3. Confirm the site is reachable from mainland China. Cloudflare's overseas nodes often time out there, which is a common reason a Cloudflare-hosted site never gets indexed.
4. An overseas site without an ICP filing carries little weight; links from already-indexed Chinese sites are what moves it.

### DuckDuckGo

No submission channel. Results come from the Bing index, so it follows once Bing has the pages.

## IndexNow

`scripts/indexnow.mjs` pushes every URL in the sitemap to Bing, Yandex, Naver and Seznam in one request.

```bash
# 1. Pick a key: 8-128 characters of [A-Za-z0-9-]. It is public by design.
export INDEXNOW_KEY=your-key-here      # Windows: $env:INDEXNOW_KEY='your-key-here'

# 2. Build; the artifact then contains /<key>.txt
npm run release

# 3. After the deployment is live
npm run indexnow

# List the URLs without sending anything
npm run indexnow -- --dry-run
```

The script confirms that `https://clear-vault.app/<key>.txt` serves the key before posting. IndexNow rejects the whole batch (403) while that file is missing, so the order is build, deploy, push.

In GitHub Actions, store `INDEXNOW_KEY` as a repository secret: the build writes the key file, and `npm run indexnow` runs after the deployment step.

## Ads and CSP

AdSense appears only on the generated documentation pages (`/guides/`, `/security/`, `/privacy/`, `/en/` and so on). The vault entry `/` and `/downloads/` load no ad script:

- The `Content-Security-Policy` response header (`dist/_headers`) is the ad-capable policy and is what the documentation pages rely on.
- `dist/index.html` and `dist/downloads/index.html` each carry a stricter CSP `meta`. Multiple policies intersect, so those pages never inherit the ad permissions, and the "no third-party scripts" promise in `SECURITY.md` still holds.

A new page that shows ads must not carry a stricter `meta` policy; anything that runs vault code must keep the strict one.

## Known details

`dist/index.html` keeps two `google-site-verification` tags with different tokens, for two Search Console properties (domain and URL-prefix). Neither affects SEO, and removing the wrong one drops a verification, so both stay.
