# Configure Git, npm, pip mirrors
# No admin required

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dev Environment Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Git config ───────────────────────────────────────────────
Write-Host ">>> Configuring Git..." -ForegroundColor Yellow

$gitName  = Read-Host "  Enter your Git username (e.g. Zhang San)"
$gitEmail = Read-Host "  Enter your Git email (e.g. you@example.com)"

git config --global user.name  "$gitName"
git config --global user.email "$gitEmail"
git config --global core.autocrlf true
git config --global core.editor "code --wait"
git config --global init.defaultBranch main
git config --global color.ui auto

Write-Host "  [OK] Git configured" -ForegroundColor Green
Write-Host ""

# ── npm mirror ───────────────────────────────────────────────
Write-Host ">>> Configuring npm mirror (npmmirror)..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com
$npmReg = npm config get registry
Write-Host "  [OK] npm registry: $npmReg" -ForegroundColor Green
Write-Host ""

# ── pip mirror ───────────────────────────────────────────────
Write-Host ">>> Configuring pip mirror (Tsinghua)..." -ForegroundColor Yellow
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn
Write-Host "  [OK] pip mirror set" -ForegroundColor Green
Write-Host ""

# ── Verify all configs ───────────────────────────────────────
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Git config:" -ForegroundColor White
Write-Host "  name  : $(git config --global user.name)" -ForegroundColor Green
Write-Host "  email : $(git config --global user.email)" -ForegroundColor Green
Write-Host "  editor: $(git config --global core.editor)" -ForegroundColor Green
Write-Host "  branch: $(git config --global init.defaultBranch)" -ForegroundColor Green
Write-Host ""

Write-Host "npm registry : $(npm config get registry)" -ForegroundColor Green
Write-Host ""

Write-Host "pip mirror:" -ForegroundColor White
pip config list
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  All configured! Ready to code." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
pause
