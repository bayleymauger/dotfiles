---
name: pi-subagent
description: Spawn other pi instances as subagents (scout, researcher, worker, reviewer, oracle, planner, and more), in tmux windows or panes the user can watch, or as background processes when tmux isn't available, then wait for and collect their results. Each profile picks a model tier that suits the job for the current provider. Use whenever a task says to dispatch, delegate to, or spawn a subagent, reviewer, worker, or second opinion; when independent pieces of work can run in parallel; when a job (review, research, large exploration) would flood your context window; or when the user asks to run pi in another tmux pane or window, even if they don't say "subagent".
---

# pi subagents

pi has no built-in subagent tool. A subagent is just another `pi` process with
its own fresh context. `scripts/pi-subagent` (relative to this skill's
directory) starts one, tracks it, and hands back its final answer:

- **Inside tmux** each run gets a detached tmux window (or a pane with
  `--pane`), so the user can watch it live and step in.
- **Outside tmux** it falls back to a background `pi -p --no-session` process,
  the same way pi's own example subagent extension does it.

Subagents get `AGENTS.md` and skills as usual. They can't spawn their own
subagents (`PI_SUBAGENT=1` blocks it), which prevents runaway recursion.

## Commands

```bash
S=<this-skill-dir>/scripts/pi-subagent

$S profiles                                     # profiles + resolved models
$S spawn -a scout -n scout-api "Find every caller of fetchUser() ..."
$S spawn -a reviewer -n review-auth -f /tmp/review-prompt.md
$S wait scout-api review-auth        # blocks, then prints each final answer
$S list                              # name, profile, mode, status
$S peek scout-api 60                 # last 60 lines of its pane (or log)
$S kill scout-api
```

`spawn` prints the run name. Its options are `-a PROFILE`, `-n NAME`,
`-f FILE` (`-` = stdin), `-C DIR` (cwd), `-m MODEL[:thinking]`, `--pane`,
`--no-tmux`, and `-i`. Anything after `--` goes straight to pi, e.g.
`-- --tools read,bash`.

## Profiles

Each profile in `profiles/` adds a role prompt, a tool allowlist, and a model
tier:

| Profile | Tier | Use it when you want... |
|---|---|---|
| `scout` | fast | Quick read-only recon: relevant files, entry points, data flow, risks |
| `researcher` | standard | Web/docs research with sources (uses the brave-search skill) |
| `evidence-auditor` | deep | To check that key research claims are really supported by their sources |
| `worker` | standard | Implementation: narrow edits plus validation, escalates unapproved decisions |
| `reviewer` | standard | Read-only review of a diff, plan, proposed solution, or codebase |
| `oracle` | deep | A second opinion before acting. Forks your conversation, so it knows what was decided; never edits |
| `planner` | intent | Turn vague requirements into a scoped plan; UX/product judgment calls |
| `delegate` | inherit | A general helper that behaves like you (same model, no role prompt) |

Rule of thumb: `scout` before you understand the code, `researcher` before
you trust external facts, `evidence-auditor` before you rely on important
research, `planner` when scoping is the hard part, `worker` to implement,
`reviewer` to check, and `oracle` when the decision itself feels risky. A
good loop for real changes is scout → (planner) → worker → fresh reviewer →
worker.

When a task supplies its own rubric or output format (like the
requesting-code-review template), the profiles follow it over their defaults.
For a custom role, pass a path: `-a ./my-role.md`, with the same frontmatter
as the files in `profiles/`.

### Model tiers

Profiles name a tier, not a model. `tiers` maps each provider and tier to a
model for the parent session's `$PI_PROVIDER`, so the same profile uses
Claude models on `anthropic` and GPT models on `openai-codex`:

- **fast**: cheapest capable model, low thinking. Recon, lookups, mechanical edits.
- **standard**: mid-tier, medium thinking. Most well-scoped work.
- **deep**: top reasoning model, high thinking. Hard tasks with explicit
  completion criteria. These models tend to loop on vague goals, so keep
  them off open-ended work.
- **intent**: reads human intent and makes judgment calls without looping.
  Use it when scoping or judging is the task itself.

When the provider has no row for a tier, the run uses your model and thinking
level instead (with a note on stderr). `-m` always wins. Run `$S profiles` to
see what each profile resolves to right now. To support another provider,
add four rows to `tiers`.

When the user asks to update the subagent models, run `$S tiers`. It compares
each row with `pi --list-models` and reports newer versions of the same model
family (e.g. `gpt-6-sol` → `gpt-6.1-sol`). `$S tiers --update` rewrites those
rows and keeps each row's `:thinking` level. It also lists model families that
no tier uses yet. Switching a tier to a different family is a judgment call,
so suggest it to the user rather than editing `tiers` yourself.

## Choosing a mode

- **One-shot (default)**: `pi -p`. The process exits when the task is done,
  so completion is reliable and the full answer lands in `output.md`. Use it
  for anything self-contained. The window shows the output at the end, then
  closes.
- **Interactive (`-i`, tmux only)**: the full pi TUI. The subagent is told to
  write its answer to `output.md` and touch `.done` when it finishes, and
  after every follow-up. Use it when the user wants to watch or steer, or when
  you expect to send follow-ups with `$S send NAME "message"` (or
  `send NAME -f file`), then `wait` again. It stays open until the user or
  `kill` closes it.

Prefer windows over panes when you start more than two runs, because panes
split the user's current window and quickly get too small.

## Writing the prompt

Apart from `oracle`, which forks your conversation, a subagent knows nothing
about your session. The prompt is all it has. Write it to a file with `-f`
once it's longer than a line; that avoids quoting trouble. Include:

- the goal and why it matters
- concrete paths, commands, SHAs, constraints
- what to return. The final message is all you get back, so ask for a
  compact, self-contained report, or rely on the profile's default format.

Don't paste your session history. A tightly scoped brief gives better results
and keeps the subagent off your reasoning.

## Waiting and collecting

- `wait` blocks until every named run is done, then prints
  `=== name (status, exit N) ===` followed by its answer. It defaults to a
  1800s timeout and exits 124 on timeout. Give your bash tool call a timeout
  at least as long, or pass `-t`. After a timeout, `peek` to check progress,
  then `wait` again or `kill`.
- Spawn all independent runs first, then make one `wait` call for all of
  them, so they run in parallel. Run only one `worker` at a time on the same
  checkout, because parallel writers clobber each other.
- A `dead` status means the pane or process went away without reporting
  (the user closed it, or pi crashed). `wait` prints the tail of the log when
  there is one. Retry once or do the work yourself.
- Treat subagent output as a colleague's report, not ground truth.
  Spot-check claims that matter before acting on them, and act on any
  "Need from parent" items.

Run state lives in `/tmp/pi-subagents/<name>/` (`prompt.md`, `system.md`,
`run.sh`, `output.md`, `exit_code`, `log`). Override it with
`PI_SUBAGENT_DIR`. Names must be unique, so reuse one only after deleting its
directory.

## Example

```bash
cat >/tmp/scout.md <<'EOF'
In /home/me/app, find every place session tokens are created, refreshed, or
revoked, and note any inconsistencies between them.
EOF
$S spawn -a scout -n scout-tokens -f /tmp/scout.md
$S spawn -a scout -n scout-tests "In /home/me/app, list which token-related tests exist and which code paths in src/auth/ have none."
$S wait scout-tokens scout-tests
```
