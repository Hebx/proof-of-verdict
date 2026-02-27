#!/usr/bin/env bash
# Install OpenCode on a VPS and configure it for Amazon Bedrock.
# Run on the VPS: bash install-opencode-bedrock.sh
# Prerequisites: AWS credentials (env vars or ~/.aws/credentials profile).

set -e

OPENCODE_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
OPENCODE_CONFIG="$OPENCODE_CONFIG_DIR/opencode.json"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-}"

echo "==> OpenCode + Amazon Bedrock setup"
echo "    Config dir: $OPENCODE_CONFIG_DIR"
echo "    AWS region: $AWS_REGION"
echo ""

# --- Node.js 18+ ---
if ! command -v node &>/dev/null; then
  echo "==> Node.js not found. Installing via nvm (recommended) or system..."
  if command -v nvm &>/dev/null || [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh" 2>/dev/null || true
  fi
  if command -v nvm &>/dev/null; then
    nvm install 18
    nvm use 18
  else
    echo "    Please install Node.js 18+ and re-run: https://nodejs.org/"
    echo "    Or: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && nvm install 18"
    exit 1
  fi
fi

NODE_VER=$(node -p "process.versions.node.split('.')[0]")
if [ "${NODE_VER:-0}" -lt 18 ]; then
  echo "==> Node.js 18+ required (current: $(node -v)). Upgrade and re-run."
  exit 1
fi
echo "==> Node.js: $(node -v) OK"

# --- Git ---
if ! command -v git &>/dev/null; then
  echo "==> Git not found. Install it (e.g. apt install git / yum install git) and re-run."
  exit 1
fi
echo "==> Git: $(git --version) OK"

# --- AWS CLI v2 ---
if command -v aws &>/dev/null; then
  echo "==> AWS CLI already installed: $(aws --version 2>/dev/null || echo 'unknown')"
else
  echo "==> Installing AWS CLI v2..."
  if ! command -v unzip &>/dev/null; then
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y unzip
    elif command -v yum &>/dev/null; then
      sudo yum install -y unzip
    else
      echo "    Install 'unzip' and re-run (e.g. apt install unzip / yum install unzip)."
      exit 1
    fi
  fi
  TMP_AWS="$(mktemp -d)"
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64)  AWS_ARCH="x86_64" ;;
    aarch64|arm64) AWS_ARCH="aarch64" ;;
    *) echo "    Unsupported arch: $ARCH. Install AWS CLI manually." ; exit 1 ;;
  esac
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "$TMP_AWS/awscliv2.zip"
  ( cd "$TMP_AWS" && unzip -q awscliv2.zip && sudo ./aws/install )
  rm -rf "$TMP_AWS"
  echo "==> AWS CLI installed."
fi
echo "==> AWS CLI: $(aws --version 2>/dev/null) OK"

# --- Install OpenCode ---
if command -v opencode &>/dev/null; then
  echo "==> OpenCode already installed: $(opencode --version 2>/dev/null || opencode -v 2>/dev/null || echo 'unknown')"
else
  echo "==> Installing OpenCode..."
  curl -fsSL https://opencode.ai/install | bash
  echo "==> OpenCode installed."
fi

# --- Config directory ---
mkdir -p "$OPENCODE_CONFIG_DIR"

# --- Bedrock config ---
# Use profile if provided, otherwise rely on env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_PROFILE).
BEDROCK_OPTIONS="\"region\": \"$AWS_REGION\""
[ -n "$AWS_PROFILE" ] && BEDROCK_OPTIONS="$BEDROCK_OPTIONS, \"profile\": \"$AWS_PROFILE\""

if [ -f "$OPENCODE_CONFIG" ]; then
  echo "==> Config already exists: $OPENCODE_CONFIG"
  echo "    Ensure it contains provider.amazon-bedrock with region (and optional profile)."
else
  echo "==> Writing OpenCode config for Amazon Bedrock: $OPENCODE_CONFIG"
  cat > "$OPENCODE_CONFIG" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "amazon-bedrock": {
      "options": {
        $BEDROCK_OPTIONS
      }
    }
  }
}
EOF
  echo "    Created. Edit region/profile as needed."
fi

echo ""
echo "==> Next steps"
echo "    1. AWS credentials (choose one):"
echo "       - Env: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=$AWS_REGION"
echo "       - Profile: aws configure --profile <name>   then set AWS_PROFILE=<name> or add \"profile\" in config"
echo "    2. In Amazon Bedrock console, request access to the models you want (Model catalog)."
echo "    3. Run: opencode models amazon-bedrock   # list Bedrock models"
echo "    4. Run: opencode   # TUI, or opencode run \"Your prompt\""
echo ""
echo "Done."
