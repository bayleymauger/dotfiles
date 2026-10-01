---
name: trim-docs
description: Trim unnecessary code comments and documentation, keeping only what helps a reader. Use when the user asks to trim, tighten, clean up, de-bloat, or cut comments/docstrings/READMEs/markdown docs, says comments are noisy, verbose, redundant, or AI-sounding, or wants a docs cleanup pass over the current changes, a file, or a directory. Defaults to the current uncommitted changes when no scope is given.
---

# Trim Docs

Edit comments and documentation so every remaining line earns its place. Readers pay for each line they skim; a comment that restates the code costs attention and drifts out of date.

## Scope

Use the scope the user gives (files, directory, commit range). If none, use the current changes: `git diff HEAD` plus untracked files. Stay within that scope, and only touch comments and docs, never code behavior.

## What to keep

Text that helps someone use the code or understand what the code can't say on its own:

- Non-obvious intent ("why", not "what")
- Constraints, invariants, pitfalls, workarounds and the bug/issue they address
- Usage instructions, public API contracts, examples people actually need
- License notices and tool directives (`eslint-disable`, `# type: ignore`, `//go:build`, `noqa`, modelines, etc.) — tools depend on these

## What to cut

- Comments that restate the code (`// increment i`, `# return the result`)
- Redundant explanations, repeated across docstring and inline comments
- Filler and throat-clearing ("This function is responsible for...", "Note that...")
- Stale text that no longer matches the code
- Commented-out code, unless it's clearly kept on purpose with a reason

## How to edit

- Shorten useful text to be direct, but keep essential context, warnings and instructions intact.
- Fix stale text when the correct version is obvious from the code; otherwise remove it or flag it.
- Don't add documentation for its own sake or expand scope. If text is already useful and concise, leave it alone — "no changes needed" is a valid outcome.

## Summary

Keep the reply brief: files touched and a line on what kind of text was cut. Mention anything flagged but not changed.
