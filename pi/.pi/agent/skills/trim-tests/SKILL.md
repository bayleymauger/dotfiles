---
name: trim-tests
description: Trim low-value unit tests, keeping a small, focused suite of high-value ones that cut test execution time. Use when the user asks to trim, prune, slim down, de-bloat, dedupe, or clean up tests or specs, says tests are excessive, redundant, trivial, slow, or AI-generated ("tests for everything"), or wants a test cleanup pass over the current changes, a file, or a directory. Never removes tests that protect important behavior. Defaults to the current uncommitted changes when no scope is given.
---

# Trim Tests

Cut tests until every remaining one earns its place. Each test costs execution time on every run, has to be maintained, and adds noise when it fails for reasons nobody cares about. A good test fails only when real behavior breaks, and fails loudly.

## The hard rule: never drop an important test

Removing a test that guarded real behavior is far worse than keeping ten trivial ones, because the bug it would have caught ships silently. So:

- If a test is important (see "What to keep"), it stays. Do not delete it, comment it out, or disable it with `skip`/`xfail`/`.only`/`xit`/`t.Skip()` or similar.
- If you're unsure whether a test is important, keep it and mention it in the summary as a candidate for the user to decide.
- Don't weaken a kept test (loosening assertions, removing edge cases that matter) to make it shorter or faster.

## Scope

Use the scope the user gives (files, directory, commit range). If none, use the current changes: `git diff HEAD` plus untracked files, restricted to test files. Stay within that scope, and only touch tests and test helpers/fixtures, never production code.

Before judging a test, read the code it exercises. Value depends on what the code does: a three-line test of a money-rounding function matters; a three-line test of a getter doesn't.

## What to keep

Tests that would catch a bug someone would actually care about:

- Security and access control: auth, permissions, input validation at trust boundaries, injection, secrets handling
- Money, billing, quotas, and anything with legal or compliance weight
- Data integrity: persistence, migrations, serialization formats, anything that could lose or corrupt data
- Regression tests for real bugs (especially ones referencing an issue or incident)
- Public API and contract behavior other code or users depend on
- Non-trivial logic: branching, parsing, state machines, algorithms, date/time and timezone math, concurrency
- Error handling that prevents silent failure
- Meaningful boundaries and edge cases (empty, zero, max, off-by-one, invalid input) for that logic

## What to cut

- Tests of trivial code: getters/setters, plain constructors, constants, simple pass-through or delegation
- Tests of the language, framework, or a library rather than this code (e.g. that `JSON.stringify` works, that a dataclass stores fields)
- Things the type system or a linter already enforces
- Tests that only verify mocks: everything that matters is mocked and the assertion checks the mock was called with what the test just set up
- Implementation-detail tests that break on harmless refactors (private call counts, internal ordering) while a behavior test already covers the outcome
- Duplicates: several tests walking the same code path with inputs that differ in no meaningful way. Keep the representative and the boundaries.
- "Renders/constructs without crashing" smoke tests when other tests already exercise the same thing
- Snapshot tests of trivial or volatile output that nobody reviews

## How to edit

- Prefer deleting whole low-value tests. Merge near-duplicates into one test, or a parametrized/table-driven test if the project already uses that style, only when that keeps every meaningful case.
- After removing tests, delete fixtures, helpers, mocks, and imports that are now unused. Remove a test file entirely if nothing of value is left in it.
- Note slow tests (real sleeps, network, large fixtures) that you kept because they're important; suggest a faster approach in the summary instead of rewriting them unasked.
- Don't add new tests or expand scope. If the suite is already lean, "no changes needed" is a valid outcome.
- Run the affected tests afterwards with the project's existing test command and confirm they pass. If they fail, fix the trimming mistake, not the production code.

## Summary

Keep the reply brief:

- Test count before → after (and runtime if cheaply measured)
- Removed tests, grouped by file, each with a few-word reason (`trivial getter`, `duplicate of X`, `tests the mock`)
- Borderline tests kept for the user to decide, and slow-but-important tests with a speed-up idea
- Test run result
