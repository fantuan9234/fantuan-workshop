[System.Reflection.Assembly]::LoadWithPartialName('System.Management') | Out-Null
Get-Process | ForEach-Object {
    $id = $_.Id
    $name = $_.ProcessName
    try {
        $query = 'SELECT * FROM Win32_Process WHERE ProcessId = ' + $id
        $wmi = Get-WmiObject -Query $query -ErrorAction SilentlyContinue
        if ($wmi) {
            $cmdLine = ''
            try { $cmdLine = $wmi.CommandLine.Substring(0, [Math]::Min(200, $wmi.CommandLine.Length)) } catch {}
            if ($cmdLine -match 'asar|Stardew|fantuan|饭团') {
                Write-Host ("PID: $id - $name - $cmdLine")
            }
        }
    } catch {}
}
