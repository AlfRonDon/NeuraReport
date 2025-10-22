$names = "uvicorn","node","vite"
foreach ($n in $names) {
  Get-Process $n -ErrorAction SilentlyContinue | ForEach-Object {
    try { Write-Host "Stopping $($_.ProcessName) (PID $($_.Id))" -ForegroundColor Yellow; Stop-Process -Id $_.Id -Force } catch {}
  }
}
Write-Host "✅ Stopped common dev processes."
