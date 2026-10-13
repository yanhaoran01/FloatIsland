"""Package the committed FloatIsland repository without local build output."""
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[2]
destination = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "release" / "FloatIsland-1.3.0-source.zip"
status = subprocess.check_output(["git", "-C", str(root), "status", "--porcelain"], text=True)
if status.strip():
    raise RuntimeError("Commit the release source before creating its archive.")
destination.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["git", "-C", str(root), "archive", "--format=zip", "--prefix=FloatIsland-1.3.0/", "--output=" + str(destination), "HEAD"], check=True)
with zipfile.ZipFile(destination) as archive:
    invalid = archive.testzip()
    if invalid:
        raise RuntimeError("Invalid ZIP member: " + invalid)
print(destination)
