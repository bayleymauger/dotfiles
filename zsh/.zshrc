# --- Zsh Config Files ---
for config in ~/.config/zsh/*.zsh; do
  [ -f "$config" ] && source "$config"
done

# --- Zsh Plugin Loading ---
[ -d ~/.zsh/zsh-autosuggestions ] && source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh
[ -d ~/.zsh/zsh-syntax-highlighting ] && source ~/.zsh/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

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
