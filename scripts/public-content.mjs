// Public documentation only. Never include vault records or real credentials here.
export const articles = [
  {
    slug: 'open-safeincloud-db',
    zh: {
      title: '如何打开、编辑和保存 SafeInCloud DB 文件',
      description:
        '使用 ClearVault 在浏览器本地打开 SafeInCloud .db 密码库，了解主密码、文件保存、备份与恢复步骤。',
      intro:
        '已有 SafeInCloud 数据库？带上 .db 文件和主密码，就可以在浏览器中管理条目。文件在设备本地解密，无需注册账户。网页顶部和偏好设置支持简体中文、English、Deutsch、日本語和 Español；首次按浏览器偏好匹配，手动选择会本地记住，不翻译密码库内容。可用 /?lang=de、/?lang=ja、/?lang=es 指定启动语言，离线也能切换。公开教程继续提供中英文。',
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
          '先保存，再锁定并重新打开数据库检查修改。首页“最近密码库”保留最近 5 个文件的名称和句柄，点击后重新授权并输入主密码。文件移动、权限失效或浏览器不支持句柄时，重新选择文件。可移除单条或清空记录；网页和扩展记录相互独立。刷新、关闭页面会丢失未保存内容，最近记录不是备份。当前页面已选择的文件和锁定后的密码库统一显示在列表中，不再另设重新解锁入口；有未保存更改时，点击“解锁并继续未保存的修改”恢复当前加密副本。清空历史不会丢弃当前会话。可点击记录旁的文件夹图标“确认所在目录”，选择包含密码库的目录；应用核对后显示上次确认的文件夹名和相对目录。浏览器不提供完整绝对路径，文件移动后需重新确认。',
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
        'Bring your SafeInCloud .db file and master password to manage entries in your browser. Decryption happens on your device, with no account registration. The header and Preferences offer Chinese, English, German, Japanese and Spanish. The app matches browser preferences and remembers manual choices locally without translating vault contents. Launch with /?lang=de, /?lang=ja or /?lang=es to choose a language explicitly. Language switching works offline. Public guides remain available in Chinese and English.',
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
          'Save, lock and reopen the database to verify changes. Recent vaults on the home screen remembers up to five file names and handles. Select one, grant access again if needed and enter your master password. If the file moved or handles are unsupported, select it again. Remove individual records or clear history anytime. The app and extension have separate histories. Closing or refreshing loses unsaved edits; recent history is not a backup. Selected files and locked vaults use this same list without a separate reopen link. Choose Unlock and continue unsaved changes to resume the current encrypted copy. Clearing history keeps this current session. Use the folder icon to confirm a containing directory. The app verifies membership and shows its last confirmed name and relative directory. Browsers do not expose a full absolute path; confirm again after moving files.',
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
          '下载页提供 Chrome / Edge 扩展压缩包，尚未上架商店。解压加载后，在目标网站点击扩展授权，再打开最近密码库或选择文件并解锁。支持分步登录、为同一条目添加多个精确 HTTPS 地址、确认更新密码和导入。修改后点击保存数据库，覆盖前自动备份并验证。文件外部变化时先另存编辑结果，再重新加载并解锁。不支持 Firefox、iframe 或 Passkey，不自动提交表单。',
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
          'Download and unpack the Chrome / Edge extension; it is not listed in browser stores. Click its icon on the target website, reopen a recent vault or choose a file, then unlock. It supports multistep login, multiple explicitly added HTTPS origins, confirmed password updates and imports. Save changes with verified backups before overwriting. If the file changes externally, save your edits as a copy, then reload and unlock. Firefox, iframe and Passkey filling are unsupported. Forms are never submitted automatically.',
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

articles.push(
  {
    slug: 'import-passwords',
    zh: {
      title: '从 Chrome 或 Bitwarden 导入密码',
      description:
        '在网页和浏览器扩展中本地导入 Chrome CSV、Bitwarden CSV / JSON，预览重复条目并验证加密保存。',
      intro:
        '先打开或新建 ClearVault 密码库，再导入已有密码。网页与扩展共用相同的导入预览、字段对应和重复检测。',
      sections: [
        [
          '1. 从原工具导出',
          'Chrome：打开 Google 密码管理工具的设置，选择导出密码，按系统提示验证身份并保存 CSV。Bitwarden：在导出密码库中选择未加密 CSV 或 JSON，JSON 更适合保留多个网址与自定义字段。通行密钥不属于 Chrome 密码 CSV。本地导出文件可能包含明文密码，请妥善保管。',
        ],
        [
          '2. 选择来源并预览',
          '解锁目标 .db 后，在网页顶栏、偏好设置或扩展中点击“导入密码”，选择 Chrome CSV、Bitwarden CSV 或 Bitwarden JSON，再选择文件并点击“预览导入”。文件最大 20 MB，一次最多 10000 个条目。预览展示新增、重复、不支持的数量及前 10 个条目的名称和账号，不展示密码。',
        ],
        [
          '3. 核对字段与保留范围',
          '名称对应条目名称，用户名对应账号，密码对应密码，网址对应网站，备注保留，Bitwarden 文件夹对应标签、收藏对应收藏。支持登录和安全笔记；JSON 支持多个网址、自定义文本、布尔值与隐藏字段。CSV 自定义字段整体保留为私密字段。不支持的验证码密钥原样保留为私密字段。卡片、身份等类型会计数跳过；附件、通行密钥与关联字段会提示未导入。Bitwarden 的网址匹配规则和再次验证策略不迁移，扩展始终按精确 HTTPS 来源匹配。',
        ],
        [
          '4. 确认并保存',
          '完全相同的条目会跳过，密码或其他内容不同的条目分别保留，不覆盖已有条目。点击“确认导入”才修改当前密码库；取消或锁定会清除预览。导入后点击“保存数据库”，首次覆盖原文件时选择独立加密备份目录。浏览器只能下载时，请确认下载成功并重新打开加密 .db 核对，再妥善清理明文导出。',
        ],
      ],
    },
    en: {
      title: 'Import passwords from Chrome or Bitwarden',
      description:
        'Import Chrome CSV and Bitwarden CSV / JSON locally in the app or extension, preview duplicates and verify your encrypted save.',
      intro:
        'Open or create a ClearVault vault first. The app and extension share the same import preview, mapping and duplicate checks.',
      sections: [
        [
          '1. Export from your previous tool',
          'In Chrome, open Google Password Manager settings and export passwords as CSV, completing system authentication. In Bitwarden, export an unencrypted CSV or JSON file; JSON retains multiple URLs and typed custom fields more accurately. Chrome password CSV does not contain passkeys. Export files may contain plain text passwords: handle them carefully.',
        ],
        [
          '2. Select a source and preview',
          'Unlock the destination .db and choose Import passwords in the app toolbar, preferences or extension. Select Chrome CSV, Bitwarden CSV or Bitwarden JSON, choose the file and preview. The limit is 20 MB and 10,000 entries per file. Preview shows new, duplicate and unsupported counts and the first ten names and accounts, without displaying passwords.',
        ],
        [
          '3. Check mapping and supported data',
          'Names map to titles, usernames to accounts, URLs to website fields and folders to labels. Passwords, notes and favorites are retained. Login entries and secure notes are supported. JSON retains multiple URLs and custom text, boolean and hidden fields. CSV custom fields are kept together as a private field. Unsupported authenticator secrets are retained as private fields. Unsupported item types are counted and skipped; attachments, passkeys and linked fields show warnings. Bitwarden URI match rules and reprompt policies are not migrated; extension matching always uses exact HTTPS origins.',
        ],
        [
          '4. Confirm and save',
          'Identical entries are skipped. Entries with different passwords or contents are kept separately, without overwriting. Only confirmation changes the vault; cancellation or locking clears the preview. Save the database afterwards, selecting a separate encrypted backup directory before the first overwrite. If the browser only downloads files, verify the download and reopen the encrypted .db before carefully removing plain text exports.',
        ],
      ],
    },
  },
  {
    slug: 'browser-extension',
    zh: {
      title: '扩展教程：填充、搜索、OTP 与新建条目',
      description:
        '了解 ClearVault Chrome / Edge 扩展的分步登录、搜索复制、TOTP 验证码、新建条目、多网址匹配、密码更新确认、加密保存和文件冲突处理。',
      intro:
        '扩展在侧栏本地解锁 .db，并在你明确点击后操作当前网站。解锁后可搜索所有条目、复制账号或密码、为当前网站新建条目，并复制或填入 TOTP 验证码。网页和扩展可以分别打开同一文件，使用前请核对保存状态。侧栏顶部可切换简体中文、English、Deutsch、日本語和 Español；语言选择与网页分别保存在本地，密码库内容保持原样。',
      sections: [
        [
          '1. 安装和打开',
          '从下载页取得扩展 ZIP 并解压，在 Chrome / Edge 扩展管理页开启开发者模式并加载解压目录。更新扩展后点击重新加载扩展。打开目标 HTTPS 网站，点击工具栏扩展图标授权，选择 .db 或最近密码库，再输入主密码。最近记录最多 5 个，可移除或清空；它不保存密码和库内容。',
        ],
        [
          '2. 填充和分步登录',
          '核对当前网站和账号，点击“填充此账号”，然后自行提交。先用户名后密码的网站，第一步仅填唯一的用户名或邮箱框；在网站继续到密码页后再点击填充。若跳转到其他来源，先点击扩展图标授权。解锁后还可以搜索所有条目并复制账号或密码；点击“新建条目”会预填当前 HTTPS 来源，保存数据库后才写入文件。条目含 TOTP 时列表直接显示验证码：点击“复制”复制，点击“填入验证码”只填唯一、明确的验证码输入框。多个密码框、未明确点击的验证码框、新密码表单或不明确的输入框会拒绝填充。',
        ],
        [
          '3. 为同一账号添加网址',
          '在新网站点击扩展图标，解锁后点击“添加网站地址”，核对展示的完整 HTTPS 来源并选择条目，确认后保存。也可在网页编辑器点击“添加网站地址”。每个网址单独精确匹配主机和端口，不自动扩展到其他子域。勾选“查看所有条目”或搜索可查看非当前网站条目；复制始终可用，但不能向不匹配网站填充。',
        ],
        [
          '4. 更新密码并确认',
          '在网站修改密码时，选择扩展内对应条目的“更新密码”。可手动输入新密码两次，或明确点击“从当前网页读取新密码”，读取当前匹配网站标记为 new-password 的可见密码框；无法唯一识别时手动输入。读取只填入确认表单，确认后才修改条目。先确认网站修改成功，再保存数据库。扩展不监听全站输入，也不自动提交或自动采集密码。',
        ],
        [
          '5. 保存、外部变化与锁定',
          '点击“保存数据库”；首次覆盖前选择独立加密备份目录，写回前检查文件指纹并备份，写入后读回验证。扩展填充前检查已关联原文件，外部变化会停止填充：先将当前编辑另存副本，再重新加载文件并输入主密码。通过普通文件选择或不支持文件句柄时，需自行重新选择文件；下载只代表已发起导出。侧栏隐藏不会立即锁定；空闲达到所选的 1 / 5 / 15 / 30 分钟后锁定。复制账号、密码或验证码后默认 30 秒尝试清空剪贴板，可在“更多操作”中改为 15 / 60 秒或关闭。未保存修改加密暂存在当前侧栏内存；关闭、刷新或重载扩展仍会丢失，请先保存。',
        ],
      ],
    },
    en: {
      title: 'Extension guide: fill, search, OTP and new entries',
      description:
        'Use the ClearVault Chrome / Edge extension for multistep logins, search and copy, TOTP codes, new entries, multiple URLs, confirmed password updates and verified encrypted saves.',
      intro:
        'The sidebar decrypts .db files locally and acts on the website after your explicit click. After unlocking, search all entries, copy usernames or passwords, create an entry for the current website, and copy or fill TOTP codes. The app and extension open files separately: check save status before switching. Choose Chinese, English, German, Japanese or Spanish at the top of the sidebar. Language preferences are remembered locally, separately from the app, without translating vault contents.',
      sections: [
        [
          '1. Install and open',
          'Download and unpack the extension ZIP. Enable developer mode in Chrome / Edge extensions and load the unpacked directory. Reload the extension after updating it. On the target HTTPS website, click its toolbar icon to grant access, choose a .db file or recent vault and enter your master password. Up to five recent records can be removed or cleared; they contain no passwords or vault contents.',
        ],
        [
          '2. Fill and multistep login',
          'Check the website and account, click Fill this login and submit yourself. On username-first sites, only a unique username or email input is filled. Continue on the website, then click Fill again on the password page. If redirected to another origin, click the extension icon to grant access there. After unlocking you can also search all entries and copy a username or password; New entry prefills the current HTTPS origin, and the entry is written only after Save database. Entries with TOTP show the current code: Copy copies it, and Fill code fills only a unique, explicit verification-code input. Ambiguous inputs, OTP inputs you did not explicitly click, multiple password fields and new-password forms are rejected.',
        ],
        [
          '3. Add another website',
          'Grant access on the new website, unlock and choose Add website address. Check the full HTTPS origin, select an entry, confirm and save. The app editor also has an Add website address button. Each host and port is matched exactly; subdomains are not automatically included. Show all entries or search lets you view nonmatching entries; copying remains available, but filling stays disabled for nonmatching websites.',
        ],
        [
          '4. Confirm a password update',
          'When changing a password on a website, choose Update password for its entry. Enter it twice or explicitly click Read new password from this website to read visible new-password fields on the currently matching website. If identification is ambiguous, enter it manually. Reading populates only the confirmation form; the entry changes after confirmation. Verify the website accepted the change before saving the vault. The extension does not monitor inputs across websites or submit forms automatically.',
        ],
        [
          '5. Save, reload and lock',
          'Choose Save database and select a separate encrypted backup directory before the first overwrite. The extension checks file fingerprints, backs up existing ciphertext and verifies writes. Before filling an associated file is checked for external changes; a change stops filling. Save your edits as a copy, reload and enter the master password. Ordinary file input or missing handle support requires selecting the file again. Downloads only confirm export was started. Hiding the sidebar does not lock immediately; the selected 1 / 5 / 15 / 30 minute idle timeout applies. After copying a username, password or code, ClearVault tries to clear the clipboard after 30 seconds by default; choose 15 / 60 seconds or off in More actions. Unsaved edits remain encrypted in current sidebar memory. Closing, refreshing or reloading the extension loses them, so save first.',
        ],
      ],
    },
  },
);

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
        'localStorage 仅保存界面语言、自动锁定分钟数和剪贴板清除时间等非敏感偏好；IndexedDB 仅保存最近 5 个密码库的文件名、文件句柄、记录 ID、打开时间和可选目录文字标记，不保存密码、条目或库内容，可随时移除或清空。网页与扩展存储相互独立，受浏览器授权和存储清理影响。Service Worker 只缓存应用资源；备份目录和保留设置仅在当前会话有效。关闭页面不等于已保存。',
      ],
      [
        '剪贴板清除是尽力而为',
        '复制账号、密码或验证码会把明文写入系统剪贴板。应用默认在 30 秒后尝试写入空字符串，可在设置中改为 15 / 60 秒或关闭。窗口失焦、浏览器限制或页面关闭时清除可能失败；清除前其他本地应用仍可读取。共用设备应手动清空剪贴板或立即锁定。',
      ],
      [
        '主密码无法找回',
        '主密码不写入任何持久存储，ClearVault 不提供找回。创建新库或从演示库保存时会显示本地强度估算并要求确认无法找回；更改主密码需验证当前主密码。偏好设置或扩展“更多操作”可下载恢复工具包，其中只有填写空白和恢复步骤，不含密码、TOTP 密钥或密码库内容。强度估算是启发式提示，不是安全保证。',
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
        '扩展使用 activeTab、scripting、sidePanel，无全站主机权限或持久内容脚本。用户明确点击后才向精确匹配的 HTTPS 来源填充所选账号或 TOTP 验证码，不自动提交。搜索、复制和新建条目在解锁后的侧栏内本地处理；复制会写入系统剪贴板。目标网站能够读取填入它的密码或验证码；这属于填充的固有边界。',
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
        'localStorage stores only non-sensitive preferences such as the interface language, auto-lock minutes and clipboard-clear delay. IndexedDB stores up to five recent vault names, file handles, record IDs, opening times and optional confirmed folder labels, never passwords, entries or vault contents. Remove or clear history anytime. The app and extension have separate storage, subject to browser permissions and storage clearing. The Service Worker caches app resources only; backup directory access and retention settings last for the current session. Closing a page does not save changes.',
      ],
      [
        'Clipboard clearing is best effort',
        'Copying a username, password or code writes plaintext to the system clipboard. ClearVault tries to write an empty value after 30 seconds by default; choose 15 / 60 seconds or off in settings. Clearing can fail when the window loses focus, the browser restricts access or the page closes; other local applications can read the clipboard before it is cleared. On shared devices, clear it manually or lock immediately.',
      ],
      [
        'The master password cannot be recovered',
        "The master password is not written to persistent storage and ClearVault cannot recover it. Creating a new vault or saving the demo as a real vault shows a local strength estimate and requires acknowledging this; changing the master password requires the current one. Preferences or the extension's More actions can download a recovery kit containing blank lines and recovery steps, never passwords, TOTP secrets or vault contents. The strength estimate is a heuristic, not a security guarantee.",
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
        'The extension uses activeTab, scripting and sidePanel, with no global host permissions or persistent content scripts. After an explicit user action it fills only the selected credentials or TOTP code into an exact matching HTTPS origin, without submitting. Search, copy and new entries are handled locally in the unlocked sidebar; copying writes the selected value to the system clipboard. The destination website can read a password or code filled into it; that is an inherent boundary of filling.',
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
