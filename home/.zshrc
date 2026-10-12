# --- Homebrew ---
# Must run first: everything below is Homebrew-installed and relies on
# $HOMEBREW_PREFIX and PATH.
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /home/linuxbrew/.linuxbrew/bin/brew ]; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

# --- pi ---
# Installed by pi's official installer (see install.sh), not Homebrew.
export PATH="$HOME/.pi/agent/bin:$PATH"

# --- Zsh Plugin Loading ---
source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"

# --- Tool Initializations ---
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"
eval "$(atuin init zsh)"
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh


# --- Aliases ---
alias vim="nvim"
alias lg="lazygit"
alias p="pnpm"
alias box="pnpm box"

alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'

alias ls='eza --icons --group-directories-first'
alias ll='eza -lh --icons --grid'
alias cat='bat'
alias cd='z'

# --- Custom Key Bindings ---
# Use Up-Arrow for Atuin's full-screen history search
bindkey '^[[A' atuin-up-search

# --- Environment Variables ---
export EDITOR=nvim
export VISUAL=nvim
export HOMEBREW_EDITOR=nvim
# lazygit defaults to ~/Library/Application Support on macOS; point it at the stowed config
export LG_CONFIG_FILE="$HOME/.config/lazygit/config.yml"

# --- Syntax Highlighting ---
# Must be sourced last so it can wrap every widget defined above.
source "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
