---
name: reviewing-github-prs
description: Review someone's GitHub pull request and leave feedback on it with gh, as a drafted review with inline file:line comments that is posted only after the user approves it. Use whenever the user shares a GitHub PR URL or number, asks to review, look over, or give feedback on a PR, wants to approve or request changes on a PR, or says something like "can you check #123 before I merge it", even if they don't say "review". Not for reviewing your own uncommitted or just-finished work in this session (use requesting-code-review for that).
compatibility: Requires gh (authenticated) and git. Uses the pi-subagent skill and the reviewer template from requesting-code-review.
---

# Reviewing GitHub PRs

This skill adds the GitHub steps around an existing review process. The review
itself comes from `../requesting-code-review/code-reviewer.md` (approve by
default, block only on a tripwire, few surgical comments). Use that template
as written rather than restating its rules, so both skills stay in sync.

The difference from self-review: the output is feedback a human will read on
GitHub, and posting it is public and hard to take back. So you **draft, show
the user, and post only after they say so**.

## 1. Identify the PR

Accept a URL, `#123`, `owner/repo#123`, or "this PR" (the current branch). Work
from a local clone of the repo when one exists (the cwd, or ask). Otherwise
clone it to `/tmp/pr-review-<repo>` with `gh repo clone`. With a URL from a
different repo, pass `-R owner/repo` to `gh pr`/`gh issue` calls and write
the owner and repo out in `gh api` paths (it has no `-R`, and `{owner}/{repo}`
resolves from the cwd's repo).

```bash
gh pr view <N> --json number,url,title,body,author,isDraft,state,baseRefName,headRefOid,closingIssuesReferences
gh pr checks <N>                      # CI status; failing checks are context, not your job to debug
gh pr view <N> --comments             # conversation so far
gh api repos/{owner}/{repo}/pulls/<N>/comments --jq '.[] | "\(.path):\(.line) @\(.user.login): \(.body)"'
```

Read the linked issues (`gh issue view`) when the PR body is thin. They're the
closest thing to a spec. If the PR is closed or merged, say so and ask before
going further.

## 2. Get the commits without touching the user's checkout

The user may have uncommitted work, so don't check out the PR in their tree.
Fetching the PR ref works for forks too:

```bash
git fetch origin "pull/<N>/head" "<baseRefName>"
HEAD_SHA=<headRefOid>                       # verify: git rev-parse FETCH_HEAD
BASE_SHA=$(git merge-base "origin/<baseRefName>" "$HEAD_SHA")
git worktree add --detach "/tmp/pr-<N>" "$HEAD_SHA"
```

The merge-base, not the base branch tip, is what GitHub's "Files changed" tab
shows. Diffing against the tip would pull in unrelated commits from main.

## 3. Dispatch the reviewer

Fill the `prompt:` body of `../requesting-code-review/code-reviewer.md`:

- `[DESCRIPTION]`: PR title, author, and body (trimmed of templates/boilerplate)
- `[PLAN_OR_REQUIREMENTS]`: linked issue text, or "None provided"
- `[BASE_SHA]` / `[HEAD_SHA]`: from step 2

Then append this section, because the reviewer can't see GitHub:

```
## PR context
This is someone else's GitHub PR, so your comments go to its author.
CI: <one line per failing/pending check, or "all passing">
Already raised by other reviewers (don't repeat these unless you disagree):
<file:line - gist, one per line, or "None">
Use paths relative to the repo root and line numbers in the HEAD version of the file.
```

Spawn from the worktree so the reviewer reads the PR's code:

```bash
S=<this-skill-dir>/../pi-subagent/scripts/pi-subagent
$S spawn -a reviewer -n pr-<N> -C /tmp/pr-<N> -f /tmp/pr-<N>-prompt.md
$S wait pr-<N>
```

## 4. Check, then draft the review

Before drafting, open the code behind each Blocking item yourself and confirm
it. A wrong blocker on a public PR costs the author time and costs the user
credibility. Downgrade or drop anything that doesn't hold up, and say so.

Map the verdict to a GitHub review event:

| Verdict | Event |
|---|---|
| Approve | `APPROVE` |
| Approve with comments | `APPROVE` (comments are non-blocking) |
| Request changes | `REQUEST_CHANGES` |

Use `COMMENT` instead when the PR author is the authenticated user (GitHub
rejects approving your own PR; check with `gh api user --jq .login`) or when
the user wants to give feedback without a verdict.

Rewrite the findings for a human author. Keep the substance and drop the
reviewer's internal wording:

- Summary body: one or two sentences on what the PR does and the verdict's reason. No praise padding, no tripwire numbers.
- Blocking items become inline comments that start with `**Blocking:**`, then say what breaks, when, and the suggested fix.
- Non-blocking items become inline comments that start with `nit:` or `suggestion:` so the author knows they can ignore them.
- "Declined to judge" stays out of the review. Show it to the user so they can rule on it.

Show the user the draft (event, body, each `path:line` comment) plus the
declined-to-judge list, and ask whether to post, edit, or drop it.

## 5. Post (only after the user confirms)

Send everything as one review so the author gets a single notification:

```bash
cat > /tmp/pr-<N>-review.json <<'EOF'
{
  "commit_id": "<HEAD_SHA>",
  "event": "APPROVE",
  "body": "Summary...",
  "comments": [
    { "path": "src/indexer.ts", "line": 142, "side": "RIGHT", "body": "**Blocking:** ..." }
  ]
}
EOF
gh api repos/{owner}/{repo}/pulls/<N>/reviews --method POST --input /tmp/pr-<N>-review.json --jq .html_url
```

For a multi-line range, add `"start_line"` and `"start_side": "RIGHT"`. Inline
comments must land on lines inside the diff. If GitHub returns 422 ("line must
be part of the diff"), move those comments into the body as `path:line: ...`
bullets and retry rather than dropping them. Use `"side": "LEFT"` only to
comment on a deleted line, with the line number from the base version.

Give the user the review URL, then clean up: `git worktree remove /tmp/pr-<N>`.
