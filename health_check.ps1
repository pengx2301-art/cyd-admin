$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = $machinePath + ";" + $userPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Dev Environment Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0

function Check-Tool {
    param($Name, $Cmd)
    try {
        $out = (Invoke-Expression $Cmd 2>&1) | Select-Object -First 1
        if ($out -and $out -notmatch "not found|was not found|error") {
            Write-Host "  [OK] $Name : $out" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  [FAIL] $Name" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  [FAIL] $Name : not found" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "[ Core Tools ]" -ForegroundColor White
Check-Tool "Git"    "git --version"
Check-Tool "Node"   "node --version"
Check-Tool "npm"    "npm --version"
Check-Tool "Python" "python --version"
Check-Tool "pip"    "pip --version"
Check-Tool "VSCode" "code --version"

Write-Host ""
Write-Host "[ Git Config ]" -ForegroundColor White
$gitName  = git config --global user.name  2>&1
$gitEmail = git config --global user.email 2>&1
if ($gitName)  { Write-Host "  [OK] user.name  : $gitName"  -ForegroundColor Green; $pass++ }
else           { Write-Host "  [FAIL] user.name not set"     -ForegroundColor Red;   $fail++ }
if ($gitEmail) { Write-Host "  [OK] user.email : $gitEmail" -ForegroundColor Green; $pass++ }
else           { Write-Host "  [FAIL] user.email not set"    -ForegroundColor Red;   $fail++ }
Write-Host "  [INFO] branch : $(git config --global init.defaultBranch)" -ForegroundColor Gray
Write-Host "  [INFO] editor : $(git config --global core.editor)"        -ForegroundColor Gray

Write-Host ""
Write-Host "[ Mirror Config ]" -ForegroundColor White
$npmReg = npm config get registry 2>&1
if ($npmReg -match "npmmirror") { Write-Host "  [OK] npm : $npmReg" -ForegroundColor Green; $pass++ }
else { Write-Host "  [WARN] npm : $npmReg" -ForegroundColor Yellow }

$pipMirror = pip config get global.index-url 2>&1
if ($pipMirror -match "tsinghua|aliyun|ustc|huaweicloud") { Write-Host "  [OK] pip : $pipMirror" -ForegroundColor Green; $pass++ }
else { Write-Host "  [WARN] pip : $pipMirror" -ForegroundColor Yellow }

Write-Host ""
Write-Host "[ VS Code Extensions ]" -ForegroundColor White
$codeCmd = "C:\Users\60496\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd"
$expectedExts = @(
    "ms-ceintl.vscode-language-pack-zh-hans",
    "eamodio.gitlens",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "PKief.material-icon-theme"
)
$installedExts = (& $codeCmd --list-extensions 2>&1) | ForEach-Object { $_.Trim().ToLower() }
foreach ($ext in $expectedExts) {
    if ($installedExts -contains $ext.ToLower()) {
        Write-Host "  [OK] $ext" -ForegroundColor Green; $pass++
    } else {
        Write-Host "  [MISS] $ext" -ForegroundColor Red; $fail++
    }
}

Write-Host ""
Write-Host "[ WorkBuddy Skills ]" -ForegroundColor White
$skillsDir = "C:\Users\60496\.workbuddy\skills"
foreach ($skill in @("vercel-react-best-practices","web-design-guidelines","agent-browser","find-skills")) {
    if (Test-Path "$skillsDir\$skill") {
        Write-Host "  [OK] $skill" -ForegroundColor Green; $pass++
    } else {
        Write-Host "  [MISS] $skill" -ForegroundColor Red; $fail++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
$total = $pass + $fail
if ($fail -eq 0) {
    Write-Host "  RESULT: $pass/$total  ALL PASSED!" -ForegroundColor Green
} else {
    Write-Host "  RESULT: $pass/$total  ($fail issue(s))" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
