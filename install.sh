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
  brew bundle --file="$DOTFILES_DIR/Brewfile"
  success "All packages installed via Homebrew"
}

# The font is only rendered by a local terminal emulator. On a headless box
# you SSH into, glyphs are drawn by the client machine's terminal, so the
# font is useless there. Override detection with INSTALL_NERD_FONT=1 or =0.
has_gui() {
  case "${INSTALL_NERD_FONT:-}" in
    1|true|yes) return 0 ;;
    0|false|no) return 1 ;;
  esac

  # macOS always has a desktop, even when this script runs over SSH.
  [ "$PLATFORM" = "macos" ] && return 0

  # A running graphical session (covers running the script inside it).
  if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ] || \
    [ -n "${XDG_CURRENT_DESKTOP:-}" ]; then
    return 0
  fi

  # A desktop machine reached over SSH: it boots into a graphical target.
  if command_exists systemctl && \
    [ "$(systemctl get-default 2>/dev/null)" = "graphical.target" ]; then
    return 0
  fi

  return 1
}

nerd_font_installed() {
  local dirs=()
  if [ "$PLATFORM" = "macos" ]; then
    dirs=("$HOME/Library/Fonts" /Library/Fonts)
  else
    # Not `fc-list | grep -q`: grep exits on the first match, fc-list gets
    # SIGPIPE, and pipefail turns that into a failure.
    if command_exists fc-list && \
      grep -qi "JetBrainsMono Nerd Font" <(fc-list 2>/dev/null); then
      return 0
    fi
    dirs=("$HOME/.local/share/fonts" "$HOME/.fonts" /usr/local/share/fonts /usr/share/fonts)
  fi

  local dir
  for dir in "${dirs[@]}"; do
    [ -d "$dir" ] || continue
    if [ -n "$(find "$dir" -iname 'JetBrainsMonoNerdFont*' -print -quit 2>/dev/null)" ]; then
      return 0
    fi
  done
  return 1
}

install_nerd_font() {
  if ! has_gui; then
    info "No GUI detected - skipping JetBrains Mono Nerd Font (INSTALL_NERD_FONT=1 to force)"
    return
  fi

  if nerd_font_installed; then
    info "JetBrains Mono Nerd Font already installed"
    return
  fi

  if [ "$PLATFORM" = "macos" ]; then
    info "Installing JetBrains Mono Nerd Font via Homebrew..."
    if ! brew install --cask font-jetbrains-mono-nerd-font; then
      warn "Font install via Homebrew failed"
      return
    fi
  else
    if ! command_exists unzip; then
      warn "unzip not found - skipping JetBrains Mono Nerd Font install"
      return
    fi
    info "Installing JetBrains Mono Nerd Font..."
    local FONT_DIR="$HOME/.local/share/fonts/JetBrainsMonoNerdFont"
    local ZIP="${TMPDIR:-/tmp}/JetBrainsMono.$$.zip"
    mkdir -p "$FONT_DIR"
    if ! curl -fLo "$ZIP" \
      "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip"; then
      rm -f "$ZIP"
      warn "Font download failed"
      return
    fi
    unzip -oq "$ZIP" '*.ttf' -d "$FONT_DIR"
    rm -f "$ZIP"
    command_exists fc-cache && fc-cache -f "$FONT_DIR"
  fi
  success "JetBrains Mono Nerd Font installed"
}

# Where pi's official installer puts the `pi` binary. Keep in sync with the
# PATH entry in home/.zshrc.
PI_BIN_DIR="$HOME/.pi/agent/bin"

install_pi() {
  # Put PI_BIN_DIR on PATH first: the installer then uses it as its bin dir
  # and sees pi is already reachable, so it doesn't offer to append a PATH
  # line to ~/.zshrc (which is a symlink into this repo).
  export PATH="$PI_BIN_DIR:$PATH"

  if command_exists pi; then
    info "pi already installed (update with pi's self-update)"
    return
  fi

  info "Installing pi coding agent..."
  # Runs after the Brewfile so the installer finds Homebrew's node/npm.
  if curl -fsSL https://pi.dev/install.sh | sh; then
    success "pi installed"
  else
    warn "pi install failed - re-run: curl -fsSL https://pi.dev/install.sh | sh"
  fi
}

# ---------------------------------------------------------------------------
# Stow
# ---------------------------------------------------------------------------

# All configs live in a single Stow package, home/, whose contents mirror
# the paths they should occupy under $HOME, e.g.
# home/.config/nvim/init.lua -> ~/.config/nvim/init.lua
STOW_PACKAGE=home

# Directories that must exist as real directories before stowing. Stow
# "folds" a missing target directory into a single symlink pointing at the
# repo, so anything an app writes there (pi's auth.json and sessions, herdr's
# logs and sockets, every other app's ~/.config dir) would land in the repo.
RUNTIME_DIRS=(
  "$HOME/.config"
  "$HOME/.config/herdr"
  "$HOME/.pi"
  "$HOME/.pi/agent"
)

stow_packages() {
  info "Symlinking dotfiles with Stow..."

  cd "$DOTFILES_DIR"
  mkdir -p "${RUNTIME_DIRS[@]}"

  # -R (restow) makes this safe to run repeatedly: it relinks files that
  # are already stowed instead of erroring on the existing symlinks.
  if stow -R -t "$HOME" "$STOW_PACKAGE"; then
    success "All dotfiles stowed"
  else
    warn "Failed to stow $STOW_PACKAGE/ - a real file may already exist at a target path (move it aside and re-run)"
  fi
}

# ---------------------------------------------------------------------------
# Terminfo (Ghostty)
# ---------------------------------------------------------------------------

setup_terminfo() {
  # SSH-ing in from a Ghostty terminal forwards TERM=xterm-ghostty. Machines
  # that don't have Ghostty installed (e.g. this Linux devbox) lack that
  # terminfo entry, so anything using ncurses/terminfo fails with "unknown
  # terminal xterm-ghostty". Install the entry directly so it works
  # regardless of what client terminal connects.
  if ! command_exists tic; then
    warn "tic not found - skipping terminfo install for xterm-ghostty"
    return
  fi

  if infocmp xterm-ghostty &>/dev/null; then
    info "xterm-ghostty terminfo already installed"
  else
    info "Installing xterm-ghostty terminfo entry..."
    tic -x -o "$HOME/.terminfo" "$DOTFILES_DIR/terminfo/xterm-ghostty.terminfo"
    success "xterm-ghostty terminfo installed"
  fi
}

# ---------------------------------------------------------------------------
# Git hooks (gitleaks secret scanning)
# ---------------------------------------------------------------------------

setup_git_hooks() {
  info "Configuring git hooks..."
  git -C "$DOTFILES_DIR" config core.hooksPath ./git-hooks
  success "git hooks configured (gitleaks scans on push)"
}

# ---------------------------------------------------------------------------
# Neovim
# ---------------------------------------------------------------------------

setup_neovim() {
  if ! command_exists nvim; then
    warn "Neovim not found - skipping plugin setup"
    return
  fi

  info "Installing Neovim plugins (headless)..."
  # The config uses vim.pack (nvim 0.12+ built-in package manager)
  # Open nvim briefly to trigger plugin downloads on first run
  if nvim --headless -c "lua pcall(vim.pack.sync)" -c "qa" 2>/dev/null || \
    nvim --headless -c "lua for _, p in ipairs(vim.pack.list()) do if not p.installed then vim.pack.install(p.name) end end" -c "qa" 2>/dev/null; then
    success "Neovim plugins installed"
  else
    warn "Neovim plugin install had issues - open nvim to retry"
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
  install_pi

  echo ""
  info "=== Stowing dotfiles ==="
  stow_packages

  echo ""
  info "=== Post-setup initialization ==="
  setup_terminfo
  setup_git_hooks
  setup_neovim

  echo ""
  success "All done! Open a new terminal to use your fresh setup."
  echo ""
}

main "$@"
