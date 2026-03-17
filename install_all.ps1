# ============================================================
# Download and Install Dev Tools - Run as Administrator
# Force re-download all files
# ============================================================

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dev Tools Installer (CN Mirror)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    Write-Host "[ERROR] Run as Administrator!" -ForegroundColor Red
    pause; exit 1
}

$dlDir = "C:\Users\60496\Downloads\DevSetup"
New-Item -ItemType Directory -Path $dlDir -Force | Out-Null

# Clean all old files
Write-Host "Cleaning old downloads..." -ForegroundColor Gray
Remove-Item "$dlDir\*" -Force -ErrorAction SilentlyContinue
Write-Host "Download folder: $dlDir" -ForegroundColor Gray

function Download-File {
    param($Url, $OutFile, $Name)
    Write-Host "  Downloading $Name ..." -ForegroundColor Yellow
    Write-Host "  From: $Url" -ForegroundColor DarkGray
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0")
        $wc.DownloadFile($Url, $OutFile)
        if (Test-Path $OutFile) {
            $size = [math]::Round((Get-Item $OutFile).Length / 1MB, 1)
            if ($size -lt 1) {
                Write-Host "  FAILED: file too small ($size MB), likely corrupt" -ForegroundColor Red
                Remove-Item $OutFile -Force
                return $false
            }
            Write-Host "  OK ($size MB)" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        return $false
    }
    return $false
}

# ── 1. Git ───────────────────────────────────────────────────
Write-Host ""
Write-Host ">>> [1/4] Git" -ForegroundColor Cyan
$gitFile = "$dlDir\git-installer.exe"

$gitUrls = @(
    "https://mirrors.tuna.tsinghua.edu.cn/github-release/git-for-windows/git/LatestRelease/Git-2.47.1.2-64-bit.exe",
    "https://cdn.npmmirror.com/binaries/git-for-windows/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe",
    "https://mirrors.aliyun.com/git-for-windows/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe"
)

$ok = $false
foreach ($url in $gitUrls) {
    $ok = Download-File $url $gitFile "Git"
    if ($ok) { break }
    Write-Host "  Trying next mirror..." -ForegroundColor Gray
}

if ($ok) {
    Write-Host "  Installing Git (silent)..." -ForegroundColor Yellow
    Start-Process -FilePath $gitFile -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /COMPONENTS=icons,ext\reg\shellhere,assoc,assoc_sh" -Wait
    Write-Host "  [OK] Git installed" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] Git download failed" -ForegroundColor Red
}

# ── 2. Node.js LTS ───────────────────────────────────────────
Write-Host ""
Write-Host ">>> [2/4] Node.js LTS" -ForegroundColor Cyan
$nodeFile = "$dlDir\node-lts.msi"

$nodeUrls = @(
    "https://cdn.npmmirror.com/binaries/node/v20.18.1/node-v20.18.1-x64.msi",
    "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v20.18.1/node-v20.18.1-x64.msi"
)

$ok = $false
foreach ($url in $nodeUrls) {
    $ok = Download-File $url $nodeFile "Node.js LTS"
    if ($ok) { break }
    Write-Host "  Trying next mirror..." -ForegroundColor Gray
}

if ($ok) {
    Write-Host "  Installing Node.js (silent)..." -ForegroundColor Yellow
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$nodeFile`" /qn /norestart" -Wait
    Write-Host "  [OK] Node.js installed" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] Node.js download failed" -ForegroundColor Red
}

# ── 3. Python 3.12 ───────────────────────────────────────────
Write-Host ""
Write-Host ">>> [3/4] Python 3.12" -ForegroundColor Cyan
$pythonFile = "$dlDir\python-installer.exe"

$pythonUrls = @(
    "https://cdn.npmmirror.com/binaries/python/3.12.7/python-3.12.7-amd64.exe",
    "https://mirrors.huaweicloud.com/python/3.12.7/python-3.12.7-amd64.exe",
    "https://mirrors.ustc.edu.cn/python/3.12.7/python-3.12.7-amd64.exe"
)

$ok = $false
foreach ($url in $pythonUrls) {
    $ok = Download-File $url $pythonFile "Python 3.12"
    if ($ok) { break }
    Write-Host "  Trying next mirror..." -ForegroundColor Gray
}

if ($ok) {
    Write-Host "  Installing Python (silent)..." -ForegroundColor Yellow
    Start-Process -FilePath $pythonFile -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_test=0" -Wait
    Write-Host "  [OK] Python installed" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] Python download failed" -ForegroundColor Red
}

# ── 4. VS Code ───────────────────────────────────────────────
Write-Host ""
Write-Host ">>> [4/4] VS Code" -ForegroundColor Cyan
$vscodeFile = "$dlDir\vscode-installer.exe"

$vscodeUrls = @(
    "https://vscode.cdn.azure.cn/stable/latest/win32-x64-user",
    "https://update.code.visualstudio.com/latest/win32-x64-user/stable"
)

$ok = $false
foreach ($url in $vscodeUrls) {
    $ok = Download-File $url $vscodeFile "VS Code"
    if ($ok) { break }
    Write-Host "  Trying next mirror..." -ForegroundColor Gray
}

if ($ok) {
    Write-Host "  Installing VS Code (silent)..." -ForegroundColor Yellow
    Start-Process -FilePath $vscodeFile -ArgumentList "/VERYSILENT /NORESTART /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath" -Wait
    Write-Host "  [OK] VS Code installed" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] VS Code download failed" -ForegroundColor Red
}

# ── Refresh PATH ─────────────────────────────────────────────
Write-Host ""
Write-Host ">>> Refreshing PATH..." -ForegroundColor Yellow
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path    = "$machinePath;$userPath"
Write-Host "[OK] PATH refreshed" -ForegroundColor Green

# ── Verify ───────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Start-Sleep -Seconds 2

$items = @(
    @{Name="Git";    Cmd="git --version"},
    @{Name="Node";   Cmd="node --version"},
    @{Name="npm";    Cmd="npm --version"},
    @{Name="Python"; Cmd="python --version"},
    @{Name="pip";    Cmd="pip --version"},
    @{Name="VSCode"; Cmd="code --version"}
)
foreach ($item in $items) {
    try {
        $out = (Invoke-Expression $item.Cmd 2>&1) | Select-Object -First 1
        Write-Host "[OK]   $($item.Name): $out" -ForegroundColor Green
    } catch {
        Write-Host "[MISS] $($item.Name): not found (re-open terminal)" -ForegroundColor Red
    }
}

# ── VS Code Extensions ───────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installing VS Code Extensions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$codeCmd = $null
$codeCandidates = @(
    "C:\Program Files\Microsoft VS Code\bin\code.cmd",
    "C:\Users\60496\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd",
    "code"
)
foreach ($c in $codeCandidates) {
    if (Test-Path $c) { $codeCmd = $c; break }
}

$extensions = @(
    "ms-ceintl.vscode-language-pack-zh-hans",
    "eamodio.gitlens",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-python.python",
    "ms-python.pylance",
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "PKief.material-icon-theme"
)

if ($codeCmd) {
    Write-Host "  Using: $codeCmd" -ForegroundColor Gray
    foreach ($ext in $extensions) {
        Write-Host "  + $ext" -ForegroundColor Yellow
        & $codeCmd --install-extension $ext --force 2>&1 | Out-Null
        Write-Host "    [OK]" -ForegroundColor Green
    }
} else {
    Write-Host "  [WARN] VS Code not found yet. Run these after reboot:" -ForegroundColor Yellow
    foreach ($ext in $extensions) {
        Write-Host "    code --install-extension $ext" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ALL DONE! Please restart terminal." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
pause
