#!/bin/bash
set -euo pipefail

# ============================================================================
# Dotfiles Setup Script
# Sets up a fresh macOS or Linux machine with all required dependencies
# and symlinks configuration files using GNU Stow.
# ============================================================================

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

info() { echo -e "  \033[38;5;252m $*\033[0m"; }
success() { echo -e "  \033[32m\033[1m 󰌶 $*\033[0m"; }
warn() { echo -e "  \033[38;5;137m 󰀪 $*\033[0m"; }
error() { echo -e "  \033[31m\033[1m  $*\033[0m"; }

link() {
  mkdir -p "$(dirname "$2")"
  if [ -L "$2" ]; then
    ln -sfn "$1" "$2"
  elif [ -e "$2" ]; then
    warn "Skipping $2, real file exists (move it aside to link)."
  else
    ln -s "$1" "$2"
    success "Linked $1 → $2"
  fi
}

command_exists() {
  command -v "$1" &>/dev/null
}

# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------

detect_platform() {
  case "$OSTYPE" in
    darwin*)
      PLATFORM="macos"
      ;;
    linux*)
      PLATFORM="linux"
      if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO="${ID:-unknown}"
      else
        DISTRO="unknown"
      fi
      ;;
    *)
      error "Unsupported platform: $OSTYPE"
      exit 1
      ;;
  esac
  info "Platform: $PLATFORM${DISTRO:+ ($DISTRO)}"
}

# ---------------------------------------------------------------------------
# Package installation
# ---------------------------------------------------------------------------

install_packages_macos() {
  if ! command_exists brew; then
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi

  info "Installing packages from Brewfile..."
  brew bundle --file="$DOTFILES_DIR/Brewfile"
  success "Homebrew packages installed"
}

install_packages_linux() {
  # Install Homebrew for Linux if not present
  if ! command_exists brew; then
    info "Installing Homebrew for Linux..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
  else
    info "Homebrew already installed"
  fi

  info "Installing packages from Brewfile..."
  brew bundle --file="$DOTFILES_DIR/Brewfile" --no-lock
  success "All packages installed via Homebrew"
}

install_nerd_font() {
  if fc-list 2>/dev/null | grep -qi "JetBrainsMono Nerd Font"; then
    info "JetBrains Mono Nerd Font already installed"
    return
  fi

  if [ "$PLATFORM" = "macos" ]; then
    info "Installing JetBrains Mono Nerd Font via Homebrew..."
    brew install --cask font-jetbrains-mono-nerd-font 2>/dev/null || warn "Font already installed or brew cask failed"
  else
    info "Installing JetBrains Mono Nerd Font..."
    local FONT_DIR="$HOME/.local/share/fonts"
    mkdir -p "$FONT_DIR"
    curl -fLo /tmp/JetBrainsMono.zip \
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip"
    unzip -o /tmp/JetBrainsMono.zip -d "$FONT_DIR"
    fc-cache -f
    rm -f /tmp/JetBrainsMono.zip
  fi
  success "JetBrains Mono Nerd Font installed"
}

# ---------------------------------------------------------------------------
# Stow
# ---------------------------------------------------------------------------

stow_packages() {
  info "Symlinking dotfiles with Stow..."

  cd "$DOTFILES_DIR"

  # Stow .config contents as a single unit
  stow .config

  # Stow individual root-level dotfiles
  stow .tmux.conf
  stow .zshrc

  success "All dotfiles stowed"
}

# ---------------------------------------------------------------------------
# Tmux Plugin Manager (TPM)
# ---------------------------------------------------------------------------

setup_tmux() {
  local TPM_DIR="$HOME/.tmux/plugins/tpm"

  if [ -d "$TPM_DIR" ]; then
    info "TPM already installed, updating..."
    git -C "$TPM_DIR" pull --quiet
  else
    info "Installing TPM..."
    git clone https://github.com/tmux-plugins/tpm "$TPM_DIR"
  fi

  info "Installing tmux plugins via TPM..."
  "$TPM_DIR/bin/install_plugins" || warn "TPM plugin install failed — open tmux and press prefix + I"
  success "tmux plugins installed"
}

# ---------------------------------------------------------------------------
# Zsh Plugins
# ---------------------------------------------------------------------------

setup_zsh_plugins() {
  mkdir -p ~/.zsh

  if [ -d ~/.zsh/zsh-autosuggestions ]; then
    info "zsh-autosuggestions already installed, updating..."
    git -C ~/.zsh/zsh-autosuggestions pull --quiet
  else
    info "Cloning zsh-autosuggestions..."
    git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/zsh-autosuggestions
  fi

  if [ -d ~/.zsh/zsh-syntax-highlighting ]; then
    info "zsh-syntax-highlighting already installed, updating..."
    git -C ~/.zsh/zsh-syntax-highlighting pull --quiet
  else
    info "Cloning zsh-syntax-highlighting..."
    git clone https://github.com/zsh-users/zsh-syntax-highlighting ~/.zsh/zsh-syntax-highlighting
  fi

  success "Zsh plugins installed"
}

# ---------------------------------------------------------------------------
# Neovim
# ---------------------------------------------------------------------------

setup_neovim() {
  if ! command_exists nvim; then
    warn "Neovim not found — skipping plugin setup"
    return
  fi

  info "Installing Neovim plugins (headless)..."
  # The config uses vim.pack (nvim 0.12+ built-in package manager)
  # Open nvim briefly to trigger plugin downloads on first run
  nvim --headless -c "lua pcall(vim.pack.sync)" -c "qa" 2>/dev/null || \
    nvim --headless -c "lua for _, p in ipairs(vim.pack.list()) do if not p.installed then vim.pack.install(p.name) end end" -c "qa" 2>/dev/null || \
    warn "Neovim plugin install had issues — open nvim to retry"
  success "Neovim plugins installed"
}

# ---------------------------------------------------------------------------
# NVM + Node.js
# ---------------------------------------------------------------------------

setup_nvm() {
  local NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [ -d "$NVM_DIR" ] && [ -f "$NVM_DIR/nvm.sh" ]; then
    info "NVM already installed"
  else
    info "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi

  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  if command_exists nvm; then
    local NODE_VERSION
    NODE_VERSION=$(nvm ls | grep -oP 'v\K[0-9]+' | sort -rn | head -1)
    if [ -z "$NODE_VERSION" ]; then
      info "Installing Node.js LTS..."
      nvm install --lts
      nvm use --lts
      nvm alias default "lts/*"
    else
      info "Node.js v$NODE_VERSION already installed"
    fi
    success "NVM + Node.js ready"
  else
    warn "NVM not loaded — open a new shell and run 'nvm install --lts'"
  fi
}

# ---------------------------------------------------------------------------
# pyenv + Python
# ---------------------------------------------------------------------------

setup_pyenv() {
  if command_exists pyenv; then
    info "pyenv already installed"
  else
    info "Installing pyenv..."
    brew install pyenv pyenv-virtualenv
  fi

  export PYENV_ROOT="$HOME/.pyenv"
  export PATH="$PYENV_ROOT/bin:$PATH"
  eval "$(pyenv init -)" 2>/dev/null || true

  if command_exists pyenv; then
    local PYTHON_VERSION
    PYTHON_VERSION=$(pyenv version-name 2>/dev/null || echo "")
    if [ -z "$PYTHON_VERSION" ] || [ "$PYTHON_VERSION" = "system" ]; then
      info "Installing latest stable Python..."
      pyenv install -l | grep -E '^\s*[0-9]+\.[0-9]+\.[0-9]+$' | tail -1 | xargs pyenv install
      local LATEST
      LATEST=$(pyenv versions --bare | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1)
      pyenv global "$LATEST"
    else
      info "Python $PYTHON_VERSION already set"
    fi

    # Enable pyenv-virtualenv if available
    if [ -d "$PYENV_ROOT/plugins/pyenv-virtualenv" ]; then
      eval "$(pyenv virtualenv-init -)" 2>/dev/null || true
    elif command_exists brew && brew list pyenv-virtualenv &>/dev/null; then
      eval "$(pyenv virtualenv-init -)" 2>/dev/null || true
    fi

    success "pyenv + Python ready"
  else
    warn "pyenv not loaded — open a new shell to complete setup"
  fi
}

# ---------------------------------------------------------------------------
# macOS: Set default shell
# ---------------------------------------------------------------------------

setup_default_shell() {
  if [ "$PLATFORM" = "macos" ]; then
    local CURRENT_SHELL
    CURRENT_SHELL=$(dscl . -read "/Users/$USER" UserShell 2>/dev/null | awk '{print $2}')
    if [ "$CURRENT_SHELL" != "$(which zsh)" ]; then
      info "Setting zsh as default shell..."
      if ! grep -q "$(which zsh)" /etc/shells; then
        info "Adding $(which zsh) to /etc/shells (may ask for sudo)..."
        which zsh | sudo tee -a /etc/shells
      fi
      chsh -s "$(which zsh)"
      success "Default shell set to zsh"
    else
      info "zsh is already the default shell"
    fi
  else
    local CURRENT_SHELL
    CURRENT_SHELL=$(getent passwd "$USER" | cut -d: -f7)
    if [ "$CURRENT_SHELL" != "$(which zsh)" ]; then
      info "Current shell is $CURRENT_SHELL"
      info "To set zsh as default, run: chsh -s $(which zsh)"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  echo ""
  info "Setting up dotfiles..."
  info "Dotfiles directory: $DOTFILES_DIR"
  echo ""

  detect_platform

  echo ""
  info "=== Installing dependencies ==="
  if [ "$PLATFORM" = "macos" ]; then
    install_packages_macos
  else
    install_packages_linux
  fi
  install_nerd_font

  echo ""
  info "=== Stowing dotfiles ==="
  stow_packages

  echo ""
  info "=== Post-setup initialization ==="
  setup_tmux
  setup_zsh_plugins
  setup_neovim
  setup_nvm
  setup_pyenv
  setup_default_shell

  echo ""
  success "All done! Open a new terminal to use your fresh setup."
  echo ""
}

main "$@"
