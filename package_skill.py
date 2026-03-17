import subprocess, sys, os

# Find python in PATH
py = sys.executable
skill_dir = r'C:\Users\60496\.workbuddy\skills\session-memory'
out_dir = r'C:\Users\60496\.workbuddy\skills'
packager = r'D:\WorkBuddy\resources\app\extensions\genie\out\extension\builtin\skill-creator\scripts\package_skill.py'

print(f"Python: {py}")
print(f"Skill dir: {skill_dir}")
print(f"Packager: {packager}")
print(f"Packager exists: {os.path.exists(packager)}")
print(f"Skill dir exists: {os.path.exists(skill_dir)}")

if not os.path.exists(packager):
    print("ERROR: packager not found")
    sys.exit(1)

result = subprocess.run(
    [py, packager, skill_dir, out_dir],
    capture_output=True, text=True, encoding='utf-8', errors='replace'
)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Exit:", result.returncode)
