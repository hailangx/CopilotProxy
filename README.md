# GitHub Models API Proxy

A cross-platform proxy server that exposes GitHub Models API as both **OpenAI-compatible** and **Anthropic-compatible** endpoints. Works with any app that supports OpenAI or Anthropic APIs — including Claude Code, Cursor, Continue, Open WebUI, and more.

## How It Works

```
Any OpenAI-compatible app  →  Proxy (localhost:8080)  →  GitHub Models API
(OpenAI format)                (pass-through + auth)     (GPT-4o, DeepSeek, etc.)

Claude Code                →  Proxy (localhost:8080)  →  GitHub Models API
(Anthropic format)             (translates format)       (GPT-4o, etc.)
```

## Features

- **OpenAI-compatible** `/v1/chat/completions` endpoint for any app
- **Anthropic-compatible** `/v1/messages` endpoint for Claude Code
- Streaming and non-streaming support
- Full tool/function calling pass-through
- Model name mapping (Claude model names → GitHub models)
- Access to all GitHub Models (GPT-4o, DeepSeek-R1, Phi-4, Mistral, etc.)
- Token counting endpoint support
- Auto-caps `max_tokens` to GitHub's 16384 limit
- **Cross-platform**: macOS and Windows support with platform-specific scripts

---

## Quick Setup

### Prerequisites

- **Node.js 18+**
- **GitHub Personal Access Token** with **Models → Read** permission

### 1. Get a GitHub Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens) (fine-grained)
2. Under **Account permissions**, enable **"Models" → Read** access
3. Copy the token (starts with `github_pat_...`)

### 2. Clone and Install

```bash
git clone https://github.com/hailangx/CopilotProxy.git
cd CopilotProxy
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your GitHub token:

```env
GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE
PORT=8080
GITHUB_API_URL=https://models.inference.ai.azure.com
```

### 4. Platform-Specific Setup

Choose your platform:

| Platform | Setup Guide | Scripts |
|----------|-------------|---------|
| **macOS** | [docs/setup-macos.md](docs/setup-macos.md) | `scripts/macos/` |
| **Windows** | [docs/setup-windows.md](docs/setup-windows.md) | `scripts/windows/` |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | OpenAI-compatible (any app) |
| `/v1/messages` | POST | Anthropic Messages API (Claude Code) |
| `/v1/messages/count_tokens` | POST | Token counting (estimated) |
| `/v1/models` | GET | List available models |
| `/v1/models/:model` | GET | Model info |
| `/health` | GET | Health check |

## Model Mapping

When you use Claude models, they're automatically mapped to GitHub models:

| Claude Model | GitHub Model |
|--------------|--------------|
| claude-3-5-sonnet-* | gpt-4o |
| claude-sonnet-4-* | gpt-4o |
| claude-opus-4-* | gpt-4o |
| claude-3-opus-* | gpt-4o |
| claude-3-sonnet-* | gpt-4o |
| claude-3-haiku-* | gpt-4o-mini |

Customize in `lib/model-map.js`.

## Using with OpenAI-compatible Apps

Set these environment variables in any app that supports the OpenAI API:

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

## Testing the Proxy

```bash
# Health check
curl http://localhost:8080/health

# Test OpenAI endpoint
curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'

# Test Anthropic endpoint
curl -s -X POST http://localhost:8080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-latest","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

## Project Structure

```
CopilotProxy/
├── server.js                  # Main entry point
├── lib/
│   ├── proxy.js               # GitHub API proxy logic
│   ├── anthropic-converter.js # Anthropic ↔ OpenAI format conversion
│   └── model-map.js           # Model name mapping
├── routes/
│   ├── openai.js              # /v1/chat/completions
│   ├── anthropic.js           # /v1/messages
│   └── models.js              # /v1/models
├── scripts/
│   ├── macos/                 # macOS scripts (.sh)
│   │   ├── start-proxy.sh
│   │   ├── start-proxy-background.sh
│   │   ├── stop-proxy.sh
│   │   ├── patch-claude-config.sh
│   │   ├── install-launchagent.sh
│   │   └── uninstall-launchagent.sh
│   └── windows/               # Windows scripts (.ps1)
│       ├── start-proxy.ps1
│       ├── start-proxy-background.ps1
│       ├── stop-proxy.ps1
│       ├── patch-claude-config.ps1
│       ├── install-autostart.ps1
│       └── uninstall-autostart.ps1
├── docs/
│   ├── setup-macos.md         # macOS setup guide
│   └── setup-windows.md       # Windows setup guide
├── tests/
│   ├── unit-anthropic-converter.test.js
│   ├── unit-model-map.test.js
│   └── integration.test.js
├── .env.example
└── package.json
```

## Troubleshooting

### "GITHUB_TOKEN not configured"
Make sure `.env` file exists with a valid `GITHUB_TOKEN`.

### "models permission required" (401 error)
Your GitHub token needs **Models → Read** permission. Regenerate or edit the token at [GitHub Settings](https://github.com/settings/tokens).

### "max_tokens is too large"
The proxy auto-caps at 16384. If you still see this, restart the proxy.

### Claude Code shows login screen
1. Verify env vars are set (see platform-specific guide)
2. Run the `patch-claude-config` script for your platform
3. **Restart VS Code completely** (close all windows)

### Connection refused
Ensure the proxy is running: `curl http://localhost:8080/health`

## Key Gotchas

1. **API key format**: The `ANTHROPIC_API_KEY` must start with `sk-ant-` — Claude Code validates the prefix
2. **Token permissions**: GitHub PAT needs `models` read access
3. **max_tokens**: GitHub Models API caps at 16384 (proxy handles this)
4. **Interactive mode**: Requires `~/.claude.json` config patches (use the `patch-claude-config` script)
5. **Environment variables**: Restart VS Code after setting them — it reads env vars at launch

## License

MIT
