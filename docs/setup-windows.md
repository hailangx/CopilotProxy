# Windows Setup Guide

Complete setup guide for running CopilotProxy on Windows.

## Prerequisites

- **Node.js 18+** — download from [nodejs.org](https://nodejs.org/) or install via `winget install OpenJS.NodeJS.LTS`
- **GitHub Personal Access Token** — with **Models → Read** permission

## Step 1: Install & Configure

```powershell
git clone https://github.com/hailangx/CopilotProxy.git
cd CopilotProxy
npm install
Copy-Item .env.example .env
```

Edit `.env` and add your GitHub token:

```env
GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
```

## Step 2: Start the Proxy

### Option A: Foreground (with logs visible)

```powershell
.\scripts\windows\start-proxy.ps1
```

### Option B: Background (hidden process)

```powershell
.\scripts\windows\start-proxy-background.ps1
```

### Option C: Just `npm start`

```powershell
npm start
```

> The start scripts automatically set the `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` environment variables at the User level.

## Step 3: Verify Environment Variables

The start scripts set these automatically, but you can verify:

```powershell
[System.Environment]::GetEnvironmentVariable("ANTHROPIC_BASE_URL", "User")
# Should return: http://localhost:8080

[System.Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY", "User")
# Should return: sk-ant-proxy...
```

> **Important:** The API key MUST start with `sk-ant-` — Claude Code validates the prefix. The actual value doesn't matter since the proxy uses your GitHub token.

## Step 4: Patch Claude Code Config

Run this **once** to configure Claude Code to work with the proxy without login prompts:

```powershell
.\scripts\windows\patch-claude-config.ps1
```

## Step 5: Restart VS Code

**You must completely restart VS Code** for it to pick up the new environment variables:

1. Close **all** VS Code windows
2. Reopen VS Code
3. Claude Code will now use the proxy automatically

## Step 6: Test

```powershell
# Health check
curl http://localhost:8080/health

# Test Anthropic endpoint (what Claude Code uses)
curl -X POST http://localhost:8080/v1/messages `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"claude-3-5-sonnet-latest\",\"max_tokens\":100,\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'

# Test OpenAI endpoint
curl -X POST http://localhost:8080/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{\"model\":\"gpt-4o\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'
```

## Step 7: Auto-Start on Login (Optional)

Install a Windows Scheduled Task so the proxy starts automatically when you log in:

```powershell
.\scripts\windows\install-autostart.ps1
```

To remove auto-start:

```powershell
.\scripts\windows\uninstall-autostart.ps1
```

## Management Commands

| Action | Command |
|--------|---------|
| Start (foreground) | `.\scripts\windows\start-proxy.ps1` |
| Start (background) | `.\scripts\windows\start-proxy-background.ps1` |
| Stop | `.\scripts\windows\stop-proxy.ps1` |
| Health check | `curl http://localhost:8080/health` |

## Troubleshooting

### Proxy not responding

```powershell
# Check if node is running
Get-Process -Name "node" -ErrorAction SilentlyContinue

# Restart
.\scripts\windows\stop-proxy.ps1
.\scripts\windows\start-proxy-background.ps1
```

### VS Code / Claude Code not connecting

1. Verify environment variables:
   ```powershell
   $env:ANTHROPIC_BASE_URL
   [System.Environment]::GetEnvironmentVariable("ANTHROPIC_BASE_URL", "User")
   ```
2. Run the patch script: `.\scripts\windows\patch-claude-config.ps1`
3. **Restart VS Code completely** (close all windows, reopen)

### "node is not recognized"

Node.js is not on your PATH. Either:
- Reinstall Node.js from [nodejs.org](https://nodejs.org/)
- Or add it to PATH: `$env:PATH += ";C:\Program Files\nodejs"`

### Token issues

- Verify token in `.env` file
- Ensure token has **Models → Read** permission
- Token should start with `github_pat_`

### PowerShell execution policy error

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Firewall blocking port 8080

If Windows Defender Firewall prompts, allow Node.js on private networks. Or use a different port by editing `PORT=` in `.env`.
