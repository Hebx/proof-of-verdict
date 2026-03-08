# OpenCode on VPS with Amazon Bedrock

Install OpenCode on your VPS and use Amazon Bedrock models (Claude, etc.).

## Quick install on the VPS

```bash
cd /path/to/proof-of-verdict/scripts
./install-opencode-bedrock.sh
```

Optional env vars before running: `AWS_REGION` (default us-east-1), `AWS_PROFILE`, `OPENCODE_CONFIG_DIR`.

## Prerequisites

- Node.js 18+ (script uses nvm if available)
- Git
- AWS credentials: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` and `AWS_REGION`, or `AWS_PROFILE`, or `AWS_BEARER_TOKEN_BEDROCK`
- In AWS Bedrock console Model catalog: request access to the models you want

## After install

1. Set credentials: `export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1` or `export AWS_PROFILE=your-profile`
2. List models: `opencode models amazon-bedrock`
3. Run: `opencode` (TUI) or `opencode run "Your prompt"`

## Config

Global config: `~/.config/opencode/opencode.json`. Example:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1",
        "profile": "my-aws-profile"
      }
    }
  }
}
```

For VPC endpoints add `"endpoint": "https://bedrock-runtime.us-east-1.vpce-xxxxx.amazonaws.com"`.

## Headless

- API: `opencode serve --port 4096 --hostname 0.0.0.0`
- Web: `opencode web --port 4096 --hostname 0.0.0.0` (optional: `OPENCODE_SERVER_PASSWORD=secret`)

Docs: https://opencode.ai/docs/providers/ and https://opencode.ai/docs/cli/
