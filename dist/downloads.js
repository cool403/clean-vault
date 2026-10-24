import { buildInfo } from './build-info.js';
import { initializeLanguage, setLanguage, getLocale, html, t } from './i18n.js';
import { mountSupportLinks } from './support.js';
initializeLanguage();
function render() {
  document.title = 'ClearVault · ' + t('下载与源代码');
  document.querySelector('#downloads').innerHTML =
    html`<header><a class="brand" href="../"><img src="../icon.svg" alt="" width="29" height="29">ClearVault.</a><select aria-label="${t('选择语言')}" id="language"><option value="zh-CN" ${getLocale() === 'zh-CN' ? 'selected' : ''}>简体中文</option><option value="en" ${getLocale() === 'en' ? 'selected' : ''}>English</option></select></header><h1>下载与源代码</h1><p>${t('版本 {version} · 本地优先，自由保管。', { version: buildInfo.version })}</p><div class="grid"><section class="card"><h2>浏览器扩展</h2><p>本地解锁，支持分步填充、导入、密码更新确认与验证保存。</p><a class="button" download href="./clearvault-${buildInfo.version}-extension.zip">下载扩展</a></section><section class="card"><h2>MIT 开源代码</h2><p>包含应用、扩展、测试、安全说明和自托管配置。</p><div class="download-details"><a href="${buildInfo.workflow || buildInfo.repository + '/actions'}">${t('查看构建记录')} ↗</a></div><a class="button" href="${buildInfo.source}">${t('在 GitHub 查看源码')} ↗</a></section></div><h2>${t('核对线上版本')}</h2><p>${t('线上代码保持可读，测试通过后由 GitHub Actions 部署到 Cloudflare。')}</p><p>${buildInfo.revision ? buildInfo.revision.slice(0, 12) : t('本地构建')} · <a href="/build-info.json">${t('版本与提交信息')}</a> · <a href="/ASSET-SHA256SUMS.json">SHA-256</a></p><h2>安装扩展</h2><p>解压扩展包，在 Chrome 或 Edge 的扩展管理页面启用开发者模式，然后选择“加载已解压的扩展程序”。点击目标网站的工具栏扩展图标，再打开密码库。</p><p>此版本未在浏览器商店上架。支持带备份的本地保存，不支持 Firefox、Passkey 或 iframe 填充。</p><h2>自行部署</h2><p>先执行 npm ci 和 npm run release，再将 release/web 目录部署到 HTTPS 静态托管，或按 docs/SELF-HOSTING.md 使用 Docker。开发扩展执行 npm run build:extension，验证正式产物执行 npm run test:release。</p><footer><nav aria-label="Help">${getLocale() === 'en' ? '<a href="/en/guides/">Guides</a> · <a href="/en/security/">Security &amp; privacy</a> · <a href="/en/downloads/">English downloads</a>' : '<a href="/guides/">使用指南</a> · <a href="/security/">安全与隐私</a> · <a href="/en/downloads/" lang="en">English</a>'}</nav><a href="./SHA256SUMS.json">SHA-256</a><p>校验值用于比对文件，不能代替签名或安全审计。独立审计和浏览器实际安装验证尚未完成。请先使用合成数据验证，保留独立加密备份。</p></footer>`;
  mountSupportLinks('#downloads footer');
  document.querySelector('#language').onchange = (event) => {
    setLanguage(event.target.value);
    render();
  };
}
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js').catch(() => {});
