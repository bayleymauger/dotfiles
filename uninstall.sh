#!/bin/bash
set -euo pipefail

# ============================================================================
# Removes all symlinks created by install.sh's Stow package (home/).
# ============================================================================

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() { echo -e "  \033[38;5;252m $*\033[0m"; }
success() { echo -e "  \033[32m\033[1m 󰌶 $*\033[0m"; }
warn() { echo -e "  \033[38;5;137m 󰀪 $*\033[0m"; }

# Keep in sync with STOW_PACKAGE in install.sh
STOW_PACKAGE=home

info "Unstowing dotfiles..."
cd "$DOTFILES_DIR"

if stow -D -t "$HOME" "$STOW_PACKAGE"; then
  success "All dotfiles unstowed"
else
  warn "Failed to unstow $STOW_PACKAGE/"
fi
