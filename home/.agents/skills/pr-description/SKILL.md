---
name: pr-description
description: "Write or update a pull request title and body. Use whenever creating, opening, drafting, or editing a PR (gh pr create, gh pr edit, origin pr create, a built-in PR tool, 'write the PR description'), including every PR a poteto-mode agent or subagent opens, even if the user never mentions a description. Extends poteto-mode's opening-a-pr playbook. Not for commit messages, review comments, or changelogs."
---

# PR description

A reviewer opens the PR cold, with a pile of other PRs waiting. The body should let them understand the change in under a minute and know where to look hard. Short is the goal, but never at the cost of something they would otherwise have to ask about.

This skill owns the PR title and body only. Under poteto-mode, `../poteto-mode/playbooks/opening-a-pr.md` still owns the rest of the flow: worktree, commits, `/deslop`, `/no-comments`, forge choice, built-in PR tool, opening ready instead of draft, stacks, and no babysit on open. This skill's format matches that playbook's, so the two never conflict. If the playbook changes, follow the playbook.

## Before writing

Read the real diff (`git diff <base>...HEAD`) and the commit log. Describe what the code does now, not what you intended or what the commits said along the way. If the diff and your memory disagree, trust the diff.

Gather the evidence while you still have it. A claim in the body needs a run you did in this session, not a recollection.

## Title

Conventional Commits, `type(scope): subject`, no trailing period. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`. Subject is short, imperative, and names a real symbol when one carries the change. If the repo clearly uses another convention (ticket prefix, plain sentences), follow the repo.

## Body

Use `##` headings in this order and drop any section with nothing real to say. If the repo has a PR template, fill that in instead and delete sections that do not apply.

- `## Why`: the problem and approach in one to three short sentences. Under poteto-mode, open with the user's goal. No SHAs, rebase history, or "based on main" preamble. Link the ticket here.
- `## What changed`: one to three short bullets, behavior first. Name a real symbol or path only when it carries the change. Name both sides of a rename or retarget.
- `## Scope`: what it covers and what it deliberately leaves out (a follow-up, a known gap). One to three short items. Say plainly what is not tested or not done.
- `## Tradeoffs`: only the rejected alternatives a reviewer would otherwise ask about. Skip when there was no real choice.
- `## Blast Radius`: one or two sentences on who or what it touches and why that is safe or risky. Migrations, flags, config changes, and breaking changes belong here. For a nontrivial or risky diff, run the **blast-radius** skill first and report what it proved. If main is red, state the cost of leaving it red.
- `## Verification`: one to three bullets, each a real command or path you ran and what you saw. UI changes get a screenshot or recording. Perf claims give one primary number with its unit as `before → after`, checked with the **benchmark-checklist** skill, and link the arena or swarm directory for the rest.

A one-line fix gets a one-line body. Match length to what the reviewer has to learn, not to the size of the diff.

## Keep out of the body

Full SHAs, swarm or arena lane recitals, sample-size methodology, metric tables, file-by-file checklists, and "CLEAN" verdicts. Put them in a linked artifact. For long or unattended work, link the **show-me-your-work** decision trail instead of retelling it. The body often becomes the squash commit body, so keep it under about 40 lines.

## Content rules

- Lead with the point. Do not restate the title or open with "This PR".
- Tell the reviewer what the diff cannot show: intent, context, tradeoffs, and what you verified. Do not narrate the diff.
- State facts, not confidence. Replace "should work" with what you ran. Do not claim a test passed unless you ran it.
- Surface the uncomfortable parts: hacks, known gaps, skipped tests, anything you are unsure about.
- No emoji, marketing tone, or template checkboxes you did not do.
- Add agent attribution lines only when the user's instructions ask for them.

## Finish

Write the body with the **technical-writing** skill (every layer except Diátaxis), then run **unslop** on it and apply its edits. Check afterward that neither cut a concrete detail such as a flag, a number, or a path. Then create or edit the PR with the cleaned text.
