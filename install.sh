#!/bin/bash
# Poseidon Installer — bootstraps prerequisites and runs the interactive setup
# Usage: bash install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║   Poseidon — Personal AI Infrastructure         ║"
echo "  ║   Bootstrap Installer                            ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# --- Detect OS ---
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)
      [ -f /etc/debian_version ] && echo "debian" && return
      [ -f /etc/fedora-release ] && echo "fedora" && return
      [ -f /etc/arch-release ] && echo "arch" && return
      echo "linux"
      ;;
    *) echo "unknown" ;;
  esac
}

OS=$(detect_os)

# --- Check and install bun ---
if command -v bun &>/dev/null; then
  BUN_VER=$(bun --version 2>/dev/null || echo "unknown")
  echo "  ✓ bun ($BUN_VER) already installed"
else
  echo "  ✗ bun not found — installing..."
  curl -fsSL https://bun.sh/install | bash
  # Source the new PATH
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  if command -v bun &>/dev/null; then
    echo "  ✓ bun installed successfully ($(bun --version))"
  else
    echo "  ✗ bun installation failed. Install manually: https://bun.sh"
    exit 1
  fi
fi

# --- Check git ---
if command -v git &>/dev/null; then
  echo "  ✓ git ($(git --version | grep -oP '\d+\.\d+\.\d+'))"
else
  echo "  ✗ git not found — installing..."
  case "$OS" in
    macos)  brew install git ;;
    debian) sudo apt-get install -y git ;;
    fedora) sudo dnf install -y git ;;
    arch)   sudo pacman -S --noconfirm git ;;
    *)      echo "  Please install git manually"; exit 1 ;;
  esac
  echo "  ✓ git installed"
fi

# --- Check age (optional) ---
if command -v age &>/dev/null; then
  echo "  ✓ age ($(age --version 2>/dev/null | head -1 || echo "installed"))"
else
  echo "  ⚠ age not found (optional — for secret encryption)"
  read -p "  Install age? (y/N): " INSTALL_AGE
  if [[ "$INSTALL_AGE" =~ ^[Yy] ]]; then
    case "$OS" in
      macos)  brew install age ;;
      debian) sudo apt-get install -y age ;;
      fedora) sudo dnf install -y age ;;
      arch)   sudo pacman -S --noconfirm age ;;
      *)      echo "  See https://age-encryption.org for install instructions" ;;
    esac
    command -v age &>/dev/null && echo "  ✓ age installed"
  fi
fi

# --- Check claude code (optional but recommended) ---
if command -v claude &>/dev/null; then
  echo "  ✓ claude-code installed"
else
  echo "  ⚠ claude-code not found"
  if command -v npm &>/dev/null; then
    read -p "  Install claude-code via npm? (y/N): " INSTALL_CLAUDE
    if [[ "$INSTALL_CLAUDE" =~ ^[Yy] ]]; then
      npm install -g @anthropic-ai/claude-code
      echo "  ✓ claude-code installed"
    fi
  else
    echo "  Install later: npm install -g @anthropic-ai/claude-code"
  fi
fi

echo ""
echo "  Prerequisites done. Starting Poseidon setup..."
echo ""

# --- Run the interactive installer via bun ---
exec bun "$SCRIPT_DIR/tools/init.ts"
