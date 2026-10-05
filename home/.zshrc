# --- Homebrew ---
# Must run first: everything below is Homebrew-installed and relies on
# $HOMEBREW_PREFIX and PATH.
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /home/linuxbrew/.linuxbrew/bin/brew ]; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

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
export HOMEBREW_EDITOR=nvim

# --- Syntax Highlighting ---
# Must be sourced last so it can wrap every widget defined above.
source "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

