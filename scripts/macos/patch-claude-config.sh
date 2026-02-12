#!/bin/bash
# Patch Claude Code Configuration (macOS)
# This script configures Claude Code to work with the proxy

echo "\033[32mPatching Claude Code configuration...\033[0m"

CLAUDE_CONFIG="$HOME/.claude.json"
API_KEY="sk-ant-proxy00000000000000000000000000000000000000000000"

python3 << PYEOF
import json, os, time

config_path = os.path.expanduser("~/.claude.json")
api_key = "$API_KEY"

# Read existing config or create new
if os.path.exists(config_path):
    print("Reading existing Claude config...")
    with open(config_path) as f:
        config = json.load(f)
else:
    print("Creating new Claude config file...")
    config = {}

# Patch the configuration
print("Applying patches...")

config["customApiKeyResponses"] = {
    "approved": [api_key[-8:], api_key[-4:], api_key[-12:]],
    "rejected": []
}
config["hasCompletedOnboarding"] = True
config["oauthComplete"] = True
config["clientDataCache"] = {
    "data": {
        "accountStatus": {
            "membershipTier": "pro",
            "isApiUser": True,
            "hasActiveSubscription": True,
            "tierName": "API"
        },
        "billing": {
            "hasActiveSubscription": True
        }
    },
    "timestamp": int(time.time() * 1000)
}

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)

print(f"\nClaude config patched successfully!")
print(f"Location: {config_path}")
PYEOF

echo ""
echo "\033[33mNext steps:\033[0m"
echo "1. Restart VS Code completely (close all windows)"
echo "2. Open VS Code and try using Claude Code"
echo "3. You should see it working without login prompts"
