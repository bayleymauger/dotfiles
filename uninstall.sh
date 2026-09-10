#!/bin/bash
set -euo pipefail

# ============================================================================
# Removes all symlinks created by install.sh's Stow packages.
# ============================================================================

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() { echo -e "  \033[38;5;252m $*\033[0m"; }
success() { echo -e "  \033[32m\033[1m 󰌶 $*\033[0m"; }
warn() { echo -e "  \033[38;5;137m 󰀪 $*\033[0m"; }

# Keep in sync with STOW_PACKAGES in install.sh
STOW_PACKAGES=(ghostty nvim zsh tmux)

info "Unstowing dotfiles..."
cd "$DOTFILES_DIR"

# Each package is unstowed individually so one already-unstowed (or
# otherwise failing) package doesn't stop the rest from being removed.
for pkg in "${STOW_PACKAGES[@]}"; do
  if stow -D -t "$HOME" "$pkg"; then
    success "Unstowed $pkg"
  else
    warn "Failed to unstow $pkg"
  fi
done

success "All dotfiles unstowed"
