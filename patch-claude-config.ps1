# Patch Claude Code Configuration
# This script configures Claude Code to work with the proxy

Write-Host "Patching Claude Code configuration..." -ForegroundColor Green

$ClaudeConfigPath = "$env:USERPROFILE\.claude.json"
$ApiKey = "sk-ant-proxy00000000000000000000000000000000000000000000"

# Check if config file exists
if (-not (Test-Path $ClaudeConfigPath)) {
    Write-Host "Creating new Claude config file..." -ForegroundColor Yellow
    $config = @{}
} else {
    Write-Host "Reading existing Claude config..." -ForegroundColor Yellow
    $config = Get-Content $ClaudeConfigPath -Raw | ConvertFrom-Json -AsHashtable
}

# Patch the configuration
Write-Host "Applying patches..." -ForegroundColor Cyan

# API key responses (marks onboarding as complete)
$config['customApiKeyResponses'] = @{
    'approved' = @($ApiKey.Substring($ApiKey.Length - 8), $ApiKey.Substring($ApiKey.Length - 4), $ApiKey.Substring($ApiKey.Length - 12))
    'rejected' = @()
}

# Onboarding and auth flags
$config['hasCompletedOnboarding'] = $true
$config['oauthComplete'] = $true

# Client data cache (simulates Pro subscription)
$config['clientDataCache'] = @{
    'data' = @{
        'accountStatus' = @{
            'membershipTier' = 'pro'
            'isApiUser' = $true
            'hasActiveSubscription' = $true
            'tierName' = 'API'
        }
        'billing' = @{
            'hasActiveSubscription' = $true
        }
    }
    'timestamp' = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

# Convert back to JSON and save
$jsonConfig = $config | ConvertTo-Json -Depth 10
Set-Content -Path $ClaudeConfigPath -Value $jsonConfig -Encoding UTF8

Write-Host "`nClaude config patched successfully!" -ForegroundColor Green
Write-Host "Location: $ClaudeConfigPath" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code completely (close all windows)" -ForegroundColor White
Write-Host "2. Open VS Code and try using Claude Code" -ForegroundColor White
Write-Host "3. You should see it working without login prompts" -ForegroundColor White
