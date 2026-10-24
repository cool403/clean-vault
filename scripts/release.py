"""Package readable source separately from reproducible, readable runtime artifacts."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
VERSION = json.loads((ROOT / 'package.json').read_text())['version']
OUT = ROOT / 'release'
if OUT.is_symlink() or OUT.resolve() != ROOT.resolve() / 'release':
    raise RuntimeError('Unsafe release output directory')
OUT.mkdir(exist_ok=True)
subprocess.run(['node', str(ROOT / 'scripts/build-public-pages.mjs')], check=True)
subprocess.run(['node', str(ROOT / 'scripts/build-extension.mjs')], check=True)


def files(directory):
    return sorted(p for p in (ROOT / directory).rglob('*') if p.is_file())


def digest(data):
    return hashlib.sha256(data).hexdigest()


web = [p for p in files('dist') if 'downloads' not in p.relative_to(ROOT/'dist').parts
       or p.name == 'index.html']
extension = files('extension')
source = sorted(set(web + extension + files('scripts') + files('docs') + files('tests') + files('.github') + [
    ROOT / p for p in ['README.md', 'SECURITY.md', 'LICENSE', 'NOTICE', 'CONTRIBUTING.md',
                      'README.en.md', 'package.json', 'package-lock.json', '.prettierrc.json', '.prettierignore',
                      '.gitattributes', '.editorconfig', 'server.mjs', 'Dockerfile', 'nginx.conf',
                      '.dockerignore', '.gitignore']
]))
fixtures = {'tests/fixtures/original-v1-0.db', 'tests/fixtures/original-v1-1.db',
            'tests/fixtures/original-v1-2.db'}
for p in source:
    relative = p.relative_to(ROOT).as_posix()
    if (p.suffix.lower() in {'.db', '.bak', '.pem', '.key'} and relative not in fixtures) \
            or p.name.startswith('.env'):
        raise RuntimeError('Disallowed release input: ' + relative)


def reset_stage(name):
    target = OUT / name
    # Verify build-owned absolute destinations before recursive removal.
    if target.is_symlink() or target.resolve().parent != OUT.resolve():
        raise RuntimeError('Unsafe release directory: ' + str(target))
    if target.exists():
        shutil.rmtree(target)
    target.mkdir()
    return target


web_stage = reset_stage('web')
extension_stage = reset_stage('extension')
for paths, base, target in [(web, ROOT/'dist', web_stage),
                            (extension, ROOT/'extension', extension_stage)]:
    for p in paths:
        output = target / p.relative_to(base)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, output)

# Deploy the same readable JavaScript users can inspect in GitHub.
for stage in [web_stage, extension_stage]:
    for name in ['LICENSE', 'NOTICE']:
        shutil.copyfile(ROOT / name, stage / name)



def archive(label, paths, base):
    target = OUT / f'clearvault-{VERSION}-{label}.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(paths):
            info = zipfile.ZipInfo(p.relative_to(base).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return target


extension_zip = archive('extension', files('release/extension'), extension_stage)
source_zip = archive('source', source, ROOT)
downloads = ROOT / 'dist/downloads'
downloads.mkdir(exist_ok=True)
published_downloads = web_stage / 'downloads'
published_downloads.mkdir(exist_ok=True)
for p in [extension_zip, source_zip]:
    shutil.copyfile(p, downloads/p.name)
    shutil.copyfile(p, published_downloads/p.name)
download_checksums = json.dumps({p.name: digest(p.read_bytes())
                                for p in [extension_zip, source_zip]}, indent=2) + '\n'
for directory in [downloads, published_downloads]:
    (directory/'SHA256SUMS.json').write_text(download_checksums)
# Hash the actual hosted files (the manifest excludes itself).
(web_stage / 'ASSET-SHA256SUMS.json').write_text(json.dumps({
    p.relative_to(web_stage).as_posix(): digest(p.read_bytes())
    for p in sorted(web_stage.rglob('*')) if p.is_file()
}, indent=2) + '\n', encoding='utf-8')
# Sites accepts a fixed set of static roots. Mirror the verified Web output
# into its supported out/ directory; dist/ remains readable development source.
site_output = ROOT / 'out'
if site_output.is_symlink() or site_output.resolve() != ROOT.resolve() / 'out':
    raise RuntimeError('Unsafe Site output directory')
if site_output.exists():
    shutil.rmtree(site_output)
shutil.copytree(web_stage, site_output)

web_zip = archive('web', files('release/web'), web_stage)
artifacts = [web_zip, extension_zip, source_zip]
(OUT/'SHA256SUMS.json').write_text(json.dumps({p.name: digest(p.read_bytes())
                                            for p in artifacts}, indent=2) + '\n')
(OUT/'SOURCE-FILES.json').write_text(json.dumps({p.relative_to(ROOT).as_posix():
                                               digest(p.read_bytes()) for p in source}, indent=2) + '\n')
print('\n'.join(str(p) for p in artifacts))
