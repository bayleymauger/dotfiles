---
name: no-comments
description: "Send Comment Sicko through a diff to delete comments, then fix the code its kills point at and offer real enforcement for claimed constraints. Use for /no-comments or 'strip the comments from this diff'."
disable-model-invocation: true
---

# No comments

Spawn Comment Sicko. Act on accepted findings.

Defer to Comment Sicko's fresh perspective.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base branch, default `main`, including the working tree.

## Steps

1. **Spawn Comment Sicko.** Use the `subagent` tool with `agent: general`. Leave `model` unset. Its prompt is the scope plus an instruction to read `references/comment-sicko.md` (give the absolute path under this skill's base directory) and follow it exactly. Do not restate its rules.
2. **Inspect its report and diff.**
   - Reject application-code edits, edits outside the scope, deletions of comments a keep exception protects, `MUST KILL` flags with misstated reasons, and flags that treat intentionally kept code as guilty.
   - Reshape flags on surprises in our own code stay actionable. Do not restore those comments. A keep survives only with proof it is about something we cannot change.
   - Audit lint and TypeScript suppressions in scope that it missed. Suppressions that protect correctness or safety stay actionable `MUST KILL`s.
   - Restore a deletion only when it matches an exact exception, with proof scoped to that comment.
   - Before accepting a kill or keep of a thin `IMPORTANT` or `do not remove` comment, run the `how` or `why` skill on its symbol. If a kill is still ambiguous, do not restore it. If a keep is refuted or still ambiguous, delete it.
   - If you reject the report, revert its edits and rerun it once with the failure named. If you reject the second report too, report it as open and fail `/no-comments`.
3. **Fix trivial accepted flags directly.** Delete the dead path, drop the parameter, or use the real API.
4. **Sketch before any fix that needs a new shape.** For the whole accepted set and the code around it, write the types, signatures, and module boundaries with stub bodies. Do this once, and stop at the sketch. Step 5 implements it.
5. **Implement the smallest root-cause fix in scope.** Remove every named workaround. Never bolt on a symptom guard such as a null check that silences a crash. If the root cause is out of scope, land the smallest in-scope fix and report the rest as open. Fixing the root cause never authorizes widening the scope or fixing the same pattern outside it.
6. **Handle constraint comments.** These say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. For the rest, offer the cheapest in-scope type, runtime check, test, or CI lint that enforces the constraint. Ask with the `question` tool and wait for approval. In unattended runs, only proceed with approval the caller gave up front. If approved, encode the constraint, then delete the comment. Otherwise delete the comment, report the constraint as open, and sketch the out-of-scope work.
7. **Verify.** Run the project's lint, typecheck, and tests on what you touched.
8. **Report.** Give the deletion count, restored comments, reruns, the sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.
