# Dev Environment Setup Script
# Run as Administrator

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Dev Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[ERROR] Please run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "[OK] Administrator confirmed" -ForegroundColor Green
Write-Host ""

function Install-Tool {
    param($Name, $Id)
    Write-Host ">>> Installing $Name ..." -ForegroundColor Yellow
    winget install $Id --accept-source-agreements --accept-package-agreements --silent
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq -1978335189) {
        Write-Host "[OK] $Name done" -ForegroundColor Green
    } else {
        Write-Host "[WARN] $Name exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
    Write-Host ""
}

Install-Tool "Git"              "Git.Git"
Install-Tool "Node.js LTS"      "OpenJS.NodeJS.LTS"
Install-Tool "Python 3.12"      "Python.Python.3.12"
Install-Tool "Visual Studio Code" "Microsoft.VisualStudioCode"

# Refresh PATH
Write-Host ">>> Refreshing PATH ..." -ForegroundColor Yellow
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path    = $machinePath + ";" + $userPath
Write-Host "[OK] PATH refreshed" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$checks = @(
    @{ Name = "Git";     Cmd = "git --version" },
    @{ Name = "Node.js"; Cmd = "node --version" },
    @{ Name = "npm";     Cmd = "npm --version" },
    @{ Name = "Python";  Cmd = "python --version" },
    @{ Name = "pip";     Cmd = "pip --version" },
    @{ Name = "VS Code"; Cmd = "code --version" }
)

foreach ($check in $checks) {
    try {
        $ver = Invoke-Expression $check.Cmd 2>&1 | Select-Object -First 1
        Write-Host "[OK] $($check.Name): $ver" -ForegroundColor Green
    } catch {
        Write-Host "[MISS] $($check.Name): not found" -ForegroundColor Red
    }
}

Write-Host ""

# VS Code extensions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Installing VS Code Extensions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$extensions = @(
    "ms-ceintl.vscode-language-pack-zh-hans",
    "eamodio.gitlens",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-python.python",
    "ms-python.pylance",
    "ms-python.debugpy",
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker",
    "PKief.material-icon-theme"
)

$codePaths = @(
    "code",
    "C:\Users\60496\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd",
    "C:\Program Files\Microsoft VS Code\bin\code.cmd"
)

$codeExe = $null
foreach ($p in $codePaths) {
    if (Get-Command $p -ErrorAction SilentlyContinue) {
        $codeExe = $p
        break
    }
}

if ($codeExe) {
    foreach ($ext in $extensions) {
        Write-Host ">>> $ext" -ForegroundColor Yellow
        & $codeExe --install-extension $ext --force 2>&1 | Out-Null
        Write-Host "[OK]" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] VS Code not found in PATH, skip extensions. Re-run after reboot." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   All Done! Please restart terminal." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
pause
