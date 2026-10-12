---
name: trim-tests
description: "Cut low-value tests until every remaining one would catch a bug someone cares about, without dropping any test that guards important behavior. Defaults to the current uncommitted changes. Use for 'trim the tests', 'too many tests', 'prune, dedupe, or slim down these specs', or a cleanup pass over AI-generated tests."
disable-model-invocation: true
---

# Trim tests

Cut tests until each one left fails only when real behavior breaks. Every test costs run time and upkeep, so a test that catches nothing is pure cost.

Never drop a test that guards important behavior. Shipping the bug it would have caught costs more than keeping ten trivial tests.

## Scope

Use the files, directory, or commit range the caller gives. Otherwise use `git diff HEAD` plus untracked files, limited to test files. Edit only tests, fixtures, and test helpers. Never touch production code.

## Keep

A test stays if it would catch a bug in any of these:

- Auth, permissions, input validation at trust boundaries, injection, secrets.
- Money, billing, quotas, and anything with legal or compliance weight.
- Persistence, migrations, serialization formats, and anything that can lose or corrupt data.
- A real past bug. Regression tests that cite an issue or incident always stay.
- A public API or contract that other code or users depend on.
- Branching, parsing, state machines, algorithms, date and timezone math, concurrency.
- Error handling that prevents a silent failure.
- The boundaries of that logic, like empty, zero, max, off by one, and invalid input.

## Cut

- Getters, setters, plain constructors, constants, and pass-through delegation.
- Tests of the language, framework, or a library instead of this code.
- Anything the type checker or linter already enforces.
- Mock echoes, where the assertion checks that a mock received what the test just handed it.
- Implementation-detail tests, like private call counts or internal ordering, when a behavior test already covers the outcome.
- Duplicates that walk the same path with inputs that differ in no meaningful way. Keep one representative and the boundaries.
- "Renders without crashing" smoke tests when other tests exercise the same code.
- Snapshots of trivial or volatile output that nobody reviews.

## Steps

1. Run the scoped tests with the project's test command. Record the count and runtime. If any already fail, stop and report them.
2. Read the code each test exercises before judging it. A three-line test of a rounding function matters. A three-line test of a getter does not.
3. Sort every test into keep, cut, or unsure. Unsure stays and goes in the reply for the user to decide.
4. Flag kept tests of important behavior that would still pass if every function they import returned `undefined`. The **principle-test-behavior-not-implementation** skill lists the shapes. Keep them and report them as weak. Do not rewrite them unasked.
5. Delete whole cut tests. Merge near-duplicates into one test, or into a table-driven test if the file already uses that style, only when every meaningful case survives. Never skip, comment out, or `.only` a test instead of deleting it. Never loosen a kept test's assertions or drop its edge cases to shorten it.
6. Delete the fixtures, helpers, mocks, and imports the cuts left unused. Delete a test file once nothing of value is left in it.
7. Rerun the same command. Fix any failure in the trimming, never in production code.

Don't add tests or widen scope. A lean suite with no cuts is a valid result. For slow tests that stay, like real sleeps, network calls, or large fixtures, name a faster approach in the reply instead of rewriting them.

**Reply:** test count and runtime before and after, cuts grouped by file with a few-word reason each (`trivial getter`, `duplicate of X`, `mock echo`), unsure and weak tests kept for the user, slow kept tests with a speed-up idea, and the final test run result.
