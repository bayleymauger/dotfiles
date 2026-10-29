---
name: pr-description
description: "Write or update a pull request title and description. Use whenever creating, opening, drafting, or editing a PR (gh pr create, gh pr edit, 'write the PR description', 'open a PR'), even if the user does not mention a description. Not for commit messages, code review comments, or changelogs."
---

# PR description

A reviewer opens the PR with a cold head and a pile of other PRs. The description should let them understand the change in under a minute and know where to look hard. Short is the goal, but never at the cost of something they would need to ask about.

## Before writing

Read the actual diff (`git diff <base>...HEAD`) and the commit log. Describe what the code does now, not what you intended or what the commits say along the way. If the diff and your memory of the task disagree, trust the diff.

## Structure

Title: imperative, under 72 characters, says what changed. Follow the repo's convention if it has one (conventional commits, ticket prefix).

Body, in this order. Drop any section that has nothing real to say.

1. **Why** - one to three sentences. The problem or goal, and the user or system impact. Link the ticket or issue here.
2. **What** - what changed, in terms of behavior first, then notable code. A short bullet list is fine. Name real files, functions, flags, and commands.
3. **Review guide** - only when it helps: where to start, what is risky, what is mechanical (renames, generated files, moved code) and can be skimmed.
4. **Decisions** - non-obvious choices and the alternative you rejected, in one line each. This saves the "why not X?" round trip.
5. **Testing** - what you ran and what you saw, specific enough to repeat. Include UI screenshots or recordings for visual changes. Say plainly what is not tested.
6. **Risk and rollout** - migrations, feature flags, config or env changes, breaking changes, follow-up work, rollback. Omit for a safe, self-contained change.

A one-line fix gets a one-line body. Match length to how much the reviewer has to learn, not to the size of the diff.

## Content rules

- Lead with the point. No restating the title, no "This PR".
- Do not narrate the diff file by file. The reviewer can see the diff; tell them what it cannot show: intent, context, trade-offs, and what you verified.
- State facts, not confidence. Replace "should work" and "seems fine" with what you ran.
- Surface the uncomfortable parts: known gaps, hacks, skipped tests, anything you are unsure about. A reviewer who finds these themselves trusts the rest less.
- Do not claim tests passed unless you ran them in this session.
- No headings for sections that hold one sentence; use a bold label or plain prose.
- No emoji, no marketing tone, no checklist of template boxes you did not do. If the repo has a PR template, fill it in and delete sections that do not apply.
- Do not add agent attribution lines unless the user's instructions ask for them.

## Finish with /unslop

Run the `unslop` skill on the draft before using it, and apply its edits. Check afterward that unslop did not delete a concrete detail (a flag name, a number, a file path) in the name of brevity. Then create or update the PR with the cleaned text.
