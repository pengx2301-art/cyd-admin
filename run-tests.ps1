# PowerShell 测试启动脚本
# 启动服务器并运行测试

$ErrorActionPreference = "SilentlyContinue"

Write-Host "🚀 启动服务器..." -ForegroundColor Green
$serverProcess = Start-Process node -ArgumentList "server.js" -PassThru -NoNewWindow -RedirectStandardOutput "server.log" -RedirectStandardError "server.err"
Write-Host "📝 服务器进程 ID: $($serverProcess.Id)" -ForegroundColor Cyan

Write-Host "⏳ 等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "🧪 运行测试套件..." -ForegroundColor Green
node test-suite.js all

Write-Host "🛑 停止服务器..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "✅ 测试完成!" -ForegroundColor Green
