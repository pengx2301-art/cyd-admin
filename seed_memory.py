import subprocess, sys
from pathlib import Path

py = r'C:\Program Files\Python312\python.exe'
script = r'C:\Users\60496\.workbuddy\skills\session-memory\scripts\capture_session.py'

events = [
    ("session_start", {"goal": "Setup fresh Windows dev environment", "context": "Brand new Windows PC, no tools installed"}),
    ("install", {"tool": "Git", "version": "2.47.1.windows.2", "manager": "manual download via npmmirror"}),
    ("install", {"tool": "Node.js", "version": "v20.18.1 LTS", "manager": "manual download"}),
    ("install", {"tool": "Python", "version": "3.12.7", "manager": "manual download"}),
    ("install", {"tool": "VS Code", "version": "1.111.0", "manager": "manual download"}),
    ("approach_failed", {"approach": "winget install Git.Git", "reason_failed": "No admin rights, exit code 2316632158"}),
    ("approach_failed", {"approach": "winget --scope user for Git/Node", "reason_failed": "Installer requires system write, scope user not sufficient"}),
    ("approach_failed", {"approach": "Tsinghua mirror for Git", "reason_failed": "403 Forbidden"}),
    ("approach_failed", {"approach": "Aliyun mirror for Git", "reason_failed": "404 Not Found"}),
    ("problem_solved", {"problem": "Git download slow/blocked from official URL", "solution": "Used npmmirror (registry.npmmirror.com) to download Git-2.47.1.2-64-bit.exe, 65.9MB downloaded OK"}),
    ("problem_solved", {"problem": "PowerShell encoding error in scripts with Chinese comments", "solution": "Rewrote all scripts with English-only comments"}),
    ("config_change", {"file": "git global config", "change": "user.name=pengx2301-art, user.email=pengx2301@gmail.com, core.editor=code --wait, init.defaultBranch=main"}),
    ("config_change", {"file": "npm config", "change": "registry set to https://registry.npmmirror.com"}),
    ("config_change", {"file": "pip config", "change": "index-url set to https://pypi.tuna.tsinghua.edu.cn/simple"}),
    ("install", {"tool": "VS Code extension: Chinese Language Pack", "manager": "code --install-extension"}),
    ("install", {"tool": "VS Code extension: GitLens, Prettier, ESLint, Python, Pylance, Volar, Tailwind", "manager": "code --install-extension"}),
    ("install", {"tool": "WorkBuddy skill: vercel-react-best-practices, web-design-guidelines, agent-browser, find-skills", "manager": "npm global + skills install"}),
    ("install", {"tool": "WorkBuddy skill: session-memory", "manager": "manually created at ~/.workbuddy/skills/session-memory"}),
    ("problem_solved", {"problem": "npm global dir not found during skill install", "solution": "Created C:\\Users\\60496\\AppData\\Roaming\\npm manually, then set npm prefix and cache config"}),
    ("architecture_decision", {"decision": "session-memory skill stores data at ~/.workbuddy/session-memory/<project>.json", "reason": "User-scoped, persistent across workspaces, no DB required"}),
    ("milestone", {"description": "Full dev environment operational: Git 2.47.1 + Node v20.18.1 + Python 3.12.7 + VS Code 1.111.0, all tools verified, npm/pip mirrors configured, 6 WorkBuddy skills installed"}),
]

import json
for event_type, payload in events:
    r = subprocess.run(
        [py, script, 'capture', '--project', 'dev-env-setup', '--event', event_type, '--data', json.dumps(payload)],
        capture_output=True, text=True, encoding='utf-8', errors='replace'
    )
    print(r.stdout.strip() or r.stderr.strip())

print("\nAll events captured!")
