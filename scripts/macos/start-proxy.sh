#!/bin/bash
# Start CopilotProxy Server (macOS)
# This script starts the proxy server and sets up environment variables for Claude

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY_PATH="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "\033[32mStarting CopilotProxy Server...\033[0m"

# Set environment variables for Claude (current session + shell profile)
export ANTHROPIC_BASE_URL="http://localhost:8080"
export ANTHROPIC_API_KEY="sk-ant-proxy00000000000000000000000000000000000000000000"

# Persist via launchctl (available to GUI apps like VS Code)
launchctl setenv ANTHROPIC_BASE_URL "http://localhost:8080"
launchctl setenv ANTHROPIC_API_KEY "sk-ant-proxy00000000000000000000000000000000000000000000"

echo "\033[33mEnvironment variables set:\033[0m"
echo "  ANTHROPIC_BASE_URL: $ANTHROPIC_BASE_URL"
echo "  ANTHROPIC_API_KEY:  $ANTHROPIC_API_KEY"

# Start the server
echo ""
echo "\033[32mStarting server on port 8080...\033[0m"
echo "\033[33mPress Ctrl+C to stop the server\033[0m"
cd "$PROXY_PATH"
npm start
