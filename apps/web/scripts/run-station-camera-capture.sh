#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$HOME/.nvm/nvm.sh"
nvm use 22 >/dev/null

cd "$APP_DIR"
npm run camera:capture
