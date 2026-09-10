#!/bin/bash
set -euo pipefail

# ============================================================================
# Removes all symlinks created by setup.sh's Stow packages.
# ============================================================================

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() { echo -e "  \033[38;5;252m $*\033[0m"; }
success() { echo -e "  \033[32m\033[1m 󰌶 $*\033[0m"; }

# Keep in sync with STOW_PACKAGES in setup.sh
STOW_PACKAGES=(ghostty nvim zsh tmux)

info "Unstowing dotfiles..."
cd "$DOTFILES_DIR"
stow -D -t "$HOME" "${STOW_PACKAGES[@]}"
success "All dotfiles unstowed"
