# Start CopilotProxy Server in Background
# This script starts the proxy server as a background process

Write-Host "Starting CopilotProxy Server in background..." -ForegroundColor Green

# Set the working directory
$ProxyPath = "C:\src\copilot-proxy"

# Set environment variables for Claude (User level - persists across sessions)
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "http://localhost:8080", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-proxy00000000000000000000000000000000000000000000", "User")

Write-Host "Environment variables set (User level - persists across sessions):" -ForegroundColor Yellow
Write-Host "  ANTHROPIC_BASE_URL: http://localhost:8080" -ForegroundColor Cyan
Write-Host "  ANTHROPIC_API_KEY: sk-ant-proxy00000000000000000000000000000000000000000000" -ForegroundColor Cyan

# Check if server is already running
$ExistingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainModule.FileName -and (Get-Process -Id $_.Id | Select-Object -ExpandProperty Path) -match "node" -and
    (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -match "server.js"
}

if ($ExistingProcess) {
    Write-Host "`nProxy server is already running (PID: $($ExistingProcess.Id))" -ForegroundColor Yellow
    Write-Host "To stop it, run: Stop-Process -Id $($ExistingProcess.Id)" -ForegroundColor Cyan
} else {
    # Start the server in background
    $Process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $ProxyPath -WindowStyle Hidden -PassThru
    
    Write-Host "`nProxy server started successfully!" -ForegroundColor Green
    Write-Host "  Process ID: $($Process.Id)" -ForegroundColor Cyan
    Write-Host "  URL: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "`nTo stop the server, run:" -ForegroundColor Yellow
    Write-Host "  Stop-Process -Id $($Process.Id)" -ForegroundColor Cyan
    
    # Wait a moment and test
    Start-Sleep -Seconds 2
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "`nHealth check: OK" -ForegroundColor Green
    } catch {
        Write-Host "`nWarning: Could not verify server health" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host "`nNote: You may need to restart VS Code/applications to use the new environment variables." -ForegroundColor Yellow
