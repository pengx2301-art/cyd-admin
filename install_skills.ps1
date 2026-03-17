$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = $machinePath + ";" + $userPath

$npmDir = "C:\Users\60496\AppData\Roaming\npm"
$npmCache = "C:\Users\60496\AppData\Local\npm-cache"

# Create dirs
New-Item -ItemType Directory -Path $npmDir -Force | Out-Null
New-Item -ItemType Directory -Path $npmCache -Force | Out-Null

# Fix npm prefix
& "C:\Program Files\nodejs\npm.cmd" config set prefix $npmDir
& "C:\Program Files\nodejs\npm.cmd" config set cache $npmCache

Write-Host "npm prefix: $(& 'C:\Program Files\nodejs\npm.cmd' config get prefix)"
Write-Host "npm cache:  $(& 'C:\Program Files\nodejs\npm.cmd' config get cache)"
Write-Host ""

# Install skills one by one
$npx = "C:\Program Files\nodejs\npx.cmd"
$skillsDir = "C:\Users\60496\.workbuddy\skills"
New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null

$skills = @(
    @{ Name = "vercel-react-best-practices"; Pkg = "vercel-labs/agent-skills@vercel-react-best-practices" },
    @{ Name = "web-design-guidelines";       Pkg = "vercel-labs/agent-skills@web-design-guidelines" },
    @{ Name = "frontend-design";             Pkg = "anthropics/skills@frontend-design" },
    @{ Name = "agent-browser";               Pkg = "vercel-labs/agent-browser@agent-browser" }
)

$i = 1
foreach ($skill in $skills) {
    Write-Host ">>> [$i/$($skills.Count)] Installing $($skill.Name)..." -ForegroundColor Yellow
    & $npx -y skills add $skill.Pkg -g -y 2>&1 | ForEach-Object { Write-Host "  $_" }

    # Copy to workbuddy dir if needed
    $agentPath = "C:\Users\60496\.agents\skills\$($skill.Name)"
    $wbPath = "$skillsDir\$($skill.Name)"
    if ((Test-Path $agentPath) -and (-not (Test-Path $wbPath))) {
        Copy-Item -Recurse -Force $agentPath $wbPath
        Write-Host "  -> Copied to WorkBuddy" -ForegroundColor Gray
    }
    if (Test-Path $wbPath) {
        Write-Host "  [OK] $($skill.Name)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] not found in workbuddy dir" -ForegroundColor Yellow
    }
    Write-Host ""
    $i++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Skills in WorkBuddy:" -ForegroundColor Cyan
Get-ChildItem $skillsDir -Directory | ForEach-Object { Write-Host "  [OK] $($_.Name)" -ForegroundColor Green }
Write-Host "========================================" -ForegroundColor Green
Write-Host "Done!" -ForegroundColor Green
