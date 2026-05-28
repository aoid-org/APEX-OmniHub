set -euo pipefail

echo "Checking WSL runtime..."
command -v node || true
command -v npm || true

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node via nvm..."
  export NVM_DIR="$HOME/.nvm"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    INSTALL_SCRIPT=$(mktemp)
    curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh -o "$INSTALL_SCRIPT"
    EXPECTED_HASH="2d8359a64a3cb07c02389ad88ceecd43f2fa469c06104f92f98df5b6f315275f"
    ACTUAL_HASH=$(sha256sum "$INSTALL_SCRIPT" | awk '{print $1}')
    if [[ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]]; then
      echo "CRITICAL ERROR: Subresource Integrity Check Failed for nvm install script!" >&2
      rm -f "$INSTALL_SCRIPT"
      exit 1
    fi
    bash "$INSTALL_SCRIPT"
    rm -f "$INSTALL_SCRIPT"
  fi

  . "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
else
  echo "Node already installed"
fi

node -v
npm -v
