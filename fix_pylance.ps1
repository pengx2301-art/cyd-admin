$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = $machinePath + ";" + $userPath

$codeCmd = "C:\Users\60496\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd"

Write-Host "Installing ms-python.pylance ..." -ForegroundColor Yellow
& $codeCmd --install-extension ms-python.pylance --force 2>&1

$installed = (& $codeCmd --list-extensions 2>&1) | Where-Object { $_ -match "pylance" }
if ($installed) {
    Write-Host "[OK] $installed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] pylance still not found" -ForegroundColor Red
}
