# Stop CopilotProxy Server (Windows)
# This script stops any running proxy server processes

Write-Host "Stopping CopilotProxy Server..." -ForegroundColor Yellow

# Find node processes running server.js
$ProxyProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainModule.FileName -and
    (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -match "server.js"
}

if ($ProxyProcesses) {
    foreach ($Process in $ProxyProcesses) {
        Write-Host "Stopping process $($Process.Id)..." -ForegroundColor Cyan
        Stop-Process -Id $Process.Id -Force
    }
    Write-Host "Proxy server stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "No proxy server process found running." -ForegroundColor Yellow
}
