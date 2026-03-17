# 开发环境检查和目录创建脚本
$devDir = "C:\Users\60496\DevTools"

# 创建开发工具目录
if (-not (Test-Path $devDir)) {
    New-Item -ItemType Directory -Path $devDir -Force | Out-Null
    Write-Host "Created: $devDir"
} else {
    Write-Host "Already exists: $devDir"
}

# 检查各工具是否存在
$tools = @{
    "Git"    = "C:\Program Files\Git\bin\git.exe"
    "Node"   = "C:\Program Files\nodejs\node.exe"
    "Python" = "C:\Users\60496\AppData\Local\Programs\Python\Python312\python.exe"
    "VSCode" = "C:\Users\60496\AppData\Local\Programs\Microsoft VS Code\Code.exe"
}

foreach ($tool in $tools.GetEnumerator()) {
    if (Test-Path $tool.Value) {
        Write-Host "[OK] $($tool.Key) found at $($tool.Value)"
    } else {
        Write-Host "[MISSING] $($tool.Key) not found"
    }
}

# 检查用户PATH里有什么开发工具
Write-Host "`n--- User PATH entries ---"
$env:PATH -split ';' | Where-Object { $_ -ne '' } | ForEach-Object { Write-Host $_ }
