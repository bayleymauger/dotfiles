# dotfiles

Personal dotfiles managed with GNU Stow. Configuration for Codex, Neovim, Zsh, tmux, and Ghostty.

## Quick Start

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```

The script handles everything on **macOS** and **Linux**:

1. Install Homebrew (if not present)
2. Install all packages from `Brewfile` via Homebrew
3. Install JetBrains Mono Nerd Font
4. Symlink dotfiles via Stow
5. Configure git hooks (gitleaks secret scanning on push)
6. Set up Tmux Plugin Manager (TPM) and plugins
7. Clone zsh-autosuggestions and zsh-syntax-highlighting
8. Install Neovim plugins
9. Install NVM + Node.js, and pyenv (Python itself isn't auto-installed — run `pyenv install <version>` yourself)
10. Set Zsh as the default shell

## Manual Installation

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
stow -t ~ codex ghostty nvim zsh tmux
```

To remove everything Stow has linked, run `./uninstall.sh` (or `stow -D -t ~ codex ghostty nvim zsh tmux`).

Each package is a top-level directory whose contents mirror the paths they
occupy under `$HOME`, e.g. `nvim/.config/nvim/init.lua` -> `~/.config/nvim/init.lua`.
The `codex/AGENTS.md` package is therefore linked as `~/AGENTS.md`; its
`.codex/config.toml` is linked as `~/.codex/config.toml`.

## What's Configured

| Tool | Config | Notes |
|------|--------|-------|
| Neovim | `nvim/.config/nvim/` | Lua-based, built-in package manager (nvim 0.12+) |
| tmux | `tmux/.tmux.conf` | TPM, TokyoNight theme, resurrect, vim-aware pane navigation |
| Zsh | `zsh/.zshrc`, `zsh/.config/zsh/*.zsh` | Manual plugin sourcing (no framework), Starship prompt |
| Ghostty | `ghostty/.config/ghostty/` | JetBrains Mono, TokyoNight theme, cursor shader |
| Codex | `codex/AGENTS.md`, `codex/.codex/config.toml` | Global instructions and MCP configuration |

### MCP Servers

| Server | Type | Notes |
|--------|------|-------|
| `context7` | Local | Documentation lookup for libraries via `npx @upstash/context7-mcp` |
| `fff` | Local | Fast file search via the Homebrew-installed `fff-mcp` binary |
| `github` | Remote | GitHub's hosted MCP server, authenticated through OAuth |
| `playwright` | Local | Browser automation via `npx @playwright/mcp@latest` |

### Shell Stack

- **Starship** — fast, minimal prompt
- **Zoxide** — smart `cd` replacement
- **Atuin** — searchable shell history
- **fzf** — fuzzy finder
- **eza** — modern `ls` replacement
- **bat** — modern `cat` replacement
- **zsh-autosuggestions** — fish-like autosuggestions
- **zsh-syntax-highlighting** — command syntax highlighting

## Git Hooks

`git-hooks/pre-push` runs [gitleaks](https://github.com/gitleaks/gitleaks) to
scan for secrets before every push. `install.sh` wires it up automatically via
`git config core.hooksPath ./git-hooks`. If gitleaks isn't installed, the hook
warns and lets the push through; bypass it in an emergency with
`git push --no-verify`.

## Adding New Dotfiles

Create a new top-level directory in `dotfiles/` whose contents mirror where
they should land under `$HOME` (e.g. `foo/.config/foo/config.toml`), add it to
`STOW_PACKAGES` in both `install.sh` and `uninstall.sh`, then stow it:

```bash
cd ~/dotfiles
stow -t ~ foo
```

Be selective about what gets added here — only stow things you want symlinked
system-wide. Keep project-local or sensitive configuration out of Stow
packages.

## Removing Dotfiles

```bash
cd ~/dotfiles
stow -D -t ~ foo
```

This removes the symlink but leaves the original file in place. To remove
everything at once, run `./uninstall.sh`.
