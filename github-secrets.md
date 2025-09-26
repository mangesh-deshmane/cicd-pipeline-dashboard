# GitHub Repository Secrets Configuration

## Required Secrets for GitHub Actions

Add these secrets in your GitHub repository:
Settings → Secrets and variables → Actions → New repository secret

### 1. DASHBOARD_WEBHOOK_URL
- **Value**: https://your-public-url/api/webhook/github-actions
- **Description**: Public URL where your dashboard backend is accessible
- **Note**: Use ngrok or cloudflared to expose localhost:8000

### 2. DASHBOARD_WRITE_KEY
- **Value**: 9a3c36b306c1b103c43dc3664dcd5a35
- **Description**: Authentication token for webhook requests
- **Note**: Must match WRITE_KEY in your dashboard .env file

## How to Set Up:

1. Install ngrok: `brew install ngrok` (macOS) or download from ngrok.com
2. Expose your dashboard: `ngrok http 8000`
3. Copy the https URL (e.g., https://abcd-1234.ngrok-free.app)
4. Add the secrets in GitHub with the full webhook URL
5. Test with a commit/push to trigger the workflow

## Current Configuration:
- WRITE_KEY: 9a3c36b306c1b103c43dc3664dcd5a35
- SECRET_KEY: e024c8e49d1b46367f8907a81581c8261493426a6df3e0f5ba2d4f47c9145306
- GitHub Secret: 2731060a626c0fe2c97fae94ca770fdc
