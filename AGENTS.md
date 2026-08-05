# AGENTS.md - Dotfiles Repository

## Overview

This is a personal dotfiles repository using **GNU Stow** to symlink configuration files into `$HOME`. It is not a software project — there is no build, test, or deploy pipeline. The repository manages configuration for: Neovim (Lua-based, nvim 0.12+), Zsh, tmux, Ghostty terminal, and Claude Code.

## Repository Structure

```
.
├── Brewfile                    # Homebrew dependencies (macOS)
├── setup.sh                    # One-command setup script
├── .mcp.json                   # MCP servers available to Claude Code in this repo
├── .claude/                    # Claude Code project settings
│   ├── CLAUDE.md
│   ├── settings.json
│   └── settings.local.json
├── .config/
│   ├── ghostty/                # Ghostty terminal config + cursor shader
│   │   ├── config
│   │   └── cursor.glsl
│   ├── nvim/                   # Neovim config (vim.pack, built-in package manager)
│   │   ├── init.lua            # Single-file config: options, keymaps, plugins, LSP
│   │   ├── stylua.toml
│   │   ├── nvim-pack-lock.json # vim.pack lockfile (pinned revisions)
│   │   └── lua/
│   │       └── plugins/        # Supplementary plugin configs
│   │           ├── autopairs.lua
│   │           ├── autotag.lua
│   │           ├── avante.lua
│   │           ├── debug.lua
│   │           ├── gitsigns.lua
│   │           ├── indent_line.lua
│   │           ├── lint.lua
│   │           ├── oil.lua
│   │           ├── tmux.lua
│   │           ├── trouble.lua
│   │           └── ts_comments.lua
│   └── zsh/                    # Additional zsh config sourced by .zshrc
├── .tmux.conf                  # tmux config (tokyonight theme, TPM, vim-aware navigation)
├── .zshrc                      # Zsh config (aliases, tool init, plugin sourcing)
└── README.md
```

## Key Commands

### Setup (fresh machine)
```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./setup.sh
```
The script installs dependencies (Homebrew/apt/dnf/pacman), stows configs, and initializes TPM, NVM, pyenv, and Neovim plugins.

### Stow Management
```bash
cd ~/dotfiles && stow */          # Symlink all configs to $HOME
cd ~/dotfiles && stow -D nvim     # Remove symlinks for a package
```

### Neovim Plugin Management
Inside Neovim — plugins use the built-in `vim.pack` API (nvim 0.12+), not lazy.nvim:
- Plugins auto-install on first open via `vim.pack.add { url }`
- `:packadd <name>` — manually load a plugin
- `:PackUpdate` — update all `vim.pack` plugins to latest
- `:PackClean` — remove plugins on disk no longer requested by `init.lua` (also prunes `nvim-pack-lock.json`)
- `:Mason` — LSP/tool installer UI
- `:ConformInfo` — Check formatter status
- `:Telescope colorscheme` — Browse installed themes

### Shell Aliases (defined in .zshrc)
- `vim` → `nvim`
- `lg` → `lazygit`
- `p` → `pnpm`
- `box` → `pnpm box`
- `..` / `...` / `....` / `.....` → parent directory navigation
- `ls` → `eza --icons --group-directories-first`, `ll` → `eza -lh --icons --grid`
- `cat` → `bat`
- `cd` → `z` (zoxide)

## Neovim Architecture

Single-file Lua config (`init.lua`) with supplementary plugin files in `lua/plugins/`. Leader key is `<Space>`. Uses nvim 0.12+ built-in `vim.pack` for package management (not lazy.nvim).

### Config Structure (init.lua sections)
1. **Options** — leader, vim.o settings, basic autocmds
2. **Keymaps** — window navigation, diagnostics, terminal mode, `PackUpdate`/`PackClean` commands
3. **Plugin Manager** — `vim.pack` build hooks (telescope-fzf-native, LuaSnip, treesitter, avante.nvim)
4. **UI/Core UX** — guess-indent, gitsigns, which-key, tokyonight, todo-comments, mini modules
5. **Search & Navigation** — Telescope + extensions, LSP picker keymaps
6. **LSP** — fidget, mason, mason-lspconfig, mason-tool-installer, server configs (vtsls, stylua, terraformls, lua_ls)
7. **Formatting** — conform.nvim (format-on-save disabled by default, manual via `<leader>f`)
8. **Autocomplete** — blink.cmp + LuaSnip snippets (with friendly-snippets), source shown in completion menu
9. **Treesitter** — parser installation, auto-attach, indent (`nvim-treesitter` `main` branch)
10. **Plugins** — loads `lua/plugins/*.lua` files

### Supplementary Plugins (lua/plugins/)
- `autopairs.lua` — nvim-autopairs
- `autotag.lua` — nvim-ts-autotag (auto-close/rename HTML/JSX tags)
- `avante.lua` — avante.nvim, AI coding assistant panel (see below)
- `debug.lua` — nvim-dap + dap-ui + mason-nvim-dap (Go/delve)
- `gitsigns.lua` — gitsigns recommended keymaps (hunk nav, stage, blame, diff)
- `indent_line.lua` — indent-blankline.nvim
- `lint.lua` — nvim-lint (markdownlint)
- `oil.lua` — oil.nvim file browser (`\` keymap)
- `tmux.lua` — tmux.nvim (seamless pane navigation)
- `trouble.lua` — trouble.nvim (diagnostics/symbols/LSP results list)
- `ts_comments.lua` — ts-comments.nvim (treesitter-aware `commentstring`)

### Adding a New Plugin
1. For built-in package manager: add `vim.pack.add { gh 'user/repo' }` in the appropriate section of `init.lua`, then `require` and `.setup{}`
2. For standalone plugin files: create `lua/plugins/your-plugin.lua` with `vim.pack.add` + setup, then add `require 'plugins.your-plugin'` to Section 10 of `init.lua`

### LSP Configuration
Uses `vim.lsp.config()` + `vim.lsp.enable()` (nvim 0.11+ API). Servers configured: `vtsls`, `stylua`, `terraformls`, `lua_ls`. Mason auto-installs them. LSP keymaps use `gr` prefix:
- `grn` rename, `gra` code action, `grd` definition, `grD` declaration
- `grr` references, `gri` implementation, `grt` type definition, `gO` document symbols, `gW` workspace symbols
- `<leader>th` toggle inlay hints

### Completions
Uses **blink.cmp** (not nvim-cmp) with LuaSnip snippets, loaded from `rafamadriz/friendly-snippets`. Sources: LSP, path, snippets. Completion menu shows each item's source (LSP/Snippets/Path) as a column.

### Formatting (conform.nvim)
Format-on-save is disabled by default (empty `enabled_filetypes` table). Format manually with `<leader>f`. Formatters:
- Lua: stylua
- JS/TS/JSON/HTML/CSS: prettierd → prettier (fallback)
- Terraform: terraform_fmt

### Debugging
Uses nvim-dap with Go (delve) support. Keymaps: `<F5>` continue, `<F1>` step in, `<F2>` step over, `<F3>` step out, `<leader>b` toggle breakpoint, `<leader>B` conditional breakpoint, `<F7>` toggle debug UI.

### AI Assistant (avante.nvim)
`lua/plugins/avante.lua` — chat/edit panel backed by the Anthropic API (`provider = 'claude'`, model `claude-sonnet-5`). Reads the API key from the `AVANTE_ANTHROPIC_API_KEY` env var (not `ANTHROPIC_API_KEY`). Deps: plenary.nvim, nui.nvim, render-markdown.nvim (renders the chat buffer). Build step compiles a Rust component via `make` on install/update (requires a Rust toolchain). Keymaps: `<leader>aA` ask, `<leader>aE` edit, `<leader>aT` toggle.

### Trouble / Diagnostics UX
`<leader>xx` toggle diagnostics list, `<leader>xX` buffer-only diagnostics, `<leader>cs` symbols, `<leader>cl` LSP results (references/definitions/etc.), `<leader>xL`/`<leader>xQ` location/quickfix list.

### Telescope Keymaps
- `<leader>sf` find files, `<leader>sg` live grep, `<leader>sw` grep word under cursor
- `<leader>sd` diagnostics, `<leader>sr` resume, `<leader>/` fuzzy find in buffer
- `<leader>sn` search Neovim config files, `<leader>sc` search commands, `<leader><leader>` buffers

### Other Notable Keymaps
- `\` oil file browser
- `<leader>q` diagnostic quickfix
- `<leader>f` format buffer
- `<leader>u` toggle undotree
- `<leader>lg` open lazygit in a tmux popup
- `<leader>hs` stage hunk, `<leader>hr` reset hunk, `<leader>hp` preview hunk, `<leader>hi` preview hunk inline
- `<leader>hb` blame line (full), `<leader>hd` diff vs index, `<leader>hD` diff vs last commit
- `<leader>hQ`/`<leader>hq` set quickfix list from hunks, `<leader>tb`/`<leader>tw` toggle blame line/word diff
- `]c` / `[c` next/prev git change, `ih` text object for git hunk
- `gc`/`gcc` comment (built-in nvim 0.10+, `commentstring` provided by ts-comments.nvim)

### Code Style
- Lua: 2-space indentation (modeline in init.lua: `ts=2 sts=2 sw=2`)
- Plugin files use the same 2-space style

## Ghostty Terminal
Uses JetBrains Mono font at 16pt, tokyonight theme, block cursor with blink, zsh shell integration. Custom cursor GLSL shader in `cursor.glsl`.

## tmux Configuration
- Uses TPM (Tmux Plugin Manager) with tokyonight theme, tmux-resurrect, tmux-sensible
- `xterm-ghostty` terminal type with truecolor
- Seamless pane navigation between nvim and tmux via `<C-hjkl>` (checks if vim is active)
- Pane resizing with `<M-hjkl>` (Alt)
- Resurrect preserves nvim sessions
- New splits/windows inherit current pane's working directory

## Zsh Configuration
- No plugin framework — `.zshrc` manually sources `.config/zsh/*.zsh` and clones of `zsh-autosuggestions`/`zsh-syntax-highlighting` (installed by `setup.sh`)
- Prompt: Starship
- Tool init: zoxide, atuin (with `^[[A` bound to atuin's full-screen up-search), fzf

## Claude Code Configuration
- `.mcp.json` declares MCP servers available in this repo: `github` (remote, via Copilot MCP endpoint), `context7` (remote docs lookup), `fff` (local, fast file finder), `playwright` (local browser automation)
- `.claude/settings.json` enables those MCP servers plus the `gopls-lsp` and `typescript-lsp` plugins, and sets `effortLevel: low`
- `.claude/CLAUDE.md` holds project-specific instructions for Claude Code sessions in this repo

## Gotchas

1. **Leader must be set before plugins load** — `init.lua` sets leader at the very top before any `vim.pack.add`
2. **vim.pack, not lazy.nvim** — the config uses nvim 0.12's built-in `vim.pack.add()` for package management. No lazy.nvim, no packer.
3. **Oil.nvim is not lazy loaded** — loaded immediately via `require 'plugins.oil'` in Section 10
4. **Format-on-save is disabled** — conform has an empty `enabled_filetypes` table; format manually with `<leader>f` or enable specific filetypes
5. **Telescope shows hidden files** — `find_files` and ripgrep both have `--hidden` flag enabled
6. **Stow uses directory structure** — `.config/` is stowed as a single unit; root-level files (`.tmux.conf`, `.zshrc`, `.mcp.json`) are stowed individually
7. **Blink.cmp uses Lua fuzzy matcher** — rust implementation is available but opted for Lua (`fuzzy.implementation = "lua"`)
8. **No swap files** — `vim.o.swapfile = false` is set globally
9. **nvim-treesitter uses `main` branch** — the rewrite for nvim 0.12+. Requires `tree-sitter-cli` to compile parsers from source
10. **nvim-treesitter skips bundled parsers** — nvim 0.12 ships its own parsers for `lua`, `c`, `vim`, `vimdoc`, `markdown`, `markdown_inline`, `query`. The config only installs additional parsers (bash, diff, html, etc.)
11. **Built-in commenting** — nvim 0.10+ has `gc`/`gcc`, with `commentstring` made treesitter-aware by ts-comments.nvim (no Comment.nvim plugin needed)
12. **Diagnostics auto-open float** — `jump = { on_jump = ... }` in diagnostic config opens a float window when navigating diagnostics
13. **avante.nvim needs a Rust toolchain** — its `PackChanged` build hook runs `make`, which compiles a Rust binary; without `cargo` installed, avante will fail to build
14. **avante.nvim reads a non-standard env var** — `AVANTE_ANTHROPIC_API_KEY`, not `ANTHROPIC_API_KEY`, so it doesn't silently pick up a key meant for another tool
