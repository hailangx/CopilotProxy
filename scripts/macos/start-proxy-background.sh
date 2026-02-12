#!/bin/bash
# Start CopilotProxy Server in Background (macOS)
# This script starts the proxy server as a background process

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY_PATH="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "\033[32mStarting CopilotProxy Server in background...\033[0m"

# Set environment variables for Claude
launchctl setenv ANTHROPIC_BASE_URL "http://localhost:8080"
launchctl setenv ANTHROPIC_API_KEY "sk-ant-proxy00000000000000000000000000000000000000000000"
export ANTHROPIC_BASE_URL="http://localhost:8080"
export ANTHROPIC_API_KEY="sk-ant-proxy00000000000000000000000000000000000000000000"

echo "\033[33mEnvironment variables set (via launchctl - available to GUI apps):\033[0m"
echo "  ANTHROPIC_BASE_URL: http://localhost:8080"
echo "  ANTHROPIC_API_KEY:  sk-ant-proxy..."

# Check if server is already running
EXISTING_PID=$(pgrep -f "node.*server.js" 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
    echo ""
    echo "\033[33mProxy server is already running (PID: $EXISTING_PID)\033[0m"
    echo "To stop it, run: kill $EXISTING_PID"
    exit 0
fi

# Start the server in background
cd "$PROXY_PATH"
nohup node server.js > /tmp/copilot-proxy.log 2> /tmp/copilot-proxy.error.log &
SERVER_PID=$!

echo ""
echo "\033[32mProxy server started successfully!\033[0m"
echo "  Process ID: $SERVER_PID"
echo "  URL: http://localhost:8080"
echo "  Logs: /tmp/copilot-proxy.log"
echo "  Errors: /tmp/copilot-proxy.error.log"

# Wait a moment and test
sleep 2
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo ""
    echo "\033[32mHealth check: OK\033[0m"
else
    echo ""
    echo "\033[31mWarning: Could not verify server health\033[0m"
fi

echo ""
echo "\033[33mNote: You may need to restart VS Code/applications to use the new environment variables.\033[0m"
