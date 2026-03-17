$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

Write-Host "Node: $(node --version)"
Write-Host "npm:  $(npm --version)"
Write-Host "npx path: $(Get-Command npx | Select-Object -ExpandProperty Source)"
