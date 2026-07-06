# start-all.ps1 が記録したPIDを読み込み、プロセスツリーごと停止する。

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "run.pids"

if (-not (Test-Path $pidFile)) {
    Write-Host "run.pids が見つかりません(起動していない、または既に停止しています)。"
    exit
}

Get-Content $pidFile | ForEach-Object {
    if ($_ -match "^(.+)=(\d+)$") {
        $name = $matches[1]
        $procId = $matches[2]
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
            taskkill /PID $procId /T /F 2>$null | Out-Null
            Write-Host "[$name] stopped (PID $procId)"
        } else {
            Write-Host "[$name] already stopped (PID $procId)"
        }
    }
}

Remove-Item $pidFile
Write-Host ""
Write-Host "全て停止しました。"

