# dotfiles

This repository contains my personal dotfiles. These are the base configuration files that I use to set up a new machine to my liking.

## Dependencies

- [GNU Stow](https://www.gnu.org/software/stow/)
- [Git](https://git-scm.com/)

GNU Stow is a symlink farm manager which takes distinct packages of software and/or data located in separate directories on the filesystem, and makes them appear to be installed in the same place.

Git is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency.

## Quick Start (Recommended)

Clone the repository and run the setup script. It handles everything: installing dependencies, symlinking configs, and initializing tools.

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./setup
```

The script supports **macOS** (via Homebrew) and **Linux** (apt, dnf, or pacman). It will:

1. Install required packages (git, stow, neovim, tmux, zsh, lazygit, tree-sitter, etc.)
2. Install JetBrains Mono Nerd Font
3. Symlink all dotfiles via Stow
4. Set up Tmux Plugin Manager (TPM) and install plugins
5. Initialize the Zim framework for Zsh
6. Install Neovim plugins
7. Install NVM + Node.js and pyenv + Python
8. Set Zsh as the default shell (macOS)

### macOS

On macOS, dependencies are managed via a `Brewfile`. The setup script runs `brew bundle` automatically. You can also install manually:

```bash
brew bundle
```

### Linux

On Linux, the script detects your distribution and installs packages via the native package manager (apt, dnf, or pacman). Some tools like `tree-sitter` may need Rust/cargo if not available in your repos.

## Manual Installation

If you prefer to manage dependencies yourself, clone the repo and use Stow directly:

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
stow */
```

This will create a symlink for each item in the `dotfiles/` directory in your home directory.

### Tmux Plugins

After stowing, install tmux plugins by opening tmux and pressing `prefix + I` (defaults to `Ctrl-a I`).

### Zim Framework

Zim is auto-installed on first shell launch via `.zshrc`. If it doesn't initialize, open a new terminal or run:

```bash
zsh -c "source ~/.zim/zimfw.zsh init -q"
```

## What's Configured

| Tool | Config | Notes |
|------|--------|-------|
| Neovim | `.config/nvim/` | Lua-based, built-in package manager (nvim 0.12+) |
| tmux | `.tmux.conf` | TPM, TokyoNight theme, resurrect, vim-aware pane navigation |
| Zsh | `.zshrc`, `.zimrc` | Zim framework, syntax highlighting, autosuggestions |
| Ghostty | `.config/ghostty/` | JetBrains Mono, TokyoNight theme, cursor shader |
| OpenCode | `.config/opencode/` | AI assistant config with MCP servers |

## Adding New Dotfiles

To add new dotfiles, create a new directory in the `dotfiles/` directory and place the dotfiles you want to manage in it. Then run `stow` as described above.

## Removing Dotfiles

To remove a symlink, navigate to your `dotfiles/` directory and use the `-D` option with stow:

```bash
cd ~/dotfiles
stow -D directoryname
```

This will remove the symlink but leave the original file in place.

## Contributing

If you have suggestions for how I could improve this setup, please let me know or open an issue on GitHub.
