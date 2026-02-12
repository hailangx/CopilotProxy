# Start CopilotProxy Server (Windows)
# This script starts the proxy server and sets up environment variables for Claude

Write-Host "Starting CopilotProxy Server..." -ForegroundColor Green

# Resolve the proxy root (two levels up from this script)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProxyPath = (Resolve-Path "$ScriptDir\..\..").Path

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
Set-Location -Path $ProxyPath
Write-Host "`nStarting server on port 8080..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
npm start
