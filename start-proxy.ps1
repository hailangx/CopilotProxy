# Start CopilotProxy Server
# This script starts the proxy server and sets up environment variables for Claude

Write-Host "Starting CopilotProxy Server..." -ForegroundColor Green

# Set the working directory
Set-Location -Path "C:\src\copilot-proxy"

# Set environment variables for Claude
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "http://localhost:8080", "User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-proxy00000000000000000000000000000000000000000000", "User")

# Set for current session
$env:ANTHROPIC_BASE_URL = "http://localhost:8080"
$env:ANTHROPIC_API_KEY = "sk-ant-proxy00000000000000000000000000000000000000000000"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  ANTHROPIC_BASE_URL: $env:ANTHROPIC_BASE_URL" -ForegroundColor Cyan
Write-Host "  ANTHROPIC_API_KEY: $env:ANTHROPIC_API_KEY" -ForegroundColor Cyan

# Start the server
Write-Host "`nStarting server on port 8080..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
npm start
