const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORY_DIR = path.join(os.homedir(), '.workbuddy', 'session-memory');
fs.mkdirSync(MEMORY_DIR, { recursive: true });

const PROJECT = 'dev-env-setup';
const FILE = path.join(MEMORY_DIR, `${PROJECT}.json`);

const now = () => new Date().toISOString();

const events = [
  { ts: now(), type: 'session_start', goal: 'Setup fresh Windows dev environment', context: 'Brand new Windows PC, no tools installed' },
  { ts: now(), type: 'install', tool: 'Git', version: '2.47.1.windows.2', manager: 'manual download via npmmirror' },
  { ts: now(), type: 'install', tool: 'Node.js', version: 'v20.18.1 LTS', manager: 'manual download' },
  { ts: now(), type: 'install', tool: 'Python', version: '3.12.7', manager: 'manual download' },
  { ts: now(), type: 'install', tool: 'VS Code', version: '1.111.0', manager: 'manual download' },
  { ts: now(), type: 'approach_failed', approach: 'winget install Git.Git', reason_failed: 'No admin rights, exit code 2316632158' },
  { ts: now(), type: 'approach_failed', approach: 'winget --scope user for Git/Node', reason_failed: 'Installer requires system write, scope user not sufficient' },
  { ts: now(), type: 'approach_failed', approach: 'Tsinghua mirror for Git download', reason_failed: '403 Forbidden' },
  { ts: now(), type: 'approach_failed', approach: 'Aliyun mirror for Git download', reason_failed: '404 Not Found' },
  { ts: now(), type: 'problem_solved', problem: 'Git download slow/blocked from official URL', solution: 'Used npmmirror (registry.npmmirror.com) to download Git-2.47.1.2-64-bit.exe successfully' },
  { ts: now(), type: 'problem_solved', problem: 'PowerShell script encoding error with Chinese comments', solution: 'Rewrote all scripts with English-only comments' },
  { ts: now(), type: 'config_change', file: 'git global config', change: 'user.name=pengx2301-art, user.email=pengx2301@gmail.com, defaultBranch=main, editor=vscode' },
  { ts: now(), type: 'config_change', file: 'npm config', change: 'registry=https://registry.npmmirror.com' },
  { ts: now(), type: 'config_change', file: 'pip config', change: 'index-url=https://pypi.tuna.tsinghua.edu.cn/simple' },
  { ts: now(), type: 'install', tool: 'VS Code extensions: Chinese pack, GitLens, Prettier, ESLint, Python, Pylance, Volar, Tailwind', manager: 'code --install-extension' },
  { ts: now(), type: 'install', tool: 'WorkBuddy skills: vercel-react-best-practices, web-design-guidelines, agent-browser, find-skills, session-memory', manager: 'npm + manual' },
  { ts: now(), type: 'problem_solved', problem: 'npm global dir missing during skill install', solution: 'Created C:\\Users\\60496\\AppData\\Roaming\\npm, set npm prefix and cache config explicitly' },
  { ts: now(), type: 'milestone', description: 'Full dev environment operational: Git+Node+Python+VSCode all verified OK, npm/pip mirrors set, 5 WorkBuddy skills installed including session-memory' },
];

const data = {
  project: PROJECT,
  created: now(),
  events,
  summary: '',
};

fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Written: ${FILE}`);
console.log(`Events: ${events.length}`);
