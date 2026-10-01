# Global Instructions

## Writing code

Write only what the task needs. Every line added has to be read, tested, and
maintained, so the smallest change that fully solves the problem is usually
the best one. Small should come from being necessary, not from golfing.

### Understand first

Read the code the change touches and trace the real flow before choosing a
solution. The smallest diff in the wrong place is just a second bug. Keep the
solution brief, not the reading.

### The ladder

Once you understand the problem, stop at the first rung that holds:

1. **Does this need to exist?** If the need is speculative, skip it and say so in one line.
2. **Already in the codebase?** Reuse the existing helper, type, or pattern. Search before writing; re-implementing something a few files away is the most common source of bloat.
3. **Standard library covers it?** Use it.
4. **Native platform feature covers it?** `<input type="date">` over a picker library, CSS over JS, a DB constraint over app code.
5. **Already-installed dependency covers it?** Use it. Don't add a dependency for what a few lines can do.
6. **Can it be one clear line?** Write one line.
7. **Otherwise:** the minimum code that works.

If two options are the same size, pick the one that handles edge cases
correctly. The goal is fewer lines, not a flimsier algorithm.

### Bug fixes

A report describes a symptom. Before editing, find every caller of the code
you're about to change. Fixing the shared function once is both the smaller
diff and the correct one; patching only the path the report mentions leaves
sibling callers broken.

### Spacing

Keep related variable declarations together. Add one blank line between
those declarations and functional blocks (functions, loops, conditionals),
and between distinct logical blocks.

### Rules of thumb

- No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes.
- No scaffolding "for later". Later can add it when it's real.
- Prefer deleting to adding, boring to clever, fewer files to more.
- For a large or ambiguous request, ship the simple version and flag the gap in the same response ("Did X; Y covers the rest. Need full X? Say so.") rather than stalling on a question you can default.
- When knowingly cutting a corner with a real ceiling (global lock, O(n²) scan, naive heuristic), leave a short comment naming the limit and the upgrade path, e.g. `# global lock; switch to per-account locks if throughput matters`.

### Never cut

Simplicity never justifies removing input validation at trust boundaries,
error handling that prevents data loss or silent failure, security measures,
accessibility basics, or anything explicitly requested. If the user wants the
fuller version, build it without re-arguing.

### Leave one check

Non-trivial logic (branches, loops, parsing, money or security paths) should
leave behind one runnable check, the smallest thing that fails if the logic
breaks: a focused test in the project's existing test setup, or an
assert-based self-check if there isn't one. No new frameworks, fixtures, or
exhaustive suites unless asked. Trivial one-liners don't need a test.

### Output

Code first, then at most a few short lines: what was skipped and when it would
be worth adding (`[change] → skipped: X, add when Y.`). Skip feature tours and
design essays; a long justification of a simplification is complexity smuggled
back in as prose. If the user asks for an explanation, walkthrough, or report,
give it in full.

### Reviewing for complexity

When asked to review for over-engineering, one finding per line:
`file:L<n>: <tag> <what>. <replacement>.` with tags `delete`, `reuse`,
`stdlib`, `native`, `yagni`, `shrink`. End with `net: -N lines possible`, or
`Already lean.` if there's nothing to cut. Report correctness or security
issues separately rather than ignoring them.
