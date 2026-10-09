# dotfiles

Personal dotfiles managed with GNU Stow. Configuration for Neovim, Zsh, Ghostty, and coding agents.

## Quick Start

```bash
git clone https://github.com/bayleymauger/dotfiles.git ~/dotfiles
cd ~/dotfiles
./install.sh
```

The script handles everything on **macOS** and **Linux**:

1. Install Homebrew (if not present)
2. Install all packages from `Brewfile` via Homebrew
3. Install JetBrains Mono Nerd Font (only on GUI machines, skipped if already installed; force with `INSTALL_NERD_FONT=1` or skip with `=0`)
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
`~/.config/nvim/init.lua`.

## What's Configured

| Tool | Config | Notes |
|------|--------|-------|
| Neovim | `home/.config/nvim/` | Lua-based, built-in package manager (nvim 0.12+), Rose Pine theme |
| Zsh | `home/.zshrc` | Manual plugin sourcing (no framework), Starship prompt |
| Ghostty | `home/.config/ghostty/` | JetBrains Mono, Rose Pine theme, translucent background, cursor shader |
| OpenCode | `home/.config/opencode/opencode.json` | Sharing and snapshots off, allowlisted providers |
| OpenCode skills | `home/.config/opencode/skills/` | Code understanding, review, writing and coding skills |

### Shell Stack

- **Starship** - fast, minimal prompt
- **Zoxide** - smart `cd` replacement
- **Atuin** - searchable shell history
- **fzf** - fuzzy finder
- **eza** - modern `ls` replacement
- **bat** - modern `cat` replacement
- **zsh-autosuggestions** - fish-like autosuggestions
- **zsh-syntax-highlighting** - command syntax highlighting

## OpenCode Skills

Global skills in `home/.config/opencode/skills/`.

### Invoke directly

Hidden from the model. Load one with `@<skill>` in a prompt.

| Skill | Use it for |
|-------|------------|
| `@architect` | Design a new feature before coding it. Gets two independent design sketches from different model families (newest Opus and Sol), checks them against design red flags, merges the best into one, then builds it. Add "with checkpoint" to review the design first. |
| `@prototype` | Settle one design decision with throwaway variants behind a switcher, such as a layout, interaction or approach. Shows screenshots or measurements and recommends one. |
| `@how` | How does X work, or where should this code live. Explores with subagents and returns an architectural explanation. |
| `@why` | Why is X built this way. Searches git, PRs and every connected MCP (e.g. Glean) and returns a cited answer with confidence levels. |
| `@teach` | Help me understand X. Runs `how` and `why`, then explains it plainly at your pace. |
| `@blast-radius` | What could this change break outside the diff. Proves the key safety fact by running real code. |
| `@interrogate` | Adversarial multi-model review of a diff. Uses the newest Anthropic Opus and OpenAI Sol, then gives one verdict. Never edits code. |
| `@cross-examine` | Respond to review feedback on your PR. Checks each comment against the code, then fixes it with proof, dismisses it with a reason, or asks you. Shows you every commit and reply before pushing or posting. |
| `@no-comments` | Strip comments from a diff. A subagent deletes every comment except license headers, public API docs and constraints from code we can't change, and flags the code each workaround comment was excusing. Then it fixes that code. |
| `@bro` | Restate the last answer in plain language, no jargon. |

### Auto-invoked

The model loads these when the task fits.

- **Writing:** `technical-writing`
- **Coding:** `typescript-best-practices`, `tdd`, `benchmark-checklist`
- **Planning:** `principle-exhaust-the-design-space`,
  `principle-foundational-thinking`, `principle-sequence-verifiable-units`,
  `principle-redesign-from-first-principles`
- **Principles:** `principle-type-system-discipline`,
  `principle-boundary-discipline`, `principle-test-behavior-not-implementation`,
  `principle-laziness-protocol`, `principle-subtract-before-you-add`,
  `principle-minimize-reader-load`, `principle-model-the-domain`,
  `principle-encode-lessons-in-structure`, `principle-explain-the-number`

To switch a skill between the two groups, add or remove
`disable-model-invocation: true` in its `SKILL.md` frontmatter.

### Always on

The writing rules (no AI tells, plain words, no em dashes) live in
`home/.config/opencode/AGENTS.md`, which OpenCode loads into every session.
The `unslop` skill points to them so other skills can ask for a deliberate
pass.

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
