# GitHub Models API Proxy

A generic proxy server that exposes GitHub Models API as an **OpenAI-compatible** endpoint. Any app or tool that supports the OpenAI API format can use this proxy to access models through GitHub. Also includes an Anthropic-compatible endpoint for Claude Code.

## How It Works

```
Any OpenAI-compatible app  →  Proxy (localhost:8080)  →  GitHub Models API
(OpenAI format)                (pass-through + auth)     (GPT-4o, DeepSeek, etc.)

Claude Code                →  Proxy (localhost:8080)  →  GitHub Models API
(Anthropic format)             (translates format)       (GPT-4o, etc.)
```

### OpenAI-compatible apps (Cursor, Continue, Open WebUI, etc.)
- App sends standard `/v1/chat/completions` requests
- Proxy adds GitHub auth and forwards directly
- Responses pass through as-is (already OpenAI format)

### Claude Code
- Sends requests in Anthropic Messages API format
- Proxy translates to OpenAI/GitHub format and back

## Features

- **OpenAI-compatible** `/v1/chat/completions` endpoint for any app
- **Anthropic-compatible** `/v1/messages` endpoint for Claude Code
- Streaming and non-streaming support
- Full tool/function calling pass-through
- Model name mapping (Claude model names → GitHub models)
- Access to all GitHub Models (GPT-4o, DeepSeek-R1, Phi-4, Mistral, etc.)
- Token counting endpoint support
- Auto-caps `max_tokens` to GitHub's 16384 limit
- Auto-start on macOS login via LaunchAgent

---

## Full Setup Guide (macOS)

### Step 1: Prerequisites

- **Node.js 18+** (install via `brew install node`)
- **GitHub Personal Access Token** with `models` permission

### Step 2: Get a GitHub Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** (fine-grained)
3. Under **Account permissions**, enable **"Models" → Read** access
4. Copy the token (starts with `github_pat_...`)

### Step 3: Clone and Install

```bash
cd /Volumes/App/Vibe/copilot-proxy
npm install
```

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
PORT=8080
GITHUB_API_URL=https://models.inference.ai.azure.com
```

### Step 5: Test the Proxy

```bash
npm start
```

In another terminal:

```bash
curl -s http://localhost:8080/health
# Should return: {"status":"ok","timestamp":"..."}

# Test OpenAI-compatible endpoint
curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'

# Test Anthropic-compatible endpoint (for Claude Code)
curl -s -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-latest","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

### Using with OpenAI-compatible apps

Set these environment variables in any app that supports OpenAI API:

```bash
OPENAI_API_BASE=http://localhost:8080/v1
OPENAI_API_KEY=anything          # not validated, but some apps require it
```

Or in Python (openai SDK):

```python
import openai
client = openai.OpenAI(base_url="http://localhost:8080/v1", api_key="dummy")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Step 6: Configure Auto-Start (macOS LaunchAgent)

Create the LaunchAgent plist:

```bash
cat > ~/Library/LaunchAgents/com.copilot.proxy.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.copilot.proxy</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/Volumes/App/Vibe/copilot-proxy/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Volumes/App/Vibe/copilot-proxy</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/copilot-proxy.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/copilot-proxy.error.log</string>
</dict>
</plist>
EOF
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist
```

> **Note:** Adjust the `node` path (`/opt/homebrew/bin/node`) and project path if yours differs. Find your node path with `which node`.

### Step 7: Set Environment Variables for System-Wide Access

Create the env LaunchAgent to persist env vars across reboots:

```bash
cat > ~/Library/LaunchAgents/com.copilot.proxy.env.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.copilot.proxy.env</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>launchctl setenv ANTHROPIC_BASE_URL http://localhost:8080; launchctl setenv ANTHROPIC_API_KEY sk-ant-proxy00000000000000000000000000000000000000000000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.copilot.proxy.env.plist
```

Also set them immediately:

```bash
launchctl setenv ANTHROPIC_BASE_URL http://localhost:8080
launchctl setenv ANTHROPIC_API_KEY sk-ant-proxy00000000000000000000000000000000000000000000
```

### Step 8: Configure Shell (`.zshrc`)

Add to `~/.zshrc`:

```bash
export ANTHROPIC_BASE_URL=http://localhost:8080
export ANTHROPIC_API_KEY=sk-ant-proxy00000000000000000000000000000000000000000000
```

> **Important:** The API key MUST start with `sk-ant-` prefix. Claude Code validates this format before making any API calls. The actual value doesn't matter since the proxy uses its own GitHub token.

### Step 9: Configure Claude Code for Interactive Mode

Claude Code's interactive mode requires onboarding/auth to be marked as complete. Run this script **once**:

```bash
python3 << 'PYEOF'
import json, time

with open('/Users/YOUR_USERNAME/.claude.json') as f:
    d = json.load(f)

api_key = 'sk-ant-proxy00000000000000000000000000000000000000000000'
d['customApiKeyResponses'] = {
    'approved': [api_key[-8:], api_key[-4:], api_key[-12:]],
    'rejected': []
}
d['hasCompletedOnboarding'] = True
d['oauthComplete'] = True
d['clientDataCache'] = {
    'data': {
        'accountStatus': {
            'membershipTier': 'pro',
            'isApiUser': True,
            'hasActiveSubscription': True,
            'tierName': 'API'
        },
        'billing': {
            'hasActiveSubscription': True
        }
    },
    'timestamp': int(time.time() * 1000)
}

with open('/Users/YOUR_USERNAME/.claude.json', 'w') as f:
    json.dump(d, f, indent=2)

print('Config updated')
PYEOF
```

> Replace `YOUR_USERNAME` with your actual username (e.g., `macmini`).

### Step 10: Verify Everything Works

```bash
# Test non-interactive mode
claude -p "say hello"

# Test interactive mode
claude
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/messages` | POST | Anthropic Messages API (main endpoint) |
| `/v1/messages/count_tokens` | POST | Token counting (estimated) |
| `/v1/models` | GET | List available models |
| `/v1/models/:model` | GET | Model info |
| `/health` | GET | Health check |

## Model Mapping

| Claude Model | GitHub Model |
|--------------|--------------|
| claude-3-5-sonnet-* | gpt-4o |
| claude-3-opus-* | gpt-4o |
| claude-3-sonnet-* | gpt-4o |
| claude-3-haiku-* | gpt-4o-mini |
| claude-sonnet-4-* | gpt-4o |
| claude-opus-4-* | gpt-4o |

Customize in `server.js` under `MODEL_MAP`.

## Management Commands

| Action | Command |
|--------|---------|
| Check proxy status | `curl http://localhost:8080/health` |
| View logs | `cat /tmp/copilot-proxy.log` |
| View errors | `cat /tmp/copilot-proxy.error.log` |
| Stop proxy | `launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.plist` |
| Start proxy | `launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist` |
| Restart proxy | `launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.plist && launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist` |

## Troubleshooting

### "GITHUB_TOKEN not configured"
Make sure `.env` file exists with a valid `GITHUB_TOKEN`.

### "models permission required" (401 error)
Your GitHub token needs **Models → Read** permission. Regenerate or edit the token at [GitHub Settings](https://github.com/settings/tokens).

### "max_tokens is too large"
The proxy auto-caps at 16384. If you still see this, restart the proxy.

### Claude Code shows login screen
1. Verify env vars: `env | grep ANTHROPIC`
2. Re-run the Step 9 config script
3. Open a new terminal and try again

### Connection refused
Ensure the proxy is running: `curl http://localhost:8080/health`

## Key Gotchas

1. **API key format**: Must start with `sk-ant-` — Claude Code validates the prefix
2. **Token permissions**: GitHub PAT needs `models` read access
3. **max_tokens**: GitHub Models API caps at 16384 (proxy handles this)
4. **Interactive mode**: Requires `~/.claude.json` config patches (Step 9)
5. **VS Code terminals**: Need `launchctl setenv` for env vars to propagate

## License

MIT
