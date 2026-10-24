// Public documentation only. Never include vault records or real credentials here.
export const articles = [
  {
    slug: 'open-safeincloud-db',
    zh: {
      title: '如何打开、编辑和保存 SafeInCloud DB 文件',
      description:
        '使用 ClearVault 在浏览器本地打开 SafeInCloud .db 密码库，了解主密码、文件保存、备份与恢复步骤。',
      intro:
        '已有 SafeInCloud 数据库？带上 .db 文件和主密码，就可以在浏览器中管理条目。文件在设备本地解密，无需注册账户。',
      sections: [
        [
          '开始前，留一份独立备份',
          '复制原始 .db 文件，保存在另一个位置。先用副本验证兼容性；不要同时在 ClearVault 和其他应用中编辑同一个文件。ClearVault 是独立的兼容工具，并非 SafeInCloud 官方产品。',
        ],
        [
          '1. 选择数据库并解锁',
          '打开 ClearVault，点击“打开 .db 密码库”，选择文件，再输入已有主密码。网站没有账户登录；主密码用于本地解密文件。若只是了解界面，可以点击“先体验一下”，使用合成演示数据。',
        ],
        [
          '2. 搜索、查看与编辑条目',
          '解锁后可搜索条目，查看账号、显示或复制密码，再点击编辑。Ctrl / ⌘ + K 打开快速查找，↑ ↓ 选择，Ctrl / ⌘ + Enter 复制密码，Ctrl / ⌘ + Shift + L 锁定密码库。复制前核对条目，粘贴后留意系统剪贴板历史。',
        ],
        [
          '3. 保存到加密文件',
          '修改不会自动同步到服务器。支持文件写入 API 的浏览器可授权写回原文件；覆盖前按应用提示选择独立备份目录。通过普通文件选择器打开或浏览器不支持写回时，使用“另存为 .db 文件”并确认下载文件实际保存。',
        ],
        [
          '4. 重新打开，确认保存结果',
          '先保存，再锁定并重新打开导出的数据库，检查修改是否存在。刷新、关闭页面会丢失未保存内容。自动备份不能替代独立备份；更改主密码也不会更改旧备份的密码。',
        ],
        [
          '打不开文件时检查什么？',
          '确认文件属于兼容的 SafeInCloud .db 格式，主密码、输入法和键盘布局正确。解密失败不一定只有密码错误一种原因，也可能是文件损坏或格式不兼容。不要把真实密码库或主密码发送给网站、公开 issue 或他人；排查时只使用合成样本。',
        ],
      ],
    },
    en: {
      title: 'How to open, edit and save a SafeInCloud DB file',
      description:
        'Open a SafeInCloud .db file locally with ClearVault. Learn how to unlock, edit, export, back up and verify your encrypted vault.',
      intro:
        'Bring your SafeInCloud .db file and master password to manage entries in your browser. Decryption happens on your device, with no account registration.',
      sections: [
        [
          'Keep an independent backup first',
          'Copy the original .db file to another location and test a copy before using your real vault. Avoid editing the same file in ClearVault and another application at the same time. ClearVault is an independent compatible tool, not an official SafeInCloud product.',
        ],
        [
          '1. Select and unlock the database',
          'Open ClearVault, choose “Open .db vault”, select your file and enter its existing master password. There is no website account login: the password decrypts the file locally. Use “Try a demo” to explore with synthetic data first.',
        ],
        [
          '2. Find and edit entries',
          'Search your vault, view account details, reveal or copy a password, and edit an entry. Ctrl / ⌘ + K opens quick search; ↑ ↓ selects; Ctrl / ⌘ + Enter copies a password; Ctrl / ⌘ + Shift + L locks the vault. Check the selected entry and be mindful of clipboard history.',
        ],
        [
          '3. Save an encrypted file',
          'Changes do not sync to a server. Browsers with the file writing API can write back after you grant permission; follow the prompt to choose a separate backup directory before replacing a file. If direct writing is unavailable, use “Save as .db” and confirm that the downloaded file was actually saved.',
        ],
        [
          '4. Reopen to verify the result',
          'Save, lock and reopen the exported database to check your changes. Refreshing or closing the page loses unsaved edits. Automatic backups do not replace independent backups, and changing the master password does not change the password of older backups.',
        ],
        [
          'If the file will not open',
          'Check the file format, master password and keyboard layout. A decryption failure can also mean a damaged or incompatible file. Never send a real vault, master password or TOTP secret to a website, public issue or another person. Use synthetic samples for troubleshooting.',
        ],
      ],
    },
  },
  {
    slug: 'safeincloud-linux',
    zh: {
      title: '在 Linux 上使用 SafeInCloud 数据库',
      description:
        '用 ClearVault PWA 在 Linux 浏览器中管理 SafeInCloud DB，了解离线使用、浏览器扩展与保存兼容性。',
      intro:
        'ClearVault 提供浏览器中的本地密码库工作流。你可以在 Linux 上打开兼容数据库，也可以在支持安装的浏览器中将它作为 PWA 使用。',
      sections: [
        [
          '先从副本开始',
          '从已有设备取得加密 .db 文件，留好独立备份，再在 Linux 浏览器中打开 ClearVault。文件传输由你选择的方式完成；ClearVault 不提供云盘连接、账号同步或后台文件同步。',
        ],
        [
          '浏览器决定文件保存能力',
          '解密和导出使用浏览器能力，原文件写回则需要浏览器支持并授权文件写入 API。不要把“支持浏览器访问”理解为所有浏览器都能写回。没有写回能力时另存 .db，再重新打开确认。',
        ],
        [
          '安装与离线使用',
          '支持 PWA 安装的浏览器会提供安装入口。先联网打开应用，让 Service Worker 完成应用资源缓存，再断网验证可以启动。首次访问、资源尚未缓存、缓存被清除或浏览器回收存储时仍需联网。数据库不会因为安装 PWA 而自动保存。',
        ],
        [
          '可选：浏览器扩展',
          '下载页提供 Chrome / Edge 扩展压缩包，尚未上架商店。按说明解压并加载后，打开目标网站，手动点击扩展授权，再选择条目填充。扩展只读，不写回数据库；只匹配 HTTPS 精确来源，不自动提交表单，不支持 Firefox、跨域 iframe 或 Passkey 填充。',
        ],
        [
          '多设备使用时如何避免冲突',
          '每次只在一个应用或设备中编辑。保存并验证文件后，再使用你信任的方式传输加密文件。若出现外部文件变化提示，先另存编辑结果并核对版本，不要强行覆盖。',
        ],
      ],
    },
    en: {
      title: 'Use a SafeInCloud database on Linux',
      description:
        'Manage SafeInCloud DB files with ClearVault on Linux. Understand browser file saving, offline PWA use and the optional browser extension.',
      intro:
        'ClearVault brings a local vault workflow to your browser. Open a compatible database on Linux, or install the PWA where your browser supports it.',
      sections: [
        [
          'Start with a copy',
          'Bring your encrypted .db file from an existing device, keep an independent backup and open ClearVault on Linux. File transfer is up to you: ClearVault has no cloud drive connection, account sync or background file synchronization.',
        ],
        [
          'Your browser determines how saving works',
          'Decryption and export use browser capabilities. Writing back to the original requires support for the file writing API and your permission. Browser access does not mean every browser supports direct writing. Otherwise export a .db file and reopen it to verify the result.',
        ],
        [
          'Installation and offline use',
          'Browsers supporting PWA installation provide an install action. Open the app online first so its Service Worker can cache the application resources, then test launching offline. A first visit, incomplete cache, cleared storage or storage eviction still requires a connection. Installing the PWA does not automatically save your database.',
        ],
        [
          'Optional browser extension',
          'The downloads page provides a Chrome / Edge extension ZIP; it is not listed in browser stores. Unpack and load it as instructed, visit the target site, click the extension to grant access and choose an entry to fill. The extension is read-only, matches exact HTTPS origins and never submits forms. Firefox, cross-origin iframes and Passkey filling are not supported.',
        ],
        [
          'Avoid conflicts across devices',
          'Edit in only one app or device at a time. Save and verify the encrypted file before transferring it through a method you trust. If the app reports an external change, save your edits as a separate file and compare versions instead of forcing an overwrite.',
        ],
      ],
    },
  },
  {
    slug: 'totp',
    zh: {
      title: '设置 TOTP 双重验证与动态验证码',
      description:
        '在 ClearVault 条目中添加 TOTP 验证密钥或二维码图片，了解动态验证码、兼容参数、备份与常见问题。',
      intro:
        'ClearVault 可以从条目中的 TOTP 密钥生成动态验证码。它是验证码生成器，不是给密码库本身增加一层登录验证。',
      sections: [
        [
          '1. 在目标网站开启验证器验证',
          '进入目标网站的安全设置，选择验证器应用。妥善保存网站提供的恢复码，避免丢失验证器后无法登录。不要将恢复码与未经备份的唯一数据库放在同一个失效点。',
        ],
        [
          '2. 把密钥加入对应条目',
          '在 ClearVault 新建或编辑条目，添加双重验证字段，填入 Base32 密钥或 otpauth://totp/ 地址。也可以通过“导入二维码图片”选择图片；当前使用本地图片解析，不会开启摄像头。验证密钥和二维码都属于秘密。',
        ],
        [
          '3. 核对参数并在网站确认',
          '支持 SHA1、SHA256、SHA512，6 位或 8 位代码及自定义周期；参数必须和网站一致。与 SafeInCloud 共用时请使用 30 秒周期。先将生成代码填入目标网站完成验证，再保存 .db 并重新打开检查。',
        ],
        [
          '验证码无效怎么办？',
          '先检查设备时间和时区同步，接近倒计时结束时等待下一组代码。再检查是否选错条目、密钥是否完整，以及算法、位数和周期是否一致。HOTP 计数器地址不是 TOTP，不能混用。',
        ],
        [
          '便利与隔离的取舍',
          '把密码和 TOTP 密钥放在同一密码库更方便，但主密码或解锁设备失守时两者可能一起暴露。需要更强隔离时，可将验证器放在另一台受保护的设备，或使用目标网站支持的安全密钥。ClearVault 的 TOTP 功能本身不提供 Passkey 支持。',
        ],
      ],
    },
    en: {
      title: 'Set up TOTP two-factor authentication codes',
      description:
        'Add a TOTP secret or QR-code image to a ClearVault entry. Learn about parameters, recovery, code errors and the security trade-off.',
      intro:
        'ClearVault generates time-based codes from TOTP secrets in your entries. This is an authenticator feature, not an extra sign-in factor for unlocking the vault itself.',
      sections: [
        [
          '1. Enable authenticator verification on the website',
          'Open the target website’s security settings and select an authenticator app. Keep the recovery codes provided by that website so losing an authenticator does not lock you out. Avoid keeping the only recovery copy in the same unbacked-up vault.',
        ],
        [
          '2. Add the secret to the right entry',
          'Create or edit an entry in ClearVault, add a two-factor authentication field and enter the Base32 secret or otpauth://totp/ URI. You can also select a QR-code image through the image import action. Parsing happens locally; camera scanning is not used. Both the secret and QR code are sensitive.',
        ],
        [
          '3. Match parameters and confirm on the website',
          'SHA1, SHA256 and SHA512, 6- or 8-digit codes and custom periods are supported. Match the website’s parameters, and use a 30-second period when sharing the database with SafeInCloud. Confirm a generated code on the website, then save and reopen the .db file.',
        ],
        [
          'If a code is rejected',
          'Check the device’s clock synchronization. Wait for a fresh code if the countdown is almost over. Confirm the selected account, complete secret, algorithm, number of digits and period. HOTP counter-based URIs are different from TOTP and cannot be substituted.',
        ],
        [
          'Convenience and separation',
          'Keeping passwords and TOTP secrets in one vault is convenient, but both may be exposed if the master password or unlocked device is compromised. For stronger separation, use an authenticator on another protected device or a security key supported by the website. ClearVault’s TOTP feature does not provide Passkey support.',
        ],
      ],
    },
  },
];

export const security = {
  zh: {
    title: '安全与隐私：数据在哪里，边界在哪里',
    description:
      '了解 ClearVault 的本地解密、网络请求、浏览器缓存、加密文件、备份与安全限制。尚未经过独立安全审计。',
    intro:
      '密码管理器值得被仔细检查。这里说明当前实现做了什么、哪些数据会离开设备，以及它不能保护什么。',
    sections: [
      [
        '你的密码库在设备本地解密',
        '数据库文件、主密码、条目和 TOTP 密钥不会由应用上传到服务器。解锁期间，解密后的数据库保留在页面内存中以供编辑；锁定时移除界面与引用并清零可控字节数组。JavaScript 字符串与垃圾回收无法保证物理内存被彻底擦除。',
      ],
      [
        '访问网页仍有网络元数据',
        '加载托管站点会请求 HTML、脚本、样式和图标，托管服务可看到 IP 地址、时间与 HTTP 元数据。应用源码没有集成远程字体或跟踪像素。公开站点保留 Cloudflare Pages Web Analytics，托管平台会向 HTML 注入统计脚本，其加载与执行受站点 CSP 限制；自行托管的原始包不含此注入。Search Console 用于查看搜索表现，不在密码库中埋点。普通外链只有在你点击时才会打开。',
      ],
      [
        '浏览器保存什么',
        'localStorage 仅保存界面语言；没有将解密条目或整个密码库写入 IndexedDB。Service Worker 缓存应用资源，用于离线启动。文件句柄、备份目录授权与保留数量在当前页面会话中使用；换域名后需要重新打开文件。关闭页面不等于已经保存修改。',
      ],
      [
        '加密兼容性不等于现代认证加密',
        '兼容格式沿用 PBKDF2-SHA1（10000 次）与 AES-256-CBC，正文是压缩 XML。CBC 正文没有现代 AEAD 提供的认证能力；文件 SHA-256 指纹用于检测变化，不是抗恶意篡改认证。新密码库使用支持 Unicode 的版本 2 密码编码，但不能因此宣称加密格式已升级为 AEAD。',
      ],
      [
        '保存、备份与恢复的边界',
        '写回前比较原文件指纹，覆盖前备份原密文并读回校验，写入后再次校验。浏览器不能提供跨应用的原子比较交换，仍应避免同时编辑。旧备份不会随主密码修改而重加密。下载只表示发起导出，需自行确认磁盘上的文件并重新打开检查。',
      ],
      [
        '扩展仅获得当前网站授权',
        '扩展使用 activeTab、scripting、sidePanel，无全站主机权限或持久内容脚本。用户点击后才向精确匹配的 HTTPS 来源填充所选账号，不自动提交。目标网站能够读取填入它的密码；这属于填充的固有边界。',
      ],
      [
        '仍无法保护的情况',
        '受感染的操作系统、恶意浏览器或扩展、解锁时被读取的页面内存、主密码泄露以及被篡改的应用发布，都超出当前保护边界。安全使用依赖设备、浏览器和发布来源。可从下载页取得源码与自托管说明，校验值不能代替签名或审计。',
      ],
      [
        '审计与问题报告',
        '本项目尚未完成独立安全审计、代码签名或浏览器商店审核。目前没有公布专用私密漏洞报告渠道，请勿在公开 issue 或任何公开表单上传真实密码库、主密码、TOTP 密钥或可利用的敏感材料。应先用合成样本记录版本、复现步骤和影响，再通过维护者确认的私密渠道协调。',
      ],
    ],
  },
  en: {
    title: 'Security and privacy: your data and the boundaries',
    description:
      'Understand ClearVault local decryption, network requests, browser storage, encryption, backups and limitations. No independent security audit has been completed.',
    intro:
      'A password manager deserves close inspection. Here is what the current implementation does, what can leave your device and what it cannot protect.',
    sections: [
      [
        'Your vault is decrypted on your device',
        'The application does not upload database files, master passwords, entries or TOTP secrets. While unlocked, decrypted data stays in page memory for editing. Locking removes the UI and references and clears controllable byte arrays. JavaScript strings and garbage collection cannot guarantee physical memory erasure.',
      ],
      [
        'Visiting the site still creates network metadata',
        'Loading the hosted site requests HTML, scripts, styles and icons. The hosting provider can see IP addresses, request times and HTTP metadata. The application source includes no remote fonts or tracking pixels. The public site retains Cloudflare Pages Web Analytics, which injects an analytics script into hosted HTML; loading and execution are subject to the site CSP. Self-hosted packages do not contain this injection. Search Console reports search performance without tracking actions inside your vault. Ordinary external links open only when you click them.',
      ],
      [
        'What the browser stores',
        'localStorage holds only the interface language; decrypted entries and the vault are not persisted to IndexedDB. The Service Worker caches application resources for offline use. File handles, backup directory permission and retention settings are used within the current page session. A different domain requires opening the file again. Closing the page does not save changes.',
      ],
      [
        'Compatibility is not modern authenticated encryption',
        'The compatible format uses PBKDF2-SHA1 with 10,000 iterations and AES-256-CBC over compressed XML. The CBC payload does not provide modern AEAD authentication. SHA-256 file fingerprints detect changes; they are not authentication against malicious tampering. New vaults use version 2 Unicode password encoding, which does not upgrade the format to AEAD.',
      ],
      [
        'Saving, backups and recovery',
        'Before writing, the app compares the original file fingerprint, backs up and verifies existing ciphertext, and checks the written result. Browsers cannot offer atomic compare-and-swap across applications, so avoid simultaneous editing. Changing a master password does not re-encrypt older backups. A download action only starts export: confirm the file on disk and reopen it to verify.',
      ],
      [
        'The extension uses current-site access',
        'The extension uses activeTab, scripting and sidePanel, with no global host permissions or persistent content scripts. After a user action it fills only the selected credentials into an exact matching HTTPS origin, without submitting. The destination website can read a password filled into it; that is an inherent boundary of filling.',
      ],
      [
        'What remains outside the protection boundary',
        'A compromised operating system, malicious browser or extension, access to unlocked page memory, a leaked master password or a tampered app release can expose data. Safe use depends on your device, browser and release source. Source code and self-hosting instructions are available in downloads. Checksums do not replace signatures or audits.',
      ],
      [
        'Audit status and reporting',
        'Independent security auditing, code signing and browser store review have not been completed. No dedicated private vulnerability reporting channel is currently published. Never upload real vaults, master passwords, TOTP secrets or exploitable sensitive material to public issues or forms. Record the version, reproduction and impact with synthetic samples, then coordinate through a private channel confirmed by the maintainer.',
      ],
    ],
  },
};
