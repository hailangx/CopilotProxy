# macOS Setup Guide

Complete setup guide for running CopilotProxy on macOS.

## Prerequisites

- **Node.js 18+** — install via `brew install node`
- **GitHub Personal Access Token** — with **Models → Read** permission

## Step 1: Install & Configure

```bash
git clone https://github.com/hailangx/CopilotProxy.git
cd CopilotProxy
npm install
cp .env.example .env
```

Edit `.env` and add your GitHub token:

```env
GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
```

## Step 2: Start the Proxy

### Option A: Foreground (with logs visible)

```bash
./scripts/macos/start-proxy.sh
```

### Option B: Background (hidden process)

```bash
./scripts/macos/start-proxy-background.sh
```

### Option C: Just `npm start`

```bash
npm start
```

## Step 3: Set Environment Variables

The start scripts set these automatically via `launchctl setenv`, but you should also add them to your shell profile for terminal access.

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
export ANTHROPIC_BASE_URL=http://localhost:8080
export ANTHROPIC_API_KEY=sk-ant-proxy00000000000000000000000000000000000000000000
```

Then reload: `source ~/.zshrc`

> **Important:** The API key MUST start with `sk-ant-` — Claude Code validates the prefix. The actual value doesn't matter since the proxy uses your GitHub token.

## Step 4: Patch Claude Code Config

Run this **once** to configure Claude Code to work with the proxy without login prompts:

```bash
./scripts/macos/patch-claude-config.sh
```

## Step 5: Test

```bash
# Health check
curl http://localhost:8080/health

# Test Anthropic endpoint (what Claude Code uses)
curl -s -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-latest","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

# Test OpenAI endpoint
curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'
```

## Step 6: Auto-Start on Login (Optional)

Install a macOS LaunchAgent so the proxy starts automatically when you log in:

```bash
./scripts/macos/install-launchagent.sh
```

This creates two LaunchAgents:
- `com.copilot.proxy` — runs the proxy server
- `com.copilot.proxy.env` — sets environment variables for GUI apps

To remove auto-start:

```bash
./scripts/macos/uninstall-launchagent.sh
```

## Management Commands

| Action | Command |
|--------|---------|
| Start (foreground) | `./scripts/macos/start-proxy.sh` |
| Start (background) | `./scripts/macos/start-proxy-background.sh` |
| Stop | `./scripts/macos/stop-proxy.sh` |
| Health check | `curl http://localhost:8080/health` |
| View logs | `cat /tmp/copilot-proxy.log` |
| View errors | `cat /tmp/copilot-proxy.error.log` |

### If using LaunchAgent:

| Action | Command |
|--------|---------|
| Stop | `launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.plist` |
| Start | `launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist` |
| Restart | Stop + Start |

## Troubleshooting

### Proxy not responding

```bash
# Check if node is running
pgrep -f "node.*server.js"

# Restart
./scripts/macos/stop-proxy.sh
./scripts/macos/start-proxy-background.sh
```

### VS Code / Claude Code not connecting

1. Verify environment variables: `env | grep ANTHROPIC`
2. Run the patch script: `./scripts/macos/patch-claude-config.sh`
3. **Restart VS Code completely** (close all windows, reopen)

### Token issues

- Verify token in `.env` file
- Ensure token has **Models → Read** permission
- Token should start with `github_pat_`

### LaunchAgent not starting

```bash
# Check status
launchctl list | grep copilot

# Check logs
cat /tmp/copilot-proxy.log
cat /tmp/copilot-proxy.error.log

# Reload
launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.plist
launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist
```
