---
name: requesting-code-review
description: Use when completing tasks, implementing major features, fixing complex bugs, or before merging to get an independent review of the changes - works with or without a plan or spec. For reviewing someone else's GitHub PR, use reviewing-github-prs instead
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often, and keep it light. The reviewer is an unblocker, not a gatekeeper. It approves by default, leaves a few surgical comments, and blocks only on a short list of tripwires: broken behavior, security, data loss, an unplanned breaking change, a missing core requirement, or tests that give false confidence.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or: git merge-base origin/main HEAD
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code reviewer subagent:**

Fill the `prompt:` body of the template at [code-reviewer.md](code-reviewer.md), save it to a file, and spawn it with the `pi-subagent` skill's `reviewer` profile (read that skill's SKILL.md first if you haven't). Run it from the repo so the reviewer can see the commits:

```bash
S=<this-skill-dir>/../pi-subagent/scripts/pi-subagent
$S spawn -a reviewer -n review-<short-topic> -f /tmp/review-prompt.md
$S wait review-<short-topic>
```

The template's verdict format and tripwires take precedence over the profile's defaults. Use one reviewer per review. The template already tells it not to fan out.

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - Optional. Plan, task text, or issue if one exists; otherwise "None provided" and make `{DESCRIPTION}` say what the change is meant to do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit

**3. Act on the verdict:**
- **Approve:** proceed.
- **Approve with comments:** proceed. Apply a comment now if it's cheap and clearly right, otherwise note it for later. Comments never block.
- **Request changes:** fix every Blocking item before proceeding, then re-request review on the fix.
- Rule on each "Declined to judge" line. Accept the set-aside or bring it into scope.
- Push back if the reviewer is wrong, with reasoning.
- If the reviewer blocked on something that isn't a tripwire, treat it as a comment.

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Verdict: Approve with comments
  Comments:
    - indexer.ts:130: no "X of Y" progress on long runs
  Declined to judge: None.

You: [Cheap fix, so add the progress counter]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just review the diff myself instead of dispatching a reviewer" | You're the coordinator — reviewing the diff inline burns the context window you need to keep driving the work. Dispatch a reviewer subagent: the diff and the evaluation live in its context, and only the findings come back to you. |
| "The reviewer needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the reviewer on the work product, not your thought process. |

## Red Flags

**Never:**
- Skip review because "it's simple"
- Proceed past a Request changes with Blocking items still unfixed
- Let non-blocking comments stall the work
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: [code-reviewer.md](code-reviewer.md)
