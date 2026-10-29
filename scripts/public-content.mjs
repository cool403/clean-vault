// Public documentation only. Never include vault records or real credentials here.
export const articles = [
  {
    slug: 'open-safeincloud-db',
    zh: {
      title: '如何打开、编辑和保存 SafeInCloud DB 文件',
      description:
        '使用 ClearVault 在浏览器本地打开 SafeInCloud .db 密码库，了解主密码、文件保存、备份与恢复步骤。',
      intro:
        '已有 SafeInCloud 密码库？带上 .db 文件和主密码，就可以在浏览器中管理条目。文件在设备本地解密，无需注册账户。网页顶部和偏好设置支持简体中文、English、Deutsch、日本語和 Español；首次按浏览器偏好匹配，手动选择会本地记住，不翻译密码库内容。可用 /?lang=de、/?lang=ja、/?lang=es 指定启动语言，离线也能切换。公开教程继续提供中英文。',
      sections: [
        [
          '开始前，留一份独立备份',
          '复制原始 .db 文件，保存在另一个位置。先用副本验证兼容性；不要同时在 ClearVault 和其他应用中编辑同一个文件。ClearVault 是独立的兼容工具，并非 SafeInCloud 官方产品。',
        ],
        [
          '1. 选择密码库并解锁',
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
          '先保存，再锁定并重新打开密码库检查修改。首页“最近密码库”保留上次打开的一个文件的名称和访问权限，点击后重新授权并输入主密码。文件移动、权限失效或浏览器不支持访问权限时，重新选择文件。可移除单条或清空记录；网页和扩展记录相互独立。刷新、关闭页面会丢失未保存内容，最近记录不是备份。当前页面已选择的文件和锁定后的密码库统一显示在列表中，不再另设重新解锁入口；有未保存更改时，点击“解锁并继续未保存的修改”恢复当前加密副本。清空历史不会丢弃当前会话。',
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
          '1. Select and unlock the vault',
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
          'Save, lock and reopen the vault to verify changes. Recent vaults on the home screen remembers only the last opened file name and file access. Select one, grant access again if needed and enter your master password. If the file moved or file access is unsupported, select it again. Remove individual records or clear history anytime. The app and extension have separate histories. Closing or refreshing loses unsaved edits; recent history is not a backup. Selected files and locked vaults use this same list without a separate reopen link. Choose Unlock and continue unsaved changes to resume the current encrypted copy. Clearing history keeps this current session.',
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
      title: '在 Linux 上使用 SafeInCloud 密码库',
      description:
        '用 ClearVault PWA 在 Linux 浏览器中管理 SafeInCloud DB，了解离线使用、浏览器扩展与保存兼容性。',
      intro:
        'ClearVault 提供浏览器中的本地密码库工作流。你可以在 Linux 上打开兼容密码库，也可以在支持安装的浏览器中将它作为 PWA 使用。',
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
          '支持 PWA 安装的浏览器会提供安装入口。先联网打开应用，让 Service Worker 完成应用资源缓存，再断网验证可以启动。首次访问、资源尚未缓存、缓存被清除或浏览器回收存储时仍需联网。密码库不会因为安装 PWA 而自动保存。',
        ],
        [
          '可选：浏览器扩展',
          'Chrome 扩展已上架 Chrome 应用商店，下载页提供商店入口与 Chrome / Edge 扩展备用压缩包。解压加载后，在目标网站点击扩展授权，再打开最近密码库或选择文件并解锁。支持分步登录、为同一条目添加多个精确 HTTPS 地址、确认更新密码和导入。修改后点击保存密码库，覆盖前自动备份并验证。文件外部变化时先另存编辑结果，再重新加载并解锁。不支持 Firefox、iframe 或 Passkey，不自动提交表单。',
        ],
        [
          '多设备使用时如何避免冲突',
          '每次只在一个应用或设备中编辑。保存并验证文件后，再使用你信任的方式传输加密文件。若出现外部文件变化提示，先另存编辑结果并核对版本，不要强行覆盖。',
        ],
      ],
    },
    en: {
      title: 'Use a SafeInCloud vault on Linux',
      description:
        'Manage SafeInCloud DB files with ClearVault on Linux. Understand browser file saving, offline PWA use and the optional browser extension.',
      intro:
        'ClearVault brings a local vault workflow to your browser. Open a compatible vault on Linux, or install the PWA where your browser supports it.',
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
          'Browsers supporting PWA installation provide an install action. Open the app online first so its Service Worker can cache the application resources, then test launching offline. A first visit, incomplete cache, cleared storage or storage eviction still requires a connection. Installing the PWA does not automatically save your vault.',
        ],
        [
          'Optional browser extension',
          'Install the Chrome extension from the Chrome Web Store link on the downloads page, or download and unpack the Chrome / Edge extension ZIP. Click its icon on the target website, reopen a recent vault or choose a file, then unlock. It supports multistep login, multiple explicitly added HTTPS origins, confirmed password updates and imports. Save changes with verified backups before overwriting. If the file changes externally, save your edits as a copy, then reload and unlock. Firefox, iframe and Passkey filling are unsupported. Forms are never submitted automatically.',
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
          '进入目标网站的安全设置，选择验证器应用。妥善保存网站提供的恢复码，避免丢失验证器后无法登录。不要将恢复码与未经备份的唯一密码库放在同一个失效点。',
        ],
        [
          '2. 把密钥加入对应条目',
          '在 ClearVault 新建或编辑条目，添加动态验证码字段，填入 Base32 密钥或 otpauth://totp/ 地址。也可以通过“导入二维码图片”选择图片；当前使用本地图片解析，不会开启摄像头。验证密钥和二维码都属于秘密。',
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
          'SHA1, SHA256 and SHA512, 6- or 8-digit codes and custom periods are supported. Match the website’s parameters, and use a 30-second period when sharing the vault with SafeInCloud. Confirm a generated code on the website, then save and reopen the .db file.',
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
      title: '从其他密码管理器导入密码',
      description:
        '在网页和浏览器扩展中本地导入 Chrome、Bitwarden、1Password、LastPass、Apple Passwords 或通用 CSV，预览重复条目并验证加密保存。',
      intro:
        '先打开或新建 ClearVault 密码库，再导入已有密码。网页与扩展共用相同的导入预览、字段映射和重复检测；通用 CSV 可以逐列指定含义。',
      sections: [
        [
          '1. 从原工具导出',
          'Chrome 从 Google 密码管理工具导出 CSV；Bitwarden 导出未加密 CSV 或 JSON；1Password 导出 CSV；LastPass 从账户设置导出 CSV；Apple Passwords 导出全部密码 CSV。通用 CSV 需要第一行为列名。导出文件可能包含明文密码，请妥善保管。',
        ],
        [
          '2. 选择来源并预览',
          '解锁目标 .db 后，在网页顶栏、偏好设置或扩展中点击“导入密码”，选择来源并选择文件。内置来源直接预览；通用 CSV 先映射名称、账号、密码、网址、备注、标签、验证码和收藏。文件最大 20 MB，一次最多 10000 个条目。预览展示新增、重复、不支持的数量及前 10 个条目的名称和账号，不展示密码。',
        ],
        [
          '3. 核对字段与保留范围',
          '名称对应条目名称，用户名对应账号，密码对应密码，网址对应网站，文件夹或标签对应标签，备注和收藏保留。1Password / Apple 的 OTPAuth 会导入为 TOTP；1Password 多个标签分别创建；LastPass 的 http://sn 安全笔记按备注导入。支持 Bitwarden 登录、安全笔记、多个网址和自定义字段。不支持的验证码密钥原样保留为私密字段。卡片、身份、附件、通行密钥、归档标记和原产品网址匹配规则不迁移。',
        ],
        [
          '4. 确认并保存',
          '完全相同的条目会跳过，密码或其他内容不同的条目分别保留，不覆盖已有条目。点击“确认导入”才修改当前密码库；取消或锁定会清除预览。导入后点击“保存密码库”，首次覆盖原文件时选择独立加密备份目录。浏览器只能下载时，请确认下载成功并重新打开加密 .db 核对，再妥善清理明文导出。',
        ],
      ],
    },
    en: {
      title: 'Import passwords from another password manager',
      description:
        'Import Chrome, Bitwarden, 1Password, LastPass, Apple Passwords or mapped generic CSV locally in the app or extension, preview duplicates and verify your encrypted save.',
      intro:
        'Open or create a ClearVault vault first. The app and extension share the import preview, field mapping and duplicate checks; generic CSV files can map each column explicitly.',
      sections: [
        [
          '1. Export from your previous tool',
          'Chrome exports CSV from Google Password Manager; Bitwarden exports unencrypted CSV or JSON; 1Password exports CSV; LastPass exports CSV from account settings; Apple Passwords exports all passwords as CSV. Generic CSV files need a header row. Export files may contain plain text passwords: handle them carefully.',
        ],
        [
          '2. Select a source and preview',
          'Unlock the destination .db and choose Import passwords in the app toolbar, preferences or extension. Select a source and file. Built-in sources preview directly; generic CSV first maps title, username, password, URL, notes, tags, TOTP and favorite columns. The limit is 20 MB and 10,000 entries per file. Preview shows new, duplicate and unsupported counts and the first ten names and accounts, without displaying passwords.',
        ],
        [
          '3. Check mapping and supported data',
          'Names map to titles, usernames to accounts, URLs to website fields, and folders or tags to labels. Passwords, notes and favorites are retained. 1Password and Apple OTPAuth values become TOTP codes; multiple 1Password tags become separate labels; LastPass http://sn secure notes import as notes. Bitwarden login entries, secure notes, multiple URLs and custom fields are supported. Unsupported authenticator secrets are retained as private fields. Cards, identities, attachments, passkeys, archived flags and source URL-matching rules are not migrated.',
        ],
        [
          '4. Confirm and save',
          'Identical entries are skipped. Entries with different passwords or contents are kept separately, without overwriting. Only confirmation changes the vault; cancellation or locking clears the preview. Save the vault afterwards, selecting a separate encrypted backup directory before the first overwrite. If the browser only downloads files, verify the download and reopen the encrypted .db before carefully removing plain text exports.',
        ],
      ],
    },
  },
  {
    slug: 'import-1password',
    zh: {
      title: '从 1Password 导入到 ClearVault',
      description:
        '从 1Password 导出 CSV，在浏览器本地预览并导入 ClearVault。保留账号、密码、网址、备注、标签、收藏和 TOTP。',
      intro:
        '1Password 导出的 CSV 是未加密的明文文件。ClearVault 只在本地读取它，确认预览并加密保存密码库后，请妥善删除源文件。',
      sections: [
        [
          '1. 在 1Password 中导出 CSV',
          '在 1Password 8 的账户菜单或设置中选择导出，格式选择 CSV，并完成账户身份验证。旧版本可能只提供 1PIF 或 1PUX；当前导入向导支持 CSV。',
        ],
        [
          '2. 在 ClearVault 中预览并导入',
          '打开或新建一个 .db 密码库并解锁，点击“导入密码”，来源选择 1Password CSV，选择导出文件并预览。确认新增、重复和不支持的数量后导入，再点击“保存密码库”。',
        ],
        [
          '3. 会保留哪些内容',
          '名称、用户名、密码、网址、备注、标签、收藏和 OTPAuth 验证码会导入；多个标签会分别创建。附件、通行密钥、归档标记和 1Password 的网址匹配规则不会迁移。',
        ],
        [
          '4. 核对并清理明文文件',
          '导入后重新打开 .db 核对条目，确认加密保存成功，再删除 1Password 导出的 CSV。不要把真实 CSV、主密码或 OTP 密钥上传到公开 issue、网站或聊天工具。',
        ],
      ],
    },
    en: {
      title: 'Import from 1Password into ClearVault',
      description:
        'Export a 1Password CSV, preview it locally in the browser and import it into ClearVault. Keep logins, notes, tags, favorites and TOTP codes.',
      intro:
        'A 1Password CSV export is unencrypted plaintext. ClearVault reads it locally; verify the preview, save the encrypted vault and then delete the source file.',
      sections: [
        [
          '1. Export a CSV from 1Password',
          'In 1Password 8, use the account menu or Settings to export, choose CSV and complete authentication. Older versions may offer only 1PIF or 1PUX; the current ClearVault wizard supports CSV.',
        ],
        [
          '2. Preview and import in ClearVault',
          'Open or create a .db vault and unlock it. Choose Import passwords, select 1Password CSV, pick the export and preview it. Review new, duplicate and unsupported counts, import, then choose Save vault.',
        ],
        [
          '3. What is preserved',
          'Titles, usernames, passwords, URLs, notes, tags, favorites and OTPAuth codes are imported. Multiple tags become separate labels. Attachments, passkeys, archived flags and 1Password URL-matching rules are not migrated.',
        ],
        [
          '4. Verify and remove the plaintext file',
          'Reopen the .db to verify entries, confirm the encrypted save succeeded and then delete the 1Password CSV. Never upload a real CSV, master password or OTP secret to a public issue, website or chat.',
        ],
      ],
    },
  },
  {
    slug: 'import-lastpass',
    zh: {
      title: '从 LastPass 导入到 ClearVault',
      description:
        '导出 LastPass CSV，在本地预览并导入 ClearVault。保留登录、备注、文件夹和收藏，安全笔记按备注导入。',
      intro:
        'LastPass 导出的 CSV 是未加密文件。导入过程不会上传它；完成加密保存和核对后请删除源文件。',
      sections: [
        [
          '1. 从 LastPass 导出',
          '打开 LastPass 账户设置中的高级选项，选择导出，输入主密码并确认导出 CSV。文件包含网址、用户名、密码、备注、名称、文件夹和收藏标记。',
        ],
        [
          '2. 在 ClearVault 中导入',
          '打开 .db 并解锁，选择“导入密码” → LastPass CSV，选择文件并预览。核对新增、重复和不支持的数量，确认后保存密码库。',
        ],
        [
          '3. 安全笔记和文件夹',
          'LastPass 用 http://sn 表示安全笔记；ClearVault 会把备注导入为条目备注，而不会创建虚假网站。文件夹会导入为标签，收藏标记保留。LastPass 附件、通行密钥和网址匹配规则不会迁移。',
        ],
        [
          '4. 核对与清理',
          '重新打开 .db 检查登录和安全笔记，确认加密保存成功后再删除 LastPass CSV。不要把真实导出文件或主密码发送给他人。',
        ],
      ],
    },
    en: {
      title: 'Import from LastPass into ClearVault',
      description:
        'Export a LastPass CSV, preview it locally and import it into ClearVault. Keep logins, notes, folders and favorites; secure notes import as notes.',
      intro:
        'A LastPass CSV export is unencrypted. The import does not upload it; delete the source after verifying the encrypted save.',
      sections: [
        [
          '1. Export from LastPass',
          'Open LastPass account settings, choose Advanced Options and Export, enter the master password and confirm the CSV download. The file contains URLs, usernames, passwords, notes, names, folders and favorite flags.',
        ],
        [
          '2. Import in ClearVault',
          'Open and unlock a .db vault, choose Import passwords → LastPass CSV, select the file and preview. Review new, duplicate and unsupported counts, confirm and save the vault.',
        ],
        [
          '3. Secure notes and folders',
          'LastPass uses http://sn for secure notes; ClearVault imports the note text without creating a fake website. Folders become labels and favorites are retained. LastPass attachments, passkeys and URL-matching rules are not migrated.',
        ],
        [
          '4. Verify and clean up',
          'Reopen the .db to check logins and secure notes, then delete the LastPass CSV after the encrypted save is verified. Never send a real export or master password to anyone.',
        ],
      ],
    },
  },
  {
    slug: 'import-apple-passwords',
    zh: {
      title: '从 Apple Passwords 导入到 ClearVault',
      description:
        '从 Apple Passwords 导出 CSV，在本地导入 ClearVault。保留登录、备注和 OTPAuth 验证码，不上传导出文件。',
      intro:
        'Apple Passwords 的 CSV 导出是明文文件。ClearVault 在浏览器本地读取并预览，导入后请验证加密保存并删除源文件。',
      sections: [
        [
          '1. 从 Apple Passwords 导出',
          '在 macOS 15 / iOS 18 或更新版本的 Passwords App 中选择导出全部密码，完成系统身份验证并保存 CSV。不同系统版本的菜单名称可能略有差异。',
        ],
        [
          '2. 在 ClearVault 中导入',
          '打开 .db 并解锁，选择“导入密码” → Apple Passwords CSV，选择文件并预览。核对数量后确认导入，再保存密码库。',
        ],
        [
          '3. 字段和验证码',
          '标题、网址、用户名、密码、备注和 OTPAuth 会导入；OTPAuth 会生成 TOTP 验证码。附件、通行密钥和 Apple 的账户/设备绑定信息不会迁移。',
        ],
        [
          '4. 删除明文导出',
          '重新打开密码库核对结果，确认“已验证保存”后再删除 CSV。不要把真实导出、主密码或验证密钥上传到公开位置。',
        ],
      ],
    },
    en: {
      title: 'Import from Apple Passwords into ClearVault',
      description:
        'Export a CSV from Apple Passwords and import it locally into ClearVault. Keep logins, notes and OTPAuth codes without uploading the export.',
      intro:
        'Apple Passwords CSV exports are plaintext. ClearVault reads and previews them locally; verify the encrypted save and delete the source afterwards.',
      sections: [
        [
          '1. Export from Apple Passwords',
          'In the Passwords app on macOS 15 / iOS 18 or later, choose Export All Passwords, complete system authentication and save the CSV. Menu names can differ slightly by OS version.',
        ],
        [
          '2. Import in ClearVault',
          'Open and unlock a .db vault, choose Import passwords → Apple Passwords CSV, select the file and preview. Confirm the counts, import and save the vault.',
        ],
        [
          '3. Fields and codes',
          'Titles, URLs, usernames, passwords, notes and OTPAuth values are imported; OTPAuth creates TOTP codes. Attachments, passkeys and Apple account or device binding details are not migrated.',
        ],
        [
          '4. Delete the plaintext export',
          'Reopen the vault, verify the result and confirm the verified save, then delete the CSV. Never upload a real export, master password or OTP secret to a public location.',
        ],
      ],
    },
  },
  {
    slug: 'import-generic-csv',
    zh: {
      title: '导入任意 CSV 到 ClearVault',
      description:
        '用字段映射把任意带表头的 CSV 导入 ClearVault，映射名称、账号、密码、网址、备注、标签、验证码和收藏。',
      intro:
        '如果其他密码管理器或自建表格导出的是普通 CSV，可以选择“通用 CSV（手动映射）”，逐列指定含义后预览导入。文件不会上传。',
      sections: [
        [
          '1. 准备 CSV',
          '确保第一行是列名，后续每行是一个条目。列名不需要固定；导入时会让你选择每一列对应什么字段。',
        ],
        [
          '2. 选择文件并映射',
          '在 ClearVault 中打开 .db，选择“导入密码” → 通用 CSV（手动映射），选择文件。为条目名称、账号、密码、网站、备注、标签、动态验证码和收藏选择对应列；未使用的列会忽略。',
        ],
        [
          '3. 预览和重复检测',
          '预览会显示新增、重复和不支持的数量，以及前 10 个名称和账号，不显示密码。完全相同的条目会跳过，内容不同的条目会分别保留。',
        ],
        [
          '4. 保存与清理',
          '确认导入后点击“保存密码库”，重新打开 .db 核对结果。CSV 是明文文件，验证加密保存后请删除。',
        ],
      ],
    },
    en: {
      title: 'Import any CSV into ClearVault',
      description:
        'Map columns from any CSV with headers into ClearVault: title, account, password, URL, notes, tags, codes and favorites.',
      intro:
        'If another password manager or spreadsheet exports a plain CSV, choose Generic CSV (manual mapping), assign each column and preview the import. The file is never uploaded.',
      sections: [
        [
          '1. Prepare the CSV',
          'The first row must contain column names; each following row is an entry. Column names are flexible because you map them during import.',
        ],
        [
          '2. Select and map the file',
          'Open a .db in ClearVault, choose Import passwords → Generic CSV (manual mapping) and select the file. Map title, username, password, URL, notes, tags, TOTP and favorite columns; unused columns are ignored.',
        ],
        [
          '3. Preview and duplicates',
          'Preview shows new, duplicate and unsupported counts plus the first ten names and accounts, never passwords. Identical entries are skipped; differing entries are kept separately.',
        ],
        [
          '4. Save and clean up',
          'Confirm the import, choose Save vault and reopen the .db to verify. The CSV is plaintext; delete it after the encrypted save is verified.',
        ],
      ],
    },
  },
  {
    slug: 'sync-folder',
    zh: {
      title: '用自己的同步文件夹同步密码库',
      description:
        '把 ClearVault 的加密 .db 放进 Syncthing、Nextcloud、OneDrive 或 iCloud Drive，检测外部修改并在本地合并冲突。',
      intro:
        'ClearVault 不运营云同步服务。密码库始终是一个加密文件；你可以用自己信任的同步工具把它带到其他设备，并在出现外部修改时先合并、再保存。',
      sections: [
        [
          '1. 把 .db 放进同步文件夹',
          '选择 Syncthing、Nextcloud、OneDrive、iCloud Drive 或其他你信任的文件夹同步工具。先保留一份独立加密备份，再在网页端打开同步文件夹中的 .db 并解锁。',
        ],
        [
          '2. 另一台设备修改后',
          '回到 ClearVault 页面或尝试保存时，应用会检查原文件指纹并提示外部变化。点击“合并更改”会在本地读取外部文件，使用当前会话的主密码解密，并预览本地未保存编辑与外部版本的合并结果。',
        ],
        [
          '3. 合并规则',
          '双方修改不同条目时都保留；同一条目双方都修改时，冲突预览会列出标题、备注、回收站 / 归档 / 收藏状态和每个字段，按较新的修改时间预选本地或外部值，可逐项更改。一侧删除、另一侧修改时可选择保留或删除。标签按名称合并；未知 XML、附件和图片随选中的条目版本保留。确认预览后仍需点击“保存密码库”才写入文件。',
        ],
        [
          '4. 边界',
          '外部文件必须使用相同格式版本和主密码；密码不同或版本不同时无法合并。没有跨设备文件锁；字段级选择覆盖标题、备注、标记和普通字段，未知的密码库级 XML 只保留本地版本；同步工具仍可能回滚或替换文件。请保留独立备份，避免两台设备同时编辑。',
        ],
      ],
    },
    en: {
      title: 'Sync a vault with your own folder',
      description:
        'Keep the encrypted ClearVault .db in Syncthing, Nextcloud, OneDrive or iCloud Drive, detect external changes and merge conflicts locally.',
      intro:
        'ClearVault does not run a cloud sync service. Your vault remains an encrypted file; use a sync tool you trust to move it between devices, then merge external changes before saving.',
      sections: [
        [
          '1. Put the .db in a synced folder',
          'Choose Syncthing, Nextcloud, OneDrive, iCloud Drive or another folder-sync tool you trust. Keep an independent encrypted backup first, then open and unlock the .db from that folder in the web app.',
        ],
        [
          '2. After another device changes it',
          'When you return to the page or try to save, ClearVault checks the original file fingerprint and reports external changes. Choose Merge changes to read and decrypt the external file locally with the current session master password, then preview the merge of unsaved local edits and the external version.',
        ],
        [
          '3. Merge rules',
          'Changes to different entries are both kept. When both sides change the same entry, the preview lists the title, notes, trash / archive / favorite flags and every field, preselects local or external values by the newer modification time, and lets you change each one. If one side deleted the entry and the other changed it, choose whether to keep or delete it. Labels merge by name; unknown XML, attachments and images travel with the chosen entry version. Confirming the preview still requires Save vault to write the file.',
        ],
        [
          '4. Boundaries',
          'The external file must use the same format version and master password; different passwords or versions cannot merge. There is no cross-device file lock; field-level choices cover the title, notes, flags and regular fields, and unknown vault-level XML is kept from the local side only. Sync tools can still roll back or replace files. Keep independent backups and avoid editing on two devices at once.',
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
          '从下载页取得扩展 ZIP 并解压，在 Chrome / Edge 扩展管理页开启开发者模式并加载解压目录。更新扩展后点击重新加载扩展。打开目标 HTTPS 网站，点击工具栏扩展图标授权，选择 .db 或最近密码库，再输入主密码。最近记录只保留上次打开的一个，可移除或清空；它不保存密码和库内容。',
        ],
        [
          '2. 填充和分步登录',
          '核对当前网站和账号，点击“填充此账号”，然后自行提交。先用户名后密码的网站，第一步仅填唯一的用户名或邮箱框；在网站继续到密码页后再点击填充。若跳转到其他来源，先点击扩展图标授权。解锁后还可以搜索所有条目并复制账号或密码；点击“新建条目”会预填当前 HTTPS 来源，保存密码库后才写入文件。条目含 TOTP 时列表直接显示验证码：点击“复制”复制，点击“填入验证码”只填唯一、明确的验证码输入框。多个密码框、未明确点击的验证码框、新密码表单或不明确的输入框会拒绝填充。',
        ],
        [
          '3. 为同一账号添加网址',
          '在新网站点击扩展图标，解锁后点击“添加网站地址”，核对展示的完整 HTTPS 来源并选择条目，确认后保存。也可在网页编辑器点击“添加网站地址”。每个网址单独精确匹配主机和端口，不自动扩展到其他子域。勾选“查看所有条目”或搜索可查看非当前网站条目；复制始终可用，但不能向不匹配网站填充。',
        ],
        [
          '4. 更新密码并确认',
          '在网站修改密码时，选择扩展内对应条目的“更新密码”。可手动输入新密码两次，或明确点击“从当前网页读取新密码”，读取当前匹配网站标记为 new-password 的可见密码框；无法唯一识别时手动输入。读取只填入确认表单，确认后才修改条目。先确认网站修改成功，再保存密码库。扩展不监听全站输入，也不自动提交或自动采集密码。',
        ],
        [
          '5. 保存、外部变化与锁定',
          '点击“保存密码库”；首次覆盖前选择独立加密备份目录，写回前检查文件指纹并备份，写入后读回验证。扩展填充前检查已关联原文件，外部变化会停止填充：先将当前编辑另存副本，再重新加载文件并输入主密码。通过普通文件选择或不支持文件访问权限时，需自行重新选择文件；下载只代表已发起导出。侧栏隐藏不会立即锁定；空闲达到所选的 1 / 5 / 15 / 30 分钟后锁定。复制账号、密码或验证码后默认 30 秒尝试清空剪贴板，可在“更多操作”中改为 15 / 60 秒或关闭。未保存修改加密暂存在当前侧栏内存；关闭、刷新或重载扩展仍会丢失，请先保存。',
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
          'Download and unpack the extension ZIP. Enable developer mode in Chrome / Edge extensions and load the unpacked directory. Reload the extension after updating it. On the target HTTPS website, click its toolbar icon to grant access, choose a .db file or recent vault and enter your master password. The last opened vault record can be removed or cleared; it contains no passwords or vault contents.',
        ],
        [
          '2. Fill and multistep login',
          'Check the website and account, click Fill this login and submit yourself. On username-first sites, only a unique username or email input is filled. Continue on the website, then click Fill again on the password page. If redirected to another origin, click the extension icon to grant access there. After unlocking you can also search all entries and copy a username or password; New entry prefills the current HTTPS origin, and the entry is written only after Save vault. Entries with TOTP show the current code: Copy copies it, and Fill code fills only a unique, explicit verification-code input. Ambiguous inputs, OTP inputs you did not explicitly click, multiple password fields and new-password forms are rejected.',
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
          'Choose Save vault and select a separate encrypted backup directory before the first overwrite. The extension checks file fingerprints, backs up existing ciphertext and verifies writes. Before filling an associated file is checked for external changes; a change stops filling. Save your edits as a copy, reload and enter the master password. Ordinary file input or missing file access support requires selecting the file again. Downloads only confirm export was started. Hiding the sidebar does not lock immediately; the selected 1 / 5 / 15 / 30 minute idle timeout applies. After copying a username, password or code, ClearVault tries to clear the clipboard after 30 seconds by default; choose 15 / 60 seconds or off in More actions. Unsaved edits remain encrypted in current sidebar memory. Closing, refreshing or reloading the extension loses them, so save first.',
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
        '密码库文件、主密码、条目和 TOTP 密钥不会由应用上传到服务器。解锁期间，解密后的密码库保留在页面内存中以供编辑；锁定时移除界面与引用并清零可控字节数组。JavaScript 字符串与垃圾回收无法保证物理内存被彻底擦除。',
      ],
      [
        '访问网页仍有网络元数据',
        '加载托管站点会请求 HTML、脚本、样式和图标，托管服务可看到 IP 地址、时间与 HTTP 元数据。应用源码没有集成远程字体或跟踪像素。公开站点保留 Cloudflare Pages Web Analytics，托管平台会向 HTML 注入统计脚本，其加载与执行受站点 CSP 限制；自行托管的原始包不含此注入。Search Console 用于查看搜索表现，不在密码库中埋点。普通外链只有在你点击时才会打开。',
      ],
      [
        '浏览器保存什么',
        'localStorage 仅保存界面语言、自动锁定分钟数、剪贴板清除时间、快照保留数量、最近使用条目 ID/时间和新手清单完成状态等非敏感偏好与排序元数据；IndexedDB 仅保存上次打开的一个密码库的文件名、文件访问权限、记录 ID、打开时间，不保存密码、条目或库内容，可随时移除或清空。OPFS 本地快照只保存加密的 .db 密文。网页与扩展存储相互独立，受浏览器授权和存储清理影响。Service Worker 只缓存应用资源；备份目录和保留设置仅在当前会话有效。关闭页面不等于已保存。',
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
        '本地快照只保存密文',
        '网页和扩展每次保存后都会尝试把加密的 .db 密文写入浏览器 OPFS，默认保留 10 份，可配置。快照不含明文或密码，恢复时需要保存时的主密码；清除站点数据会删除，不能替代独立备份。外部文件变化时保存会停止并提示另存副本或重新加载；跨标签页广播用于协调，不是安全边界。',
      ],
      [
        '安全概览只在内存中计算',
        '弱密码、重复使用、密码年龄和 TOTP 覆盖都在解锁后的页面内存中根据解密条目计算，不写入存储或上传。批量标签、归档和回收站操作与普通编辑一样，只有保存后才写入加密 .db。',
      ],
      [
        '文件关联只在本地读取',
        'PWA 的 file_handlers、launchQueue 和页面拖放都只在用户选择或拖入 .db 后本地读取文件，不上传。安装、文件关联和权限由浏览器管理；外部应用仍可能同时读取源文件，不能替代独立备份。',
      ],
      [
        '同步文件夹只在本地合并',
        '把 .db 放进 Syncthing、Nextcloud、OneDrive 或 iCloud Drive 时，同步由你的工具完成。ClearVault 在检测到外部变化后本地读取并用当前会话内存中的凭据解密；只有格式版本和主密码一致时才合并，且确认预览后仍需保存才写入。冲突按条目时间戳选择，标签按名称合并；同步提供商仍可能回滚或替换文件，请保留独立备份。',
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
        'The application does not upload vault files, master passwords, entries or TOTP secrets. While unlocked, decrypted data stays in page memory for editing. Locking removes the UI and references and clears controllable byte arrays. JavaScript strings and garbage collection cannot guarantee physical memory erasure.',
      ],
      [
        'Visiting the site still creates network metadata',
        'Loading the hosted site requests HTML, scripts, styles and icons. The hosting provider can see IP addresses, request times and HTTP metadata. The application source includes no remote fonts or tracking pixels. The public site retains Cloudflare Pages Web Analytics, which injects an analytics script into hosted HTML; loading and execution are subject to the site CSP. Self-hosted packages do not contain this injection. Search Console reports search performance without tracking actions inside your vault. Ordinary external links open only when you click them.',
      ],
      [
        'What the browser stores',
        'localStorage stores only non-sensitive preferences and ordering metadata such as the interface language, auto-lock minutes, clipboard-clear delay, snapshot retention, recent entry IDs/times and getting-started checklist completion. IndexedDB stores only the last opened vault name, file handle, record ID and opening time, never passwords, entries or vault contents. OPFS local snapshots contain only encrypted .db ciphertext. Remove or clear history anytime. The app and extension have separate storage, subject to browser permissions and storage clearing. The Service Worker caches app resources only; backup directory access and retention settings last for the current session. Closing a page does not save changes.',
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
        'Local snapshots contain ciphertext only',
        'The app and extension try to write encrypted .db ciphertext to browser OPFS after each save, keeping 10 snapshots by default (configurable). Snapshots contain no plaintext or passwords and require the master password used at that time to restore. Clearing site data deletes them; they are not a substitute for independent backups. External file changes stop saving and offer a copy or reload; cross-tab broadcasts are coordination, not a security boundary.',
      ],
      [
        'Security overview is computed in memory only',
        'Weak passwords, reuse, password age and TOTP coverage are calculated in page memory from decrypted entries and are never stored or uploaded. Batch labels, archiving and trash changes behave like any edit and are written to the encrypted .db only after saving.',
      ],
      [
        'File association reads locally',
        'PWA file_handlers, launchQueue and page drag-and-drop only read a .db file locally after the user selects or drops it; nothing is uploaded. Installation, file association and permissions are managed by the browser. External applications can still read the source file concurrently, so this is not a substitute for independent backups.',
      ],
      [
        'Synced folders merge locally',
        'When the .db lives in Syncthing, Nextcloud, OneDrive or iCloud Drive, your tool performs the sync. On external changes ClearVault reads and decrypts locally with the current session credential; merging requires the same format version and master password, and the preview must still be saved to write. Conflicts resolve per entry by timestamp and labels merge by name. Sync providers can still roll back or replace files; keep independent backups.',
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

export const privacy = {
  zh: {
    title: '隐私政策',
    description: 'ClearVault 如何处理密码库、主密码、本地存储、网络请求和浏览器扩展权限。',
    intro:
      'ClearVault 是本地优先的密码库与 TOTP 工具。本页说明应用和浏览器扩展处理哪些数据、保存在哪里、何时会产生网络请求，以及你如何删除本地记录。它不是独立安全审计的替代品。',
    sections: [
      [
        '处理哪些数据',
        '你选择的 SafeInCloud 兼容 .db 文件；解锁时输入的主密码；文件中的条目、备注、附件和 TOTP 密钥；界面语言、自动锁定、剪贴板清除、快照保留数量和新手清单等本地偏好；最近密码库的文件名、文件访问权限、记录 ID、时间；用于排序的最近使用条目 ID 和时间；浏览器 OPFS 中的加密 .db 快照。',
      ],
      [
        '数据保存在哪里',
        '主密码、解密 XML 和 TOTP 密钥只在解锁期间保留在页面内存，不写入 localStorage、IndexedDB、OPFS 或扩展存储，也不上传。localStorage 只保存非敏感偏好；IndexedDB 只保存最近密码库元数据；OPFS 快照只包含加密 .db 密文；复制到系统剪贴板的内容按设定时间尝试清除，但其他本地应用在清除前仍可能读取。',
      ],
      [
        '网络与分析',
        '网页是静态 PWA，没有账号或服务器端密码库。公开托管的 Cloudflare Pages 站点保留平台 Web Analytics，平台可能向 HTML 注入统计脚本，但它不会收到密码库内容；自行托管包不包含这项注入。托管服务仍能看到访问 IP 和 HTTP 元数据。浏览器扩展的 CSP 设置 `connect-src none`，不发起网络请求，也不包含分析或远程代码。',
      ],
      [
        '扩展权限',
        '`activeTab` 只在你点击扩展图标后临时访问当前标签页；`scripting` 在明确点击后向精确匹配的 HTTPS 来源填入所选账号或验证码；`sidePanel` 提供解锁和选择条目的侧栏。扩展不申请全站主机权限、不持久运行内容脚本、不申请 `storage` 权限，也不自动提交表单。',
      ],
      [
        '共享、保留与删除',
        'ClearVault 不出售、出租或转让用户数据。密码库文件、导出的 CSV、恢复工具包和备份由你控制。可以移除单条或清空最近密码库记录、清除最近使用记录、清除本地加密快照，或清除站点数据。关闭页面会释放内存中的密码库；未保存修改不会写入文件。',
      ],
      [
        '联系与变更',
        '请通过仓库 issue 报告隐私或安全问题，不要上传真实密码库、主密码、TOTP 密钥或可直接利用的敏感材料。项目尚未完成独立安全审计。隐私相关变更会记录在仓库中；本页内容与扩展商店提交材料保持一致。',
      ],
    ],
  },
  en: {
    title: 'Privacy policy',
    description:
      'How ClearVault handles vault files, master passwords, local storage, network requests and browser extension permissions.',
    intro:
      'ClearVault is a local-first password vault and TOTP tool. This page explains what data the app and browser extension handle, where it is stored, when network requests occur, and how to delete local records. It is not a substitute for an independent security audit.',
    sections: [
      [
        'Data ClearVault handles',
        'The SafeInCloud-compatible .db file you select; the master password entered to unlock it; entries, notes, attachments and TOTP secrets inside the file; local preferences such as interface language, auto-lock, clipboard clearing, snapshot retention and getting-started checklist state; the last opened vault file name, handle, record ID and time; recent entry IDs and times used for ordering; and encrypted .db snapshots in browser OPFS.',
      ],
      [
        'Where data is stored',
        'The master password, decrypted XML and TOTP secrets stay in page memory while unlocked. They are not written to localStorage, IndexedDB, OPFS or extension storage and are not uploaded. localStorage stores only non-sensitive preferences; IndexedDB stores recent-vault metadata; OPFS snapshots contain only encrypted .db ciphertext; clipboard contents are cleared after the configured delay on a best-effort basis, and other local applications may read them before clearing.',
      ],
      [
        'Network and analytics',
        'The web app is a static PWA with no account or server-side vault. The public Cloudflare Pages deployment retains platform Web Analytics, which may inject a hosting script into HTML but does not receive vault contents; self-hosted packages do not contain this injection. The host can still see visit IP addresses and HTTP metadata. The browser extension CSP sets `connect-src none`; it makes no network requests and contains no analytics or remote code.',
      ],
      [
        'Extension permissions',
        '`activeTab` grants temporary access to the current tab only after you click the extension icon; `scripting` fills the selected login or code into an exact matching HTTPS origin after an explicit click; `sidePanel` provides the unlock and entry-selection UI. The extension requests no global host permissions, persistent content scripts or `storage` permission, and never submits forms automatically.',
      ],
      [
        'Sharing, retention and deletion',
        'ClearVault does not sell, rent or transfer user data. You control the vault file, exported CSV files, recovery kits and backups. You can remove or clear recent-vault records, clear recent usage, clear local encrypted snapshots or clear site data. Closing the page releases the in-memory vault; unsaved edits are not written to the file.',
      ],
      [
        'Contact and changes',
        'Report privacy or security issues through the repository issue tracker without uploading real vaults, master passwords, TOTP secrets or directly exploitable sensitive material. No independent security audit has been completed. Privacy-related changes are recorded in the repository; this page is kept consistent with the extension store submission materials.',
      ],
    ],
  },
};
