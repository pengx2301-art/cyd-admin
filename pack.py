import zipfile, os, sys
from pathlib import Path

skill_dir = Path(r'C:\Users\60496\.workbuddy\skills\session-memory')
out_zip = Path(r'C:\Users\60496\.workbuddy\skills\session-memory.zip')

with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for fpath in skill_dir.rglob('*'):
        if fpath.is_file():
            arcname = fpath.relative_to(skill_dir.parent)
            zf.write(fpath, arcname)
            print(f"  Added: {arcname}")

print(f"\nPackaged: {out_zip}")
print(f"Size: {out_zip.stat().st_size / 1024:.1f} KB")
