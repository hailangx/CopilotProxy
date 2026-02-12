# Install Windows Scheduled Task for CopilotProxy auto-start
# This makes the proxy start automatically on login

# Resolve the proxy root (two levels up from this script)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProxyPath = (Resolve-Path "$ScriptDir\..\..").Path
$BackgroundScript = Join-Path $ProxyPath "scripts\windows\start-proxy-background.ps1"

Write-Host "Installing CopilotProxy auto-start task..." -ForegroundColor Green
Write-Host "  Script: $BackgroundScript" -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$BackgroundScript`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

try {
    Register-ScheduledTask -TaskName "CopilotProxy" -Action $Action -Trigger $Trigger `
        -Settings $Settings -Description "Start CopilotProxy at login" -Force
    Write-Host "`nScheduled task installed successfully!" -ForegroundColor Green
    Write-Host "The proxy will start automatically on login." -ForegroundColor Cyan
} catch {
    Write-Host "`nFailed to install scheduled task: $_" -ForegroundColor Red
    Write-Host "You may need to run this script as Administrator." -ForegroundColor Yellow
}

Write-Host "`nTo remove auto-start:" -ForegroundColor Yellow
Write-Host "  .\scripts\windows\uninstall-autostart.ps1" -ForegroundColor Cyan
