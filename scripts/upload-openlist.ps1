$token = "openlist-a1c1f182-dab5-442d-ac95-5b9be53a895anZaf43BVmqDWcvLIgxE29En3eTi9WpYkGODRrjK1hrezoRrXCzdV2w6GBatpcSur"
$version = "0.9.1"
$baseUrl = "https://wp.svlmod.cn"
$path = "/SVL/SVL/fantuangongfang/update"
$buildDir = "D:\aaaawagjunhao\stardew-mod-studio\build-tmp"

$files = @(
    "fantuan-workshop-setup-$version.exe",
    "fantuan-workshop-setup-$version.exe.blockmap",
    "latest.yml"
)

Write-Host "Uploading to OpenList..." -ForegroundColor Cyan

foreach ($file in $files) {
    $filePath = Join-Path $buildDir $file
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $file (not found)" -ForegroundColor DarkYellow
        continue
    }
    
    $url = "$baseUrl/dav$path/$file"
    $size = (Get-Item $filePath).Length
    Write-Host "Uploading $file ($([math]::Round($size/1MB, 1)) MB)..." -ForegroundColor Gray
    
    try {
        $result = Invoke-RestMethod -Uri $url -Method Put -InFile $filePath -ContentType "application/octet-stream" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 600
        Write-Host "OK: $file" -ForegroundColor Green
    } catch {
        Write-Host "FAILED: $file - $_" -ForegroundColor Red
    }
}

Write-Host "`nOpenList URL: https://wp.svlmod.cn/d/SVL/SVL/fantuangongfang/update/" -ForegroundColor Cyan