#!/bin/bash
# Stop CopilotProxy Server (macOS)
# This script stops any running proxy server processes

echo "\033[33mStopping CopilotProxy Server...\033[0m"

# Find node processes running server.js
PIDS=$(pgrep -f "node.*server.js" 2>/dev/null)

if [ -n "$PIDS" ]; then
    for PID in $PIDS; do
        echo "Stopping process $PID..."
        kill "$PID" 2>/dev/null
    done
    echo "\033[32mProxy server stopped successfully!\033[0m"
else
    echo "\033[33mNo proxy server process found running.\033[0m"
fi
