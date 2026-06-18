# AGENTS.md - Dotfiles Repository

## Overview

This is a personal dotfiles repository using **GNU Stow** to symlink configuration files into `$HOME`. It is not a software project — there is no build, test, or deploy pipeline. The repository manages configuration for: Neovim (Lua-based, nvim 0.12+), Zsh (with Zim framework), tmux, Ghostty terminal, and OpenCode.

## Repository Structure

```
.
├── Brewfile                    # Homebrew dependencies (macOS)
├── setup                       # One-command setup script
├── .config/
│   ├── ghostty/                # Ghostty terminal config + cursor shader
│   │   ├── config
│   │   └── cursor.glsl
│   ├── nvim/                   # Neovim config (vim.pack, built-in package manager)
│   │   ├── init.lua            # Single-file config: options, keymaps, plugins, LSP
│   │   ├── stylua.toml
│   │   └── lua/
│   │       └── plugins/        # Supplementary plugin configs
│   │           ├── autopairs.lua
│   │           ├── debug.lua
│   │           ├── gitsigns.lua
│   │           ├── indent_line.lua
│   │           ├── lint.lua
│   │           ├── oil.lua
│   │           └── tmux.lua
│   └── opencode/               # OpenCode AI assistant config
│       └── opencode.json
├── .tmux.conf                  # tmux config (Dracula theme, TPM, vim-aware navigation)
├── .zimrc                      # Zim module/plugin declarations
├── .zshrc                      # Zsh config (aliases, NVM, pyenv, keybinds)
└── README.md
```

## Key Commands

### Setup (fresh machine)
```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./setup
```
The script installs dependencies (Homebrew/apt/dnf/pacman), stows configs, and initializes TPM, Zim, NVM, pyenv, and Neovim plugins.

### Stow Management
```bash
cd ~/dotfiles && stow */          # Symlink all configs to $HOME
cd ~/dotfiles && stow -D nvim     # Remove symlinks for a package
```

### Neovim Plugin Management
Inside Neovim — plugins use the built-in `vim.pack` API (nvim 0.12+), not lazy.nvim:
- Plugins auto-install on first open via `vim.pack.add { url }`
- `:packadd <name>` — manually load a plugin
- `:Mason` — LSP/tool installer UI
- `:ConformInfo` — Check formatter status
- `:Telescope colorscheme` — Browse installed themes

### Shell Aliases (defined in .zshrc)
- `vim` → `nvim`
- `lg` → `lazygit`
- `p` → `pnpm`
- `box` → `pnpm box`
- `..` / `...` / `....` → parent directory navigation
- `workstation` → SSH to remote machine

## Neovim Architecture

Single-file Lua config (`init.lua`) with supplementary plugin files in `lua/plugins/`. Leader key is `<Space>`. Uses nvim 0.12+ built-in `vim.pack` for package management (not lazy.nvim).

### Config Structure (init.lua sections)
1. **Options** — leader, vim.o settings, basic autocmds
2. **Keymaps** — window navigation, diagnostics, terminal mode
3. **Plugin Manager** — `vim.pack` build hooks (telescope-fzf-native, LuaSnip, treesitter)
4. **UI/Core UX** — guess-indent, gitsigns, which-key, tokyonight, todo-comments, mini modules
5. **Search & Navigation** — Telescope + extensions, LSP picker keymaps
6. **LSP** — fidget, mason, lspconfig, server configs (ts_ls, stylua, lua_ls)
7. **Formatting** — conform.nvim (format-on-save disabled by default, manual via `<leader>f`)
8. **Autocomplete** — blink.cmp + LuaSnip snippets
9. **Treesitter** — parser installation, auto-attach, indent
10. **Plugins** — loads `lua/plugins/*.lua` files

### Supplementary Plugins (lua/plugins/)
- `autopairs.lua` — nvim-autopairs
- `debug.lua` — nvim-dap + dap-ui + mason-nvim-dap (Go/delve)
- `gitsigns.lua` — gitsigns recommended keymaps (hunk nav, stage, blame, diff)
- `indent_line.lua` — indent-blankline.nvim
- `lint.lua` — nvim-lint (markdownlint)
- `oil.lua` — oil.nvim file browser (`\` keymap)
- `tmux.lua` — tmux.nvim (seamless pane navigation)

### Adding a New Plugin
1. For built-in package manager: add `vim.pack.add { gh 'user/repo' }` in the appropriate section of `init.lua`, then `require` and `.setup{}`
2. For standalone plugin files: create `lua/plugins/your-plugin.lua` with `vim.pack.add` + setup, then add `require 'plugins.your-plugin'` to Section 10 of `init.lua`

### LSP Configuration
Uses `vim.lsp.config()` + `vim.lsp.enable()` (nvim 0.11+ API). Servers configured: `ts_ls`, `stylua`, `lua_ls`. Mason auto-installs them. LSP keymaps use `gr` prefix:
- `grn` rename, `gra` code action, `grd` definition, `grD` declaration
- `grr` references, `gri` implementation, `grt` type definition, `gO` document symbols, `gW` workspace symbols
- `<leader>th` toggle inlay hints

### Completions
Uses **blink.cmp** (not nvim-cmp) with LuaSnip snippets. Sources: LSP, path, snippets.

### Formatting (conform.nvim)
Format-on-save is disabled by default (empty `enabled_filetypes` table). Format manually with `<leader>f`. Formatters:
- Lua: stylua
- JS/TS/JSON: prettierd → prettier (fallback)
- Terraform: terraform_fmt

### Debugging
Uses nvim-dap with Go (delve) support. Keymaps: `<F5>` continue, `<F1>` step in, `<F2>` step over, `<F3>` step out, `<leader>b` toggle breakpoint, `<F7>` toggle debug UI.

### Telescope Keymaps
- `<leader>sf` find files, `<leader>sg` live grep, `<leader>sw` grep word under cursor
- `<leader>sd` diagnostics, `<leader>sr` resume, `<leader>/` fuzzy find in buffer
- `<leader>sn` search Neovim config files, `<leader>sc` search commands, `<leader><leader>` buffers

### Other Notable Keymaps
- `\` oil file browser
- `<leader>q` diagnostic quickfix
- `<leader>f` format buffer
- `<leader>hs` stage hunk, `<leader>hr` reset hunk, `<leader>hp` preview hunk, `<leader>hi` preview hunk inline
- `<leader>hb` blame line (full), `<leader>hd` diff vs index, `<leader>hD` diff vs last commit
- `<leader>hQ`/`<leader>hq` set quickfix list from hunks, `<leader>tw` toggle word diff
- `]c` / `[c` next/prev git change, `ih` text object for git hunk
- `gc`/`gcc` comment (built-in nvim 0.10+)

### Code Style
- Lua: 2-space indentation (modeline in init.lua: `ts=2 sts=2 sw=2`)
- Plugin files use tab indentation in the Lua code

## Ghostty Terminal
Uses JetBrains Mono font, Dracula theme, block cursor with blink, zsh shell integration. Custom cursor GLSL shader in `cursor.glsl`.

## tmux Configuration
- Uses TPM (Tmux Plugin Manager) with Dracula theme, tmux-resurrect, tmux-sensible
- `xterm-ghostty` terminal type with truecolor
- Seamless pane navigation between nvim and tmux via `<C-hjkl>` (checks if vim is active)
- Pane resizing with `<M-hjkl>` (Alt)
- Resurrect preserves nvim sessions
- New splits/windows inherit current pane's working directory

## Zsh Configuration
- Plugin manager: Zim Framework
- Modules: syntax highlighting, autosuggestions, history substring search, completions, asciiship prompt
- Dev tools: NVM (with auto-switch via `.nvmrc`), pyenv + pyenv-virtualenv
- Emacs keybindings (not vi mode) despite vim-heavy tooling

## Gotchas

1. **Leader must be set before plugins load** — `init.lua` sets leader at the very top before any `vim.pack.add`
2. **vim.pack, not lazy.nvim** — the config uses nvim 0.12's built-in `vim.pack.add()` for package management. No lazy.nvim, no packer.
3. **Oil.nvim is not lazy loaded** — loaded immediately via `require 'plugins.oil'` in Section 10
4. **Format-on-save is disabled** — conform has an empty `enabled_filetypes` table; format manually with `<leader>f` or enable specific filetypes
5. **Telescope shows hidden files** — `find_files` and ripgrep both have `--hidden` flag enabled
6. **Stow uses directory structure** — `.config/` is stowed as a single unit; root-level files (`.tmux.conf`, `.zimrc`, `.zshrc`) are stowed individually
7. **Zim modules order matters** — syntax-highlighting must come before history-substring-search, and autosuggestions must come last (per `.zimrc` comments)
8. **Blink.cmp uses Lua fuzzy matcher** — rust implementation is available but opted for Lua (`fuzzy.implementation = "lua"`)
9. **No swap files** — `vim.o.swapfile = false` is set globally
10. **nvim-treesitter uses `main` branch** — the rewrite for nvim 0.12+. Requires `tree-sitter-cli` to compile parsers from source
11. **nvim-treesitter skips bundled parsers** — nvim 0.12 ships its own parsers for `lua`, `c`, `vim`, `vimdoc`, `markdown`, `markdown_inline`, `query`. The config only installs additional parsers (bash, diff, html, etc.)
12. **Built-in commenting** — nvim 0.10+ has `gc`/`gcc` with treesitter context-aware `commentstring`. No Comment.nvim plugin needed
13. **Diagnostics auto-open float** — `jump = { on_jump = ... }` in diagnostic config opens a float window when navigating diagnostics
14. **Copilot node path may need updating** — if using Copilot, the node path in its config may point to a specific NVM version
