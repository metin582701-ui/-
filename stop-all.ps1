# backend(python)・frontend(node)・ngrok のプロセスをまとめて停止する。
# ポート番号やPIDのズレに影響されないよう、プロセス名で直接止める方式。
# 注意: このPC上で動いている他のpython/node/ngrokプロセスも一緒に停止するので、
#       このアプリ専用のマシンでの利用を想定しています。

Write-Host "=== 停止処理 ==="

foreach ($name in @("python", "node", "ngrok")) {
    $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | Stop-Process -Force
        Write-Host "[$name] 停止しました ($($procs.Count)件)"
    } else {
        Write-Host "[$name] プロセスは見つかりませんでした"
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root "run.pids"
if (Test-Path $pidFile) {
    Remove-Item $pidFile
}

Write-Host ""
Write-Host "全て停止しました。"

