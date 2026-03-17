$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

Write-Host "Testing node..."
$nodeResult = & node --version 2>&1
Write-Host "Node: $nodeResult"

Write-Host "Testing npx..."
$npxResult = & npx --version 2>&1
Write-Host "npx: $npxResult"

Write-Host "Node location:"
(Get-Command node -ErrorAction SilentlyContinue).Source
