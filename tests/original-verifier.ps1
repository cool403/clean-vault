param(
    [ValidateSet('generate', 'verify')][string]$Mode = 'generate',
    [string]$FixtureDirectory = "$PSScriptRoot\fixtures",
    [string]$InputPrefix = 'python'
)
$ErrorActionPreference = 'Stop'
# Execute only the shipped cryptography/compression methods on synthetic data.
# Windows PowerShell x86 is required for this x86 .NET Framework assembly.
$install = 'C:\Program Files\WindowsApps\51041SafeInCloud.PasswordManagerSafeInCloud_26.0.0.0_x86__wh7zearnzvtm6\SafeInCloud'
Add-Type -AssemblyName System.Security
[void][Reflection.Assembly]::LoadFrom("$install\Zlib.Portable.dll")
[void][Reflection.Assembly]::LoadFrom("$install\SafeInCloud.exe")
[void][IO.Directory]::CreateDirectory($FixtureDirectory)
$xml = [Text.Encoding]::UTF8.GetBytes('<?xml version="1.0" encoding="utf-8"?><database><card id="1"><field name="test">synthetic only</field></card></database>')
$passwords = @('test-ASCII-123!', (-join ([char[]]@(0x4E2D,0x6587,0x0061,0x0062))), (-join ([char[]]@(0xD83D,0xDE00,0x0078))))
for ($i=0; $i -lt $passwords.Count; $i++) {
    $password = [SafeInCloud.Support.ProtectedString]::FromString($passwords[$i])
    if ($Mode -eq 'generate') {
        $output = [IO.File]::Create("$FixtureDirectory\original-v1-$i.db")
        $encrypted = [SafeInCloud.Database.DatabaseCipher]::GetEncryptStream($output, $password)
        try {
            $compressed = [Ionic.Zlib.ZlibStream]::CompressBuffer($xml)
            $encrypted.Write($compressed, 0, $compressed.Length)
        } finally { $encrypted.Dispose(); $output.Dispose() }
    } else {
        foreach ($version in @(1,2)) {
            $input = [IO.File]::OpenRead("$FixtureDirectory\$InputPrefix-v$version-$i.db")
            $decrypted = [SafeInCloud.Database.DatabaseCipher]::GetDecryptStream($input, $password)
            try {
                $buffer = New-Object IO.MemoryStream
                $decrypted.CopyTo($buffer)
                $actual = [Ionic.Zlib.ZlibStream]::UncompressBuffer($buffer.ToArray())
                if ([Convert]::ToBase64String($actual) -ne [Convert]::ToBase64String($xml)) { throw 'Plaintext mismatch' }
            } finally { $decrypted.Dispose(); $input.Dispose() }
        }
    }
}
Write-Output "$Mode passed for all 3 synthetic passwords"
