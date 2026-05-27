set -euo pipefail

echo "Checking WSL runtime..."
command -v node || true
command -v npm || true

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node via nvm..."
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
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
