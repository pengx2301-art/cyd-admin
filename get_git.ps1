[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$outFile = "C:\Users\60496\Downloads\DevSetup\git.exe"
Remove-Item $outFile -Force -ErrorAction SilentlyContinue

$urls = @(
    "https://mirrors.aliyun.com/git-for-windows/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe",
    "https://cdn.npmmirror.com/binaries/git-for-windows/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe",
    "https://mirror.nju.edu.cn/github-release/git-for-windows/git/LatestRelease/Git-2.47.1.2-64-bit.exe"
)

$downloaded = $false
foreach ($url in $urls) {
    Write-Host "Trying: $url" -ForegroundColor Yellow
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        $wc.DownloadFile($url, $outFile)
        $sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 1)
        if ($sizeMB -gt 10) {
            Write-Host "Downloaded: $sizeMB MB" -ForegroundColor Green
            $downloaded = $true
            break
        } else {
            Write-Host "File too small ($sizeMB MB), trying next..." -ForegroundColor Red
            Remove-Item $outFile -Force
        }
    } catch {
        Write-Host "Failed: $_" -ForegroundColor Red
    }
}

if ($downloaded) {
    Write-Host "Installing Git..." -ForegroundColor Yellow
    Start-Process -FilePath $outFile -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /COMPONENTS=icons,ext\reg\shellhere,assoc,assoc_sh" -Wait
    Write-Host "[OK] Git installed!" -ForegroundColor Green

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    # Verify
    $gitVer = git --version 2>&1
    Write-Host "Git version: $gitVer" -ForegroundColor Green
} else {
    Write-Host "[ERROR] All mirrors failed. Please download manually:" -ForegroundColor Red
    Write-Host "https://git-scm.com/download/win" -ForegroundColor Cyan
}

pause
