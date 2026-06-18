# dotfiles

Personal dotfiles managed with GNU Stow. Configuration for Neovim, Zsh, tmux, Ghostty, and OpenCode.

## Quick Start

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./setup.sh
```

The script handles everything on **macOS** and **Linux**:

1. Install Homebrew (if not present)
2. Install all packages from `Brewfile` via Homebrew
3. Install JetBrains Mono Nerd Font
4. Symlink dotfiles via Stow
5. Set up Tmux Plugin Manager (TPM) and plugins
6. Clone zsh-autosuggestions and zsh-syntax-highlighting
7. Install Neovim plugins
8. Install NVM + Node.js and pyenv + Python
9. Set Zsh as the default shell

## Manual Installation

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
stow .config .tmux.conf .zshrc
```

## What's Configured

| Tool | Config | Notes |
|------|--------|-------|
| Neovim | `.config/nvim/` | Lua-based, built-in package manager (nvim 0.12+) |
| tmux | `.tmux.conf` | TPM, TokyoNight theme, resurrect, vim-aware pane navigation |
| Zsh | `.zshrc`, `.config/zsh/*.zsh` | Manual plugin sourcing (no framework), Starship prompt |
| Ghostty | `.config/ghostty/` | JetBrains Mono, TokyoNight theme, cursor shader |
| OpenCode | `.config/opencode/` | AI assistant config with MCP servers |

### MCP Servers

| Server | Type | Notes |
|--------|------|-------|
| `github` | Remote | GitHub API access via Copilot MCP endpoint |
| `context7` | Remote | Documentation lookup for libraries |
| `fff` | Local | Fast file finder (`fff-mcp` via Homebrew) |
| `playwright` | Local | Browser automation (`npx @playwright/mcp`) |

### Shell Stack

- **Starship** — fast, minimal prompt
- **Zoxide** — smart `cd` replacement
- **Atuin** — searchable shell history
- **fzf** — fuzzy finder
- **eza** — modern `ls` replacement
- **bat** — modern `cat` replacement
- **zsh-autosuggestions** — fish-like autosuggestions
- **zsh-syntax-highlighting** — command syntax highlighting

## Adding New Dotfiles

Create a new directory in `dotfiles/` and place your config files in it. Then stow it:

```bash
cd ~/dotfiles
stow newpackage
```

## Removing Dotfiles

```bash
cd ~/dotfiles
stow -D newpackage
```

This removes the symlink but leaves the original file in place.
