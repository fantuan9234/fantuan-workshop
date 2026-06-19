# Unlock and delete locked build artifacts
$lockedPaths = @(
    "D:\aaaawagjunhao\stardew-mod-studio\dist\win-unpacked",
    "D:\aaaawagjunhao\stardew-mod-studio\dist\prepackaged",
    "D:\aaaawagjunhao\stardew-mod-studio\dist\electron-custom"
)

# Try to release handles and delete
foreach ($path in $lockedPaths) {
    Write-Host "Processing: $path"
    
    # First try: take ownership
    takeown /f $path /r /d y 2>$null
    icacls $path /grant "Administrators:F" /t /q 2>$null
    
    # Second try: remove read-only attributes
    attrib -R $path /s /d 2>$null
    
    # Third try: force delete
    Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    
    if (Test-Path $path) {
        Write-Host "FAILED: $path still exists"
    } else {
        Write-Host "DELETED: $path"
    }
}
