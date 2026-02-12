#!/bin/bash
# Install macOS LaunchAgent for CopilotProxy
# This makes the proxy start automatically on login

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY_PATH="$(cd "$SCRIPT_DIR/../.." && pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
    echo "\033[31mError: Node.js not found. Install it with: brew install node\033[0m"
    exit 1
fi

echo "\033[32mInstalling CopilotProxy LaunchAgent...\033[0m"
echo "  Node: $NODE_PATH"
echo "  Proxy: $PROXY_PATH"

# --- Proxy LaunchAgent ---
cat > ~/Library/LaunchAgents/com.copilot.proxy.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.copilot.proxy</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$PROXY_PATH/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROXY_PATH</string>
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

# --- Environment Variables LaunchAgent ---
cat > ~/Library/LaunchAgents/com.copilot.proxy.env.plist << EOF
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

# Load LaunchAgents
launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.copilot.proxy.env.plist 2>/dev/null

echo ""
echo "\033[32mLaunchAgents installed and loaded!\033[0m"
echo "  Proxy: ~/Library/LaunchAgents/com.copilot.proxy.plist"
echo "  Env:   ~/Library/LaunchAgents/com.copilot.proxy.env.plist"
echo ""
echo "The proxy will now start automatically on login."
echo ""
echo "\033[33mManagement:\033[0m"
echo "  Stop:    launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.plist"
echo "  Start:   launchctl load ~/Library/LaunchAgents/com.copilot.proxy.plist"
echo "  Logs:    cat /tmp/copilot-proxy.log"
echo "  Errors:  cat /tmp/copilot-proxy.error.log"
