# Find locked files
Get-ChildItem -Path 'D:\aaaawagjunhao\stardew-mod-studio\dist' -Recurse -File | ForEach-Object {
    try {
        $stream = $_.Open([System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None)
        $stream.Close()
        Write-Host ("FREE: " + $_.Name)
    } catch {
        Write-Host ("LOCKED: " + $_.Name + " - " + $_.FullName)
    }
}
