# CopilotProxy Setup Instructions for Windows

## Setup Complete! ✅

The proxy has been cloned and configured. Follow these steps to complete the setup:

## 1. Get Your GitHub Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens?type=beta)
2. Click **"Generate new token"** (fine-grained personal access token)
3. Set a name like "CopilotProxy"
4. Under **Account permissions**, enable:
   - **Models** → **Read** access
5. Click **"Generate token"**
6. Copy the token (starts with `github_pat_...`)

## 2. Configure the Token

Edit the `.env` file in `C:\src\copilot-proxy\` and replace `YOUR_GITHUB_TOKEN_HERE` with your actual token:

```
GITHUB_TOKEN=github_pat_YOUR_ACTUAL_TOKEN_HERE
```

## 3. Start the Proxy

You have two options:

### Option A: Foreground (with logs visible)
```powershell
cd C:\src\copilot-proxy
.\start-proxy.ps1
```

### Option B: Background (hidden, auto-start)
```powershell
cd C:\src\copilot-proxy
.\start-proxy-background.ps1
```

This will:
- Set environment variables for Claude (`ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY`)
- Start the proxy server on http://localhost:8080
- Run in the background

## 4. Test the Proxy

```powershell
# Health check
curl http://localhost:8080/health

# Test OpenAI-compatible endpoint
curl -X POST http://localhost:8080/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"gpt-4o\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'

# Test Anthropic-compatible endpoint (for Claude)
curl -X POST http://localhost:8080/v1/messages `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"claude-3-5-sonnet-latest\",\"max_tokens\":100,\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'
```

## 5. Configure VS Code (Restart Required)

After starting the proxy, **restart VS Code** to pick up the environment variables.

The environment variables are already set:
- `ANTHROPIC_BASE_URL=http://localhost:8080`
- `ANTHROPIC_API_KEY=sk-ant-proxy00000000000000000000000000000000000000000000`

## 6. Management Commands

```powershell
# Stop the proxy
.\stop-proxy.ps1

# Start in background
.\start-proxy-background.ps1

# View server output (if running in foreground)
# Just check the terminal where you ran start-proxy.ps1
```

## Key Points

- ✅ The proxy translates between Anthropic format (Claude) and GitHub Models API
- ✅ Uses GitHub's free models tier (gpt-4o, DeepSeek-R1, etc.)
- ✅ Environment variables are set at User level (persist across sessions)
- ⚠️ You must restart VS Code after setting environment variables
- ⚠️ The ANTHROPIC_API_KEY must start with `sk-ant-` prefix (already configured)

## Model Mapping

When you use Claude models, they're automatically mapped to GitHub models:

| Claude Model | GitHub Model |
|-------------|-------------|
| claude-3-5-sonnet-* | gpt-4o |
| claude-sonnet-4-* | gpt-4o |
| claude-3-opus-* | gpt-4o |
| claude-3-haiku-* | gpt-4o-mini |

## Troubleshooting

### "GITHUB_TOKEN not configured"
Make sure you edited `.env` with your actual GitHub token.

### "models permission required" (401)
Your GitHub token needs Models → Read permission. Regenerate the token.

### Connection refused
Ensure the proxy is running: `curl http://localhost:8080/health`

### VS Code doesn't see the environment variables
Restart VS Code completely (close all windows).

## Auto-Start on Windows Boot (Optional)

To start the proxy automatically when Windows starts:

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `C:\src\copilot-proxy\start-proxy-background.ps1`
3. Right-click the shortcut → Properties
4. Set "Run" to "Minimized"

Or use Task Scheduler for more control:
```powershell
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -File C:\src\copilot-proxy\start-proxy-background.ps1"
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "CopilotProxy" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Start CopilotProxy at login"
```

To remove auto-start:
```powershell
Unregister-ScheduledTask -TaskName "CopilotProxy" -Confirm:$false
```
