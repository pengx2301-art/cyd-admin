# CloudBase 自动化部署脚本
# 请在执行此脚本前，先手动运行一次 `tcb login` 完成登录

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CloudBase 部署自动化脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已登录
Write-Host "[1/5] 检查登录状态..." -ForegroundColor Yellow
$envListResult = tcb env list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 已登录 CloudBase" -ForegroundColor Green
    Write-Host ""
    
    # 解析环境列表
    Write-Host "[2/5] 可用环境列表：" -ForegroundColor Yellow
    Write-Host $envListResult
    Write-Host ""
    
    # 让用户选择环境
    Write-Host "请输入要使用的环境 ID（envId）：" -ForegroundColor Cyan
    Write-Host "提示：从上面的列表中复制 envId，例如：xxx-xxx-xxx" -ForegroundColor Gray
    $envId = Read-Host
    
    # 验证输入
    if ([string]::IsNullOrWhiteSpace($envId)) {
        Write-Host "错误：环境 ID 不能为空！" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ 已选择环境：$envId" -ForegroundColor Green
    Write-Host ""
    
    # 更新 cloudbaserc.json
    Write-Host "[3/5] 更新配置文件..." -ForegroundColor Yellow
    $configPath = "cloudbaserc.json"
    $configContent = Get-Content $configPath -Raw -Encoding UTF8
    
    # 使用正则替换 envId
    $newConfig = $configContent -replace '"envId"\s*:\s*""', "`"envId`": `"$envId`""
    
    Set-Content -Path $configPath -Value $newConfig -Encoding UTF8 -NoNewline
    Write-Host "✓ 配置文件已更新" -ForegroundColor Green
    Write-Host ""
    
    # 显示即将部署的内容
    Write-Host "[4/5] 部署配置概览：" -ForegroundColor Yellow
    Write-Host "  环境ID: $envId" -ForegroundColor White
    Write-Host "  云函数: cyd-server" -ForegroundColor White
    Write-Host "  前端路径: ./dashboard-ui" -ForegroundColor White
    Write-Host ""
    
    # 确认部署
    Write-Host "是否开始部署？(Y/N)" -ForegroundColor Cyan
    $confirm = Read-Host
    
    if ($confirm -eq "Y" -or $confirm -eq "y") {
        Write-Host ""
        Write-Host "[5/5] 开始部署..." -ForegroundColor Yellow
        Write-Host "这可能需要几分钟时间，请耐心等待..." -ForegroundColor Gray
        Write-Host ""
        
        # 执行部署
        tcb deploy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "   ✓ 部署成功！" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "请查看上方的访问地址" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "部署失败，请检查错误信息" -ForegroundColor Red
            Write-Host ""
        }
    } else {
        Write-Host "部署已取消" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ 尚未登录 CloudBase" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先执行以下命令完成登录：" -ForegroundColor Yellow
    Write-Host "  tcb login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "登录成功后，再次运行此脚本即可" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
