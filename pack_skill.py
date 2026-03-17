import zipfile, os

skill_dir = r'C:\Users\60496\.codebuddy\skills\conversion-copywriter'
out = r'C:\Users\60496\WorkBuddy\20260315203305\conversion-copywriter.zip'

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(skill_dir):
        for f in files:
            full_path = os.path.join(root, f)
            arcname = os.path.join('conversion-copywriter', os.path.relpath(full_path, skill_dir))
            z.write(full_path, arcname)

print('Packaged:', out)
