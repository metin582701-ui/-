# backend / frontend / ngrok を非表示ウィンドウでバックグラウンド起動する。
# - backend(8000番)・frontend(5173番)は、既にポートが使用中ならスキップする。
# - ngrok は無料プランで2時間ごとにセッションが切れる仕様のため、
#   既存プロセスがあれば一旦停止したうえで毎回必ず新しいセッションを起動し直す。

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "run.pids"
$logDir = Join-Path $root "logs"
$ngrokExe = "C:\Users\kosei\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe"
$ngrokDomain = "appease-baking-unhappily.ngrok-free.dev"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
if (Test-Path $pidFile) {
    Remove-Item $pidFile
}

function Test-PortListening($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Get-PortOwnerPid($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return $conn.OwningProcess
}

function Start-Hidden($name, $filePath, $argumentList, $workingDirectory) {
    $stdout = Join-Path $logDir "$name.out.log"
    $stderr = Join-Path $logDir "$name.err.log"
    return Start-Process -FilePath $filePath -ArgumentList $argumentList `
        -WorkingDirectory $workingDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
}

function Save-ProcId($name, $procId) {
    Add-Content -Path $pidFile -Value "$name=$procId" -Encoding utf8
}

Write-Host "=== 起動状況 ==="

# --- backend (8000番) ---
if (Test-PortListening -port 8000) {
    $existingPid = Get-PortOwnerPid -port 8000
    Save-ProcId "backend" $existingPid
    Write-Host "[backend] すでに起動しています (PID $existingPid) - スキップ"
} else {
    $p = Start-Hidden -name "backend" -filePath "python" `
        -argumentList @("-m", "uvicorn", "app.main:app", "--port", "8000") `
        -workingDirectory (Join-Path $root "backend")
    Save-ProcId "backend" $p.Id
    Write-Host "[backend] 新規起動しました (PID $($p.Id))"
}

# --- frontend (5173番) ---
if (Test-PortListening -port 5173) {
    $existingPid = Get-PortOwnerPid -port 5173
    Save-ProcId "frontend" $existingPid
    Write-Host "[frontend] すでに起動しています (PID $existingPid) - スキップ"
} else {
    $p = Start-Hidden -name "frontend" -filePath "cmd.exe" `
        -argumentList @("/c", "npm run dev") `
        -workingDirectory (Join-Path $root "frontend")
    Save-ProcId "frontend" $p.Id
    Write-Host "[frontend] 新規起動しました (PID $($p.Id))"
}

# --- ngrok(常に新しいセッションで起動し直す) ---
$existingNgrok = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($existingNgrok) {
    $existingNgrok | ForEach-Object {
        taskkill /PID $_.Id /T /F 2>$null | Out-Null
    }
    Start-Sleep -Seconds 1
    Write-Host "[ngrok] 古いセッションを停止しました"
}

$p = Start-Hidden -name "ngrok" -filePath $ngrokExe `
    -argumentList @("http", "--url=$ngrokDomain", "5173") `
    -workingDirectory $root
Save-ProcId "ngrok" $p.Id
Start-Sleep -Seconds 2
if ($p.HasExited) {
    Write-Host "[ngrok] 起動に失敗した可能性があります。logs\ngrok.err.log を確認してください。"
} else {
    Write-Host "[ngrok] 新しいセッションを起動しました (PID $($p.Id)) - $ngrokDomain"
}

Write-Host ""
Write-Host "PID一覧: $pidFile"
Write-Host "停止するには stop-all.bat を実行してください。"

