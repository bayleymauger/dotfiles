# AGENTS.md - Dotfiles Repository

## Overview

This is a personal dotfiles repository using **GNU Stow** to symlink configuration files into `$HOME`. It is not a software project - there is no build, test, or deploy pipeline. The repository manages configuration for: Neovim (Lua-based), Zsh (with Zim framework), tmux, Ghostty terminal, Lazygit, Crush CLI, and OpenCode.

## Repository Structure

```
.
├── .config/
│   ├── crush/          # Crush CLI config (crush.json, commands/)
│   ├── ghostty/        # Ghostty terminal config + cursor shader
│   ├── lazygit/        # Lazygit config (empty - default settings)
│   ├── nvim/           # Neovim config (modular Lua)
│   │   ├── init.lua    # Entry point: sets leader, loads modules
│   │   └── lua/
│   │       ├── options.lua      # vim.o settings
│   │       ├── keymaps.lua      # Basic keymaps (not plugin-specific)
│   │       ├── lazy-bootstrap.lua # lazy.nvim plugin manager bootstrap
│   │       ├── lazy-plugins.lua # Plugin loader - lists all plugins
│   │       └── plugins/         # One file per plugin, modular structure
│   └── opencode/       # OpenCode AI assistant config
├── .tmux.conf          # tmux config (Dracula theme, tmux-nvim integration)
├── .zimrc              # Zim module/plugin declarations
├── .zshrc              # Zsh config (aliases, NVM, pyenv, keybinds)
└── README.md           # Installation instructions
```

## Key Commands

### Stow Management
```bash
cd ~/dotfiles && stow */          # Symlink all configs to $HOME
cd ~/dotfiles && stow -D nvim     # Remove symlinks for a package
```

### Neovim Plugin Management
Inside Neovim:
- `:Lazy` - Plugin manager UI
- `:Lazy update` - Update all plugins
- `:Mason` - LSP/tool installer UI
- `:ConformInfo` - Check formatter status
- `:Telescope colorscheme` - Browse installed themes

### Shell Aliases (defined in .zshrc)
- `vim` → `nvim`
- `lg` → `lazygit`
- `p` → `pnpm`
- `box` → `pnpm box`
- `..` / `...` / `....` → parent directory navigation
- `workstation` → SSH to remote machine

## Neovim Architecture

Modular Lua config with one file per plugin. Leader key is `<Space>`.

### Plugin Loading Flow
1. `init.lua` sets leader, requires `options`, `keymaps`, `lazy-bootstrap`, `lazy-plugins`
2. `lazy-plugins.lua` calls `require("lazy").setup({...})` with each plugin module listed explicitly
3. Each file in `plugins/` returns a table (or table of tables) compatible with lazy.nvim spec format

### Adding a New Plugin
1. Create `lua/plugins/your-plugin.lua` returning a lazy.nvim plugin spec
2. Add `require("plugins.your-plugin")` to the list in `lazy-plugins.lua`
3. Restart Neovim, run `:Lazy` to verify

### Removed Plugins (replaced by nvim 0.12 built-ins)
- `Comment.nvim` - replaced by built-in `gc`/`gcc` with treesitter context-aware `commentstring`
- `nvim-ts-context-commentstring` - context detection built into `vim._comment` since nvim 0.10
- `mbbill/undotree` - replaced by built-in `:Undotree` (opt-in package, loaded via `packadd`)

### LSP Configuration
Defined in `plugins/lspconfig.lua`. Uses `vim.lsp.config()` + `vim.lsp.enable()` (nvim 0.11+ API) instead of mason-lspconfig handlers. Servers configured: `gopls`, `pyright`, `ts_ls`, `lua_ls`. Mason auto-installs them. LSP keymaps use `gr` prefix:
- `grn` rename, `gra` code action, `grd` definition, `grD` declaration
- `grr` references, `gri` implementation, `grt` type definition, `gO` document symbols, `gW` workspace symbols (set in telescope.lua LspAttach autocmd, not lspconfig)
- `<leader>th` toggle inlay hints

### Completions
Uses **blink.cmp** (not nvim-cmp) with LuaSnip snippets. Sources: LSP, path, snippets, lazydev, copilot.

### AI Integration
- **copilot.lua** - GitHub Copilot (suggestion/panel disabled, fed into blink.cmp via `blink-copilot`)
- **codecompanion.nvim** - Chat interface using Copilot adapter with `claude-sonnet-4` model
- Keymaps: `<C-a>` actions, `<LocalLeader>c` toggle chat, `ca` in visual mode adds selection to chat
- Command abbreviation: `cc` expands to `CodeCompanion`

### Formatting (conform.nvim)
Format-on-save enabled by default. Disable with `:FormatDisable` (global) or `:FormatDisable!` (buffer). Formatters:
- Lua: stylua
- JS/TS/JSON: prettierd → prettier (fallback)
- Go: gofmt → goimports
- Terraform: terraform_fmt

### Debugging
Uses nvim-dap with Go (delve) support. Keymaps: `<F5>` continue, `<F1>` step in, `<F2>` step over, `<F3>` step out, `<leader>b` toggle breakpoint, `<F7>` toggle debug UI.

### Telescope Keymaps
- `<leader>sf` find files, `<leader>sg` live grep (with args), `<leader>sw` grep word under cursor
- `<leader>sd` diagnostics, `<leader>sr` resume, `<leader>/` fuzzy find in buffer
- `<leader>sn` search Neovim config files, `<leader>sc` search commands, `<leader><leader>` buffers

### Other Notable Keymaps
- `<leader>lg` lazygit, `\` oil file browser, `<C-e>` harpoon menu
- `<C-g>` / `<C-T>` / `<C-N>` / `<C-S>` harpoon slots 1-4
- `<leader>a` harpoon add file, `<leader>q` diagnostic quickfix
- `<leader>f` format buffer, `<leader>xx` trouble diagnostics
- `<leader>hs` stage hunk, `<leader>hr` reset hunk, `<leader>hp` preview hunk, `<leader>hi` preview hunk inline
- `<leader>hb` blame line (full), `<leader>hd` diff vs index, `<leader>hD` diff vs last commit
- `<leader>hQ`/`<leader>hq` set quickfix list from hunks, `<leader>tw` toggle word diff
- `]c` / `[c` next/prev git change, `ih` text object for git hunk
- `<leader>u` undo tree (built-in `:Undotree`), `gc`/`gcc` comment (built-in)

### Code Style
- Lua: 2-space indentation (modeline in init.lua: `ts=2 sts=2 sw=2`)
- Uses tabs internally in `options.lua` (mixed - be careful)
- Plugin files use tab indentation in the Lua code

## Ghostty Terminal
Uses JetBrains Mono font, Dracula theme, block cursor with blink, zsh shell integration. Custom cursor GLSL shader in `cursor.glsl`.

## tmux Configuration
- Uses TPM (Tmux Plugin Manager) with Dracula theme, tmux-resurrect, tmux-sensible
- `xterm-ghostty` terminal type with truecolor
- Seamless pane navigation between nvim and tmux via `<C-hjkl>` (checks if vim is active)
- Pane resizing with `<M-hjkl>` (Alt)
- Resurrect preserves nvim sessions

## Zsh Configuration
- Plugin manager: Zim Framework
- Modules: syntax highlighting, autosuggestions, history substring search
- Dev tools: NVM (with auto-switch via `.nvmrc`), pyenv + pyenv-virtualenv
- Emacs keybindings (not vi mode) despite vim-heavy tooling

## Gotchas

1. **Leader must be set before plugins load** - `init.lua` sets leader before requiring lazy-bootstrap
2. **Copilot node path is hardcoded** - `copilot.lua:12` points to `$HOME/.nvm/versions/node/v22.20.0/bin/node`; must be > Node 22
3. **Oil.nvim is not lazy loaded** - `lazy = false` is set explicitly because lazy loading causes issues
4. **Format-on-save has fallback chain** - conform uses `lsp_format = "fallback"`, so LSP formatting is used if no explicit formatter is configured
5. **Telescope shows hidden files** - `find_files` and ripgrep both have `--hidden` flag enabled
6. **Stow uses directory structure** - each top-level directory (`.config`, `.tmux.conf`, `.zshrc`) is treated as a "package" by stow. Files at root level (`.tmux.conf`, `.zshrc`) are symlinked directly to `$HOME`
7. **Zim modules order matters** - syntax-highlighting must come before history-substring-search, and autosuggestions must come last (per `.zimrc` comments)
8. **UFO folding requires large foldlevel** - nvim-ufo sets `foldlevel = 99` for its provider to work correctly
9. **Blink.cmp uses Lua fuzzy matcher** - rust implementation is available but opted for Lua (`fuzzy.implementation = "lua"`)
10. **No swap files** - `vim.o.swapfile = false` is set globally
11. **nvim-treesitter uses `main` branch** - the rewrite for nvim 0.12+. Requires `tree-sitter-cli` (`brew install tree-sitter-cli`) to compile parsers from source
12. **nvim-treesitter skips bundled parsers** - nvim 0.12 ships its own parsers for `lua`, `c`, `vim`, `vimdoc`, `markdown`, `markdown_inline`, `query`. Installing duplicates from tree-sitter repos causes query/grammar mismatches. The config only installs additional parsers (go, typescript, bash, etc.)
13. **Built-in commenting** - nvim 0.10+ has `gc`/`gcc` with treesitter context-aware `commentstring`. Removed `Comment.nvim` and `nvim-ts-context-commentstring` plugins
14. **Built-in :Undotree** - nvim 0.12 has `:Undotree` as opt-in package (`packadd nvim.undotree`). Removed `mbbill/undotree` plugin
15. **Diagnostics auto-open float** - `jump = { float = true }` in diagnostic config auto-opens a float window when navigating with `[d` / `]d`
