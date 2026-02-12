# CopilotProxy - Quick Start Guide

## ✅ Setup Status: COMPLETE

Your GitHub token is configured and the proxy is running!

## Current Status

- ✅ Proxy running on: http://localhost:8080
- ✅ GitHub Token: Configured
- ✅ Environment Variables: Set (User level - persists)
- ✅ Background Process: Active

## Environment Variables

These are now set at User level (persist across reboots):

```
ANTHROPIC_BASE_URL=http://localhost:8080
ANTHROPIC_API_KEY=sk-ant-proxy00000000000000000000000000000000000000000000
```

## Next Steps

### **IMPORTANT: Restart VS Code**

You must **completely restart VS Code** for it to pick up the new environment variables.

1. Close all VS Code windows
2. Reopen VS Code
3. Claude Code will now use the proxy automatically

**Note:** The Claude config file has already been patched to enable proxy usage without login prompts.

## Management Commands

```powershell
# Check if proxy is running
curl http://localhost:8080/health

# Stop the proxy
.\stop-proxy.ps1

# Start the proxy in background
.\start-proxy-background.ps1

# Start the proxy with visible logs
.\start-proxy.ps1
```

## Testing the Proxy

### Test Health
```powershell
curl http://localhost:8080/health
```

### Test OpenAI Endpoint
```powershell
curl -X POST http://localhost:8080/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"gpt-4o\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'
```

### Test Anthropic Endpoint (Claude)
```powershell
curl -X POST http://localhost:8080/v1/messages `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"claude-3-5-sonnet-latest\",\"max_tokens\":100,\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'
```

## How It Works

```
VS Code (Claude Code) → Proxy (localhost:8080) → GitHub Models API
     (Anthropic format)        (translates)          (GPT-4o, etc.)
```

- Claude Code sends requests in Anthropic format
- Proxy translates to GitHub Models API format
- Uses your GitHub token for authentication
- Free access to GitHub's AI models (gpt-4o, DeepSeek-R1, etc.)

## Model Mapping

When you use Claude in VS Code, it automatically maps to GitHub models:

| Claude Model | → | GitHub Model |
|-------------|---|-------------|
| claude-3-5-sonnet-* | → | gpt-4o |
| claude-sonnet-4-* | → | gpt-4o |
| claude-3-opus-* | → | gpt-4o |
| claude-3-haiku-* | → | gpt-4o-mini |

## Troubleshooting

### Proxy not responding
```powershell
# Check if it's running
Get-Process -Name "node" | Where-Object {
    (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -match "server.js"
}

# Restart it
.\stop-proxy.ps1
.\start-proxy-background.ps1
```

### VS Code still shows login screen
1. Verify environment variables: `$env:ANTHROPIC_BASE_URL`
2. **Restart VS Code completely** (close all windows)
3. Check proxy is running: `curl http://localhost:8080/health`

### Token issues
- Verify token in `.env` file
- Ensure token has **Models → Read** permission
- Token should start with `github_pat_`

## Auto-Start on Boot (Optional)

The proxy is currently running but won't start automatically on reboot. To enable auto-start:

```powershell
# Using Task Scheduler (recommended)
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -File C:\src\copilot-proxy\start-proxy-background.ps1"
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "CopilotProxy" -Action $Action -Trigger $Trigger `
    -Settings $Settings -Description "Start CopilotProxy at login"
```

To remove auto-start:
```powershell
Unregister-ScheduledTask -TaskName "CopilotProxy" -Confirm:$false
```

## Files Reference

- `.env` - Configuration (contains your GitHub token)
- `start-proxy-background.ps1` - Start in background
- `patch-claude-config.ps1` - Patch Claude config (already run)
- `start-proxy.ps1` - Start with logs visible
- `stop-proxy.ps1` - Stop the proxy
- `setup-instructions.md` - Detailed documentation
- `QUICK-START.md` - This file
