# backend / frontend / ngrok をすべて非表示ウィンドウでバックグラウンド起動する。
# このスクリプトを実行したターミナルを閉じても、起動したプロセスは動き続ける。

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "run.pids"
$logDir = Join-Path $root "logs"
$ngrokExe = "C:\Users\kosei\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
if (Test-Path $pidFile) {
    Remove-Item $pidFile
}

function Start-Hidden($name, $filePath, $argumentList, $workingDirectory) {
    $stdout = Join-Path $logDir "$name.out.log"
    $stderr = Join-Path $logDir "$name.err.log"
    $p = Start-Process -FilePath $filePath -ArgumentList $argumentList `
        -WorkingDirectory $workingDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    "$name=$($p.Id)" | Out-File -Append -Encoding utf8 $pidFile
    Write-Host "[$name] started (PID $($p.Id)) - logs: $stdout"
    return $p
}

$null = Start-Hidden -name "backend" -filePath "python" `
    -argumentList @("-m", "uvicorn", "app.main:app", "--port", "8000") `
    -workingDirectory (Join-Path $root "backend")

$null = Start-Hidden -name "frontend" -filePath "cmd.exe" `
    -argumentList @("/c", "npm run dev") `
    -workingDirectory (Join-Path $root "frontend")

$null = Start-Hidden -name "ngrok" -filePath $ngrokExe `
    -argumentList @("http", "--url=appease-baking-unhappily.ngrok-free.dev", "5173") `
    -workingDirectory $root

Write-Host ""
Write-Host "全て起動しました。PID一覧: $pidFile"
Write-Host "停止するには stop-all.bat を実行してください。"

