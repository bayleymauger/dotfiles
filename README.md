# dotfiles

Personal dotfiles managed with GNU Stow. Configuration for Neovim, Zsh, Ghostty, herdr, and the pi coding agent.

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
5. Install the `xterm-ghostty` terminfo entry (so SSH sessions from Ghostty work)
6. Configure git hooks (gitleaks secret scanning on push)
7. Install Neovim plugins

It's safe to re-run at any time.

## Manual Installation

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
stow -R -t ~ home
```

To remove everything Stow has linked, run `./uninstall.sh` (or `stow -D -t ~ home`).

All configs live in a single Stow package, `home/`, whose contents mirror the
paths they occupy under `$HOME`, e.g. `home/.config/nvim/init.lua` ->
`~/.config/nvim/init.lua` and `home/AGENTS.md` -> `~/AGENTS.md`.

## What's Configured

| Tool | Config | Notes |
|------|--------|-------|
| Neovim | `home/.config/nvim/` | Lua-based, built-in package manager (nvim 0.12+), Rose Pine theme |
| Zsh | `home/.zshrc` | Manual plugin sourcing (no framework), Starship prompt |
| Ghostty | `home/.config/ghostty/` | JetBrains Mono, Rose Pine theme, translucent background, cursor shader |
| herdr | `home/.config/herdr/config.toml` | Terminal multiplexer, Rose Pine theme with transparent panels |
| pi | `home/.pi/agent/` | Settings and custom skills for the pi coding agent |
| Agents | `home/AGENTS.md` | Global instructions for coding agents, linked to `~/AGENTS.md` |

### Shell Stack

- **Starship** - fast, minimal prompt
- **Zoxide** - smart `cd` replacement
- **Atuin** - searchable shell history
- **fzf** - fuzzy finder
- **eza** - modern `ls` replacement
- **bat** - modern `cat` replacement
- **zsh-autosuggestions** - fish-like autosuggestions
- **zsh-syntax-highlighting** - command syntax highlighting

## Git Hooks

`git-hooks/pre-push` runs [gitleaks](https://github.com/gitleaks/gitleaks)
over the repo's git history before every push. `install.sh` wires it up via
`git config core.hooksPath ./git-hooks`. If gitleaks isn't installed, the hook
warns and lets the push through; bypass it in an emergency with
`git push --no-verify`.

## Adding New Dotfiles

Place the file under `home/` at the path it should occupy relative to `$HOME`
(e.g. `home/.config/foo/config.toml` -> `~/.config/foo/config.toml`), then
restow:

```bash
cd ~/dotfiles
stow -R -t ~ home
```

Be selective about what gets added here - only add things you want symlinked
system-wide. Keep project-local or sensitive configuration out of `home/`.

If the app writes runtime files next to its config (logs, sessions,
credentials), add its directory to `RUNTIME_DIRS` in `install.sh`. Otherwise,
on a fresh machine, Stow links the whole directory into this repo and those
files end up in git.

## Removing Dotfiles

Run `stow -D -t ~ home` first, then delete the file from `home/` and restow
(`stow -R -t ~ home`). To remove every symlink at once, run `./uninstall.sh`.
