param(
    [string]$token = $env:GH_TOKEN,
    [string]$version = "0.9.1",
    [string]$distDir = "D:\aaaawagjunhao\stardew-mod-studio\dist",
    [string]$buildDir = "D:\aaaawagjunhao\stardew-mod-studio\build-tmp"
)

if (-not $token) {
    Write-Host "ERROR: GH_TOKEN environment variable is not set" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
}

$repoOwner = "fantuan9234"
$repoName = "fantuan-workshop"
$tag = "v$version"

Write-Host "=== Step 1: Create GitHub Release ===" -ForegroundColor Cyan

$body = @{
    tag_name = $tag
    name = "v$version"
    draft = $false
    generate_release_notes = $true
} | ConvertTo-Json

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases" -Headers $headers -Method Post -Body $body -ContentType "application/json"
    Write-Host "Release created: $($release.html_url)" -ForegroundColor Green
    $releaseId = $release.id
} catch {
    Write-Host "Failed to create release: $_" -ForegroundColor Red
    
    # Maybe it already exists? Check
    Write-Host "Checking if release already exists..." -ForegroundColor Yellow
    try {
        $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/tags/$tag" -Headers $headers
        Write-Host "Release already exists: $($existing.html_url)" -ForegroundColor Yellow
        $releaseId = $existing.id
        
        # Delete old assets
        foreach ($asset in $existing.assets) {
            Write-Host "Deleting old asset: $($asset.name)" -ForegroundColor DarkYellow
            Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/assets/$($asset.id)" -Headers $headers -Method Delete | Out-Null
        }
    } catch {
        Write-Host "Release doesn't exist either. Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== Step 2: Upload Assets ===" -ForegroundColor Cyan

$uploadUrl = "https://uploads.github.com/repos/$repoOwner/$repoName/releases/$releaseId/assets"
$files = @(
    "fantuan-workshop-setup-$version.exe",
    "fantuan-workshop-setup-$version.exe.blockmap",
    "latest.yml"
)

foreach ($file in $files) {
    $filePath = Join-Path $buildDir $file
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $file (not found at $filePath)" -ForegroundColor DarkYellow
        continue
    }
    
    Write-Host "Uploading: $file..." -ForegroundColor Gray
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $url = "$uploadUrl`?name=$file"
    
    try {
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $bytes -ContentType "application/octet-stream"
        Write-Host "OK: $($result.name)" -ForegroundColor Green
    } catch {
        Write-Host "FAILED: $file - $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Step 3: OpenList Upload ===" -ForegroundColor Cyan
$openListToken = $env:OPENLIST_TOKEN
if ($openListToken) {
    $baseUrl = "https://wp.svlmod.cn"
    $path = "/SVL/SVL/fantuangongfang/update"
    
    foreach ($file in $files) {
        $filePath = Join-Path $buildDir $file
        if (-not (Test-Path $filePath)) {
            Write-Host "SKIP: $file (not found)" -ForegroundColor DarkYellow
            continue
        }
        
        $url = "$baseUrl/dav$path/$file"
        Write-Host "Uploading to OpenList: $file..." -ForegroundColor Gray
        try {
            $result = Invoke-RestMethod -Uri $url -Method Put -InFile $filePath -ContentType "application/octet-stream" -Headers @{ Authorization = "Bearer $openListToken" }
            Write-Host "OK: $file uploaded to OpenList" -ForegroundColor Green
        } catch {
            Write-Host "FAILED: $file to OpenList - $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "SKIP: OPENLIST_TOKEN not set" -ForegroundColor DarkYellow
}

Write-Host "`n=== DONE ===" -ForegroundColor Cyan
Write-Host "GitHub: https://github.com/$repoOwner/$repoName/releases/tag/$tag"
Write-Host "OpenList: https://wp.svlmod.cn/d/SVL/SVL/fantuangongfang/update/"