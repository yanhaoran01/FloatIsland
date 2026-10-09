"""@file bundle-float-source.py @description Package the deliverable source without user data or build caches. @author 鸡哥
FloatIsland / FusionIsland contributors, GPL-3.0.
"""
from pathlib import Path
import hashlib
import json
import sys
import zipfile

app = Path(__file__).resolve().parent.parent
destination = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else app.parent / 'artifacts' / 'FloatIsland-1.3.0' / 'FloatIsland-1.3.0-source.zip'
roots = {'src', 'i18n', 'resources', 'assets', 'docs', 'plugins', 'native', 'sdk', 'test', 'vendor', 'web', '.github', 'scripts'}
skip_dirs = {'node_modules', 'out', 'dist', 'bin', 'obj', '.git', '.vs', '.fusion-build', '.graphflow-cache', 'graphflow-out', 'coverage', '__pycache__', 'logs', 'userData'}
skip_suffixes = {'.tsbuildinfo', '.log', '.bak', '.tmp', '.pfx', '.p12', '.pem', '.key'}
files = []
for root in sorted(app.iterdir()):
    if root.is_dir() and root.name not in roots:
        continue
    candidates = root.rglob('*') if root.is_dir() else [root]
    for file in candidates:
        if not file.is_file() or file.is_symlink():
            continue
        relative = file.relative_to(app)
        if any(part in skip_dirs for part in relative.parts) or file.suffix.lower() in skip_suffixes or file.name.startswith('.env'):
            continue
        files.append((relative, file))
destination.parent.mkdir(parents=True, exist_ok=True)
manifest = []
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for relative, file in sorted(files):
        payload = file.read_bytes()
        entry = 'FloatIsland-1.3.0/' + relative.as_posix()
        archive.writestr(entry, payload)
        manifest.append({'file': relative.as_posix(), 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})
    archive.writestr('FloatIsland-1.3.0/SOURCE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(destination) as archive:
    failure = archive.testzip()
    if failure:
        raise RuntimeError('ZIP verification failed: ' + failure)
print(json.dumps({'archive': str(destination), 'files': len(manifest), 'bytes': destination.stat().st_size}, ensure_ascii=False))
