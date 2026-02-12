#!/bin/bash
# Uninstall macOS LaunchAgent for CopilotProxy

echo "\033[33mRemoving CopilotProxy LaunchAgents...\033[0m"

launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.copilot.proxy.env.plist 2>/dev/null

rm -f ~/Library/LaunchAgents/com.copilot.proxy.plist
rm -f ~/Library/LaunchAgents/com.copilot.proxy.env.plist

echo "\033[32mLaunchAgents removed. Proxy will no longer auto-start on login.\033[0m"
