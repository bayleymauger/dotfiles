# AGENTS.md - Dotfiles Repository

## Overview

This is a personal dotfiles repository using **GNU Stow** to symlink configuration files into `$HOME`. It is not a software project - there is no build, test, or deploy pipeline. The repository manages configuration for: Neovim (Lua-based, nvim 0.12+), Zsh, Ghostty terminal, lazygit, and coding agents.

Everything that gets symlinked lives in a single Stow package, `home/`, whose contents mirror their paths under `$HOME` (e.g. `home/.config/nvim/init.lua` -> `~/.config/nvim/init.lua`). `terminfo/` and `git-hooks/` are used by `install.sh` directly and are not stowed.

## Key Commands

### Setup (fresh machine)
```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```
The script installs Homebrew and the `Brewfile` packages (on both macOS and Linux), the JetBrains Mono Nerd Font (only when a GUI is detected - headless SSH servers skip it; override with `INSTALL_NERD_FONT=1`/`0`), stows `home/`, installs the `xterm-ghostty` terminfo entry, points `core.hooksPath` at `git-hooks/` (gitleaks pre-push scan), installs the pstack agent skills, and installs Neovim plugins. It is idempotent - safe to re-run. Node.js comes straight from Homebrew; there is no Node version manager.

### Stow Management
```bash
cd ~/dotfiles && stow -R -t ~ home   # Symlink (or relink) all configs into $HOME
cd ~/dotfiles && stow -D -t ~ home   # Remove ALL symlinks (same as ./uninstall.sh)
```
To add a new dotfile, place it under `home/` at the path it should occupy relative to `$HOME`, then restow. Never run `stow -D` just to drop one link: it unlinks everything, so delete the file from `home/` and restow instead.

### Neovim Plugin Management
Plugins use the built-in `vim.pack` API (nvim 0.12+), not lazy.nvim, and auto-install on first open. Inside Neovim:
- `:PackUpdate` - update all `vim.pack` plugins to latest
- `:PackClean` - remove plugins on disk no longer requested by `init.lua` (also prunes `nvim-pack-lock.json`)
- `:Mason` - LSP/tool installer UI
- `:ConformInfo` - Check formatter status

## Neovim Architecture

Single-file Lua config (`init.lua`, numbered sections) with supplementary plugin files in `lua/plugins/`, required in the last section (Section 10). Leader key is `<Space>`.

### Adding a New Plugin
1. For built-in package manager: add `vim.pack.add { gh 'user/repo' }` in the appropriate section of `init.lua`, then `require` and `.setup{}`
2. For standalone plugin files: create `lua/plugins/your-plugin.lua` with `vim.pack.add` + setup, then add `require 'plugins.your-plugin'` to Section 10 of `init.lua`

### LSP, Completions, Formatting
- LSP uses `vim.lsp.config()` + `vim.lsp.enable()` (nvim 0.11+ API); Mason auto-installs the servers. Keymaps use the built-in `gr` prefix.
- Completions use **blink.cmp** (not nvim-cmp) with LuaSnip and `friendly-snippets`.
- Format-on-save is disabled by default (empty `enabled_filetypes` table in conform.nvim). Format manually with `<leader>f`.

## Ghostty Terminal
Uses JetBrains Mono font at 18pt, Rose Pine theme with 75% background opacity and blur, block cursor with blink, zsh shell integration. Custom cursor GLSL shader in `cursor.glsl`.

## lazygit
Config in `home/.config/lazygit/config.yml` (`os.editPreset: nvim`). `.zshrc` exports `LG_CONFIG_FILE` so macOS uses it too (lazygit otherwise reads `~/Library/Application Support/lazygit`). lazygit writes `state.yml` next to the config, hence its entry in `RUNTIME_DIRS`. Large lockfile diffs are suppressed globally via `home/.config/git/attributes` (`-diff`), since lazygit has no diff size limit; view one with `git diff --text -- <file>`.

## Zsh Configuration
- No plugin framework - `.zshrc` sets up Homebrew's shellenv, then sources the Homebrew-installed `zsh-autosuggestions` and `zsh-syntax-highlighting` from `$HOMEBREW_PREFIX/share/`. Syntax highlighting must stay at the very end of `.zshrc`
- `cd` is aliased to `z` (zoxide), `cat` to `bat`, `ls` to `eza`
- Prompt: Starship. Tool init: zoxide, atuin (with `^[[A` bound to atuin's full-screen up-search), fzf

`home/AGENTS.md` links to `~/AGENTS.md` and holds broad, home-directory agent guidance. This repository-root `AGENTS.md` is deliberately separate: it documents only this dotfiles repository.

## Gotchas

1. **Leader must be set before plugins load** - `init.lua` sets leader at the very top before any `vim.pack.add`
2. **vim.pack, not lazy.nvim** - the config uses nvim 0.12's built-in `vim.pack.add()` for package management. No lazy.nvim, no packer.
3. **Oil.nvim is not lazy loaded** - loaded immediately via `require 'plugins.oil'` in Section 10
4. **Format-on-save is disabled** - conform has an empty `enabled_filetypes` table; format manually with `<leader>f` or enable specific filetypes
5. **Picker is snacks.nvim, not Telescope** - hidden/ignored files are excluded by default (toggle in the picker with `<a-h>`/`<a-i>`). The `diagnostics` source is overridden to show all diagnostics, not just the cwd. snacks only replaces `vim.ui.select` on `UIEnter`, so it stays the builtin in `--headless` runs
6. **Single Stow package** - everything lives under `home/`, mirroring its target under `$HOME`; `home/AGENTS.md`, for example, is stowed as `~/AGENTS.md`. Don't create new top-level package directories
7. **Stow folds missing directories** - if a target dir like `~/.config/lazygit` doesn't exist, Stow symlinks the whole dir into the repo, and the app's runtime files (logs, sockets, state) end up in git. `RUNTIME_DIRS` in `install.sh` pre-creates these; add to it when adding config for an app that writes next to its config file
8. **pstack skills are not in this repo** - `install_pstack_skills` in `install.sh` installs them globally with `npx skills add backnotprop/pstack -g` into `~/.agents/skills/`, which the skills CLI manages. Don't add skills to `home/.agents/`
9. **Blink.cmp uses Lua fuzzy matcher** - rust implementation is available but opted for Lua (`fuzzy.implementation = "lua"`)
10. **nvim-treesitter uses `main` branch** - the rewrite for nvim 0.12+. Requires `tree-sitter-cli` to compile parsers from source
11. **nvim-treesitter skips bundled parsers** - nvim 0.12 ships its own parsers for `lua`, `c`, `vim`, `vimdoc`, `markdown`, `markdown_inline`, `query`. The config only installs additional parsers (bash, diff, html, etc.)
12. **Built-in commenting** - nvim 0.10+ has `gc`/`gcc`, with `commentstring` made treesitter-aware by ts-comments.nvim (no Comment.nvim plugin needed)
13. **Diagnostics auto-open float** - `jump = { on_jump = ... }` in diagnostic config opens a float window when navigating diagnostics
