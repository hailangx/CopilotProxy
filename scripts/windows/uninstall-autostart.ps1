# Uninstall Windows Scheduled Task for CopilotProxy
# Removes the auto-start on login

Write-Host "Removing CopilotProxy auto-start task..." -ForegroundColor Yellow

try {
    Unregister-ScheduledTask -TaskName "CopilotProxy" -Confirm:$false -ErrorAction Stop
    Write-Host "Scheduled task removed. Proxy will no longer auto-start on login." -ForegroundColor Green
} catch {
    Write-Host "No scheduled task found (may not have been installed)." -ForegroundColor Yellow
}
