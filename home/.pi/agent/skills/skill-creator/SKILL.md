---
name: skill-creator
description: Create new pi skills, improve existing ones, and measure how well they work. Use when the user wants to make a skill from scratch, turn a workflow from the conversation into a skill, edit or debug a SKILL.md, run evals or benchmarks comparing a skill against a baseline, or tune a skill's description so it triggers at the right times. Also use when the user asks how pi skills work or where to put one.
---

# Skill Creator

A skill for creating pi skills and iteratively improving them.

The loop:

1. Figure out what the skill should do and roughly how
2. Write a draft
3. Run pi-with-the-skill (and a baseline) on a few realistic test prompts
4. Review the results with the user right here in the session, qualitatively (outputs) and quantitatively (pass rates, time, tokens)
5. Rewrite the skill from the feedback; repeat until satisfied
6. Optionally, optimize the description for triggering accuracy

Work out where the user is in this loop and jump in there. "I want a skill for X" → start at intent. "Here's my draft" → go to evals. "Don't bother with evals, just vibe with me" → do that. Stay flexible.

Paths like `scripts/run-evals.js` below are relative to **this skill's directory** (the folder containing this SKILL.md). Run scripts with `node <this-skill-dir>/scripts/<name>.js`. They're plain Node (20+) with no dependencies.

## Communicating with the user

Users range from seasoned engineers to people who just opened a terminal for the first time. Read context cues. "Evaluation" and "benchmark" are borderline fine; for "JSON", "assertion", "frontmatter", wait for signs the user knows the term, or briefly define it.

---

## How pi skills work (know this before writing one)

- A skill is a directory containing `SKILL.md` (YAML frontmatter + markdown instructions), optionally with `scripts/`, `references/`, `assets/`.
- At startup pi puts each skill's **name, description and file path** into the system prompt. The body is loaded only when the model decides to `read` the SKILL.md, so **the description is the only trigger mechanism**.
- Users can force a skill with `/skill:<name> [args]`. Args are appended as the user request. `disable-model-invocation: true` hides a skill from automatic use (command-only).
- Frontmatter fields: `name` (required; lowercase letters, digits, single hyphens; ≤64 chars; should match the directory), `description` (required; ≤1024 chars; skills without one are not loaded), plus optional `license`, `compatibility`, `metadata`, `allowed-tools`, `disable-model-invocation`.
- Locations: user `~/.pi/agent/skills/` or `~/.agents/skills/`; project `.pi/skills/` or `.agents/skills/`; extra paths through the `skills` setting; shared through pi packages. Check whether the target directory is a symlink (e.g. into a dotfiles repo). If it is, create or edit files at the real location and mention it to the user.
- After creating or editing a skill in a running session, the user needs `/reload` (or a new session) for pi to pick it up.
- Bundled files are referenced by paths relative to the skill directory. pi tells the model where the skill lives.

Read the official doc if anything here seems off for the installed version: run `pi --help` to locate it, or find `docs/skills.md` in the pi install.

---

## Creating a skill

### Capture intent

The conversation may already contain the workflow to capture ("turn this into a skill"). Mine it first: tools used, step order, corrections the user made, input/output formats. Then fill gaps with the user:

1. What should this skill let pi do?
2. When should it trigger (phrases, contexts, file types)?
3. What's the expected output?
4. Should we set up test cases? Objectively checkable skills (file transforms, data extraction, codegen, fixed workflows) benefit. Subjective ones (writing style, design) often don't. Suggest a default, let the user decide.

### Interview and research

Ask about edge cases, input/output formats, example files, success criteria and dependencies before writing test prompts. If research helps (library docs, similar skills), do it up front, using other available skills (e.g. web search) if present, so the user isn't doing the legwork.

### Write the SKILL.md

- **name**: kebab-case, matches the directory.
- **description**: what it does AND when to use it. All "when to use" information belongs here, not in the body (the body isn't visible until after the decision). Models tend to *under*-trigger skills, so be a little pushy. Instead of "Build dashboards for internal data." write "Build dashboards for internal data. Use whenever the user mentions dashboards, metrics, charts of company data, or wants to visualize internal numbers, even if they don't say 'dashboard'."
- **compatibility**: required tools/runtimes, only if relevant.
- **the body**.

Run `node scripts/validate.js <skill-dir>` after writing.

### Skill writing guide

#### Anatomy

```
skill-name/
├── SKILL.md          frontmatter (name, description) + instructions
├── scripts/          executable code for deterministic/repetitive work
├── references/       docs loaded into context only when needed
└── assets/           templates, icons, fonts used in output
```

If scripts need npm packages, add a `package.json` and tell the model to run `npm install` in the skill dir once (see how other installed skills do it). Prefer zero-dependency scripts when practical.

#### Progressive disclosure

1. **Metadata** (name + description): always in context (~100 words), costs tokens in *every* session
2. **SKILL.md body**: loaded when triggered (aim for under 500 lines)
3. **Bundled resources**: loaded or executed on demand (unlimited; scripts can run without being read)

- Near 500 lines? Add hierarchy: move detail into `references/` with clear pointers saying *when* to read each file.
- Reference files over ~300 lines get a table of contents.
- Multi-domain skills: organize by variant (one reference file per framework or cloud provider) so only the relevant one is read.

#### Principle of lack of surprise

No malware, exploits, data exfiltration, or skills whose behavior would surprise the user if described plainly. Roleplay or persona skills are fine.

#### Writing patterns

Use the imperative. Define output formats explicitly when they matter:

```markdown
## Report structure
Use this template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

Include examples:

```markdown
## Commit message format
**Example:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

#### Writing style

Explain **why** instead of stacking MUSTs. Models are smart, and with the reasoning they can handle cases the instructions didn't anticipate. ALL-CAPS ALWAYS/NEVER is a yellow flag; reframe it as an explanation. Keep the skill general, not narrowly fitted to the examples. Write a draft, then reread it with fresh eyes and improve it.

### Test cases

After the draft, write 2-3 realistic test prompts, the kind of thing a real user would type. Show them to the user ("Here are a few test cases I'd like to try. Look right? Want to add any?"), then run them.

Save them to `<skill-dir>/evals/evals.json` (prompts only for now; assertions come later):

```json
{
  "skill_name": "example-skill",
  "evals": [
    { "id": 1, "name": "short-descriptive-name", "prompt": "User's task prompt", "expected_output": "Description of expected result", "files": [] }
  ]
}
```

`files` are paths relative to the skill dir (e.g. `evals/files/sample.csv`). They're copied into each run's working directory. Full schema: `references/schemas.md`.

---

## Running and evaluating test cases

This is one continuous sequence. Don't stop partway.

Results go in `<skill-name>-workspace/`, a sibling of the skill directory (outside any skills folder so pi doesn't try to load it), organized by `iteration-N/`.

### Subagents in pi

pi has no built-in subagent tool. Subagents here are **separate `pi -p` processes** launched by `scripts/spawn.js` and `scripts/subagent.js`:

- **Inside tmux** (`$TMUX` set): each run opens in its own detached tmux window named after the job, so the user can watch live (`prefix` + `w`). This is the default when tmux is available.
- **No tmux**: runs become background processes, logging to `<run-dir>/subagent.log`. Use `--no-tmux` to force this.

Each subagent runs isolated: `--no-skills` plus only the skill under test, no AGENTS.md/CLAUDE.md context files, no extensions, no saved session. It uses the current session's model (`$PI_PROVIDER/$PI_MODEL`) unless `--model` is passed. Add `--context-files` or `--extensions` (the latter needed for MCP tools) if the skill truly depends on them. Every run writes `events.jsonl`, `transcript.md`, `final.md`, `timing.json` (tokens + duration) and `metrics.json` (tool-call counts) automatically.

For any ad-hoc subagent (a grader, comparator, or analyzer), write a jobs file and run `node scripts/spawn.js --jobs jobs.json`:

```json
[{ "name": "grade-e1-with", "out": "/abs/path/grader-run", "cwd": "/abs/path", "prompt": "…", "timeout": 600 }]
```

Keys mirror `subagent.js` flags (`prompt` or `promptFile`, `out`, `cwd`, `skill`, `model`, `thinking`, `tools`, `timeout`, `contextFiles`, `extensions`). The command blocks until every job is done, so run it with a generous timeout, or in the background and poll for each `<out>/.done`.

### Step 1: Launch all runs (with-skill AND baseline) together

```bash
node scripts/run-evals.js --skill-path <skill-dir> --workspace <skill-name>-workspace --iteration 1
```

This creates for every eval and configuration:

```
iteration-1/eval-<id>-<name>/eval_metadata.json
iteration-1/eval-<id>-<name>/with_skill/run-1/{outputs/,work/,transcript.md,timing.json,metrics.json}
iteration-1/eval-<id>-<name>/without_skill/run-1/...
```

and runs everything in parallel (`--parallel 4` by default) so baselines finish alongside the skill runs.

- **New skill**: baseline is no skill (`without_skill`, the default).
- **Improving an existing skill**: snapshot it *before editing* (`cp -r <skill> <workspace>/skill-snapshot`) and pass `--baseline <workspace>/skill-snapshot` → configuration `old_skill`.
- With-skill runs are sent as `/skill:<name> <prompt>` so the skill definitely loads. Pass `--natural` to send the bare prompt instead, which tests triggering and execution together.
- Each subagent gets the eval prompt plus a short harness note: input files are in its cwd (`work/`), deliverables go in `outputs/`, and since nobody will answer questions, assumptions go in `outputs/user_notes.md`.
- Other flags: `--runs 3` (repeat runs for variance), `--only 1,3`, `--model`, `--timeout`.

Run it in the background (`nohup … > <workspace>/run.log 2>&1 &`) or with a long tool timeout. Tell the user what's happening, and that they can watch the tmux windows.

### Step 2: While runs are in progress, draft assertions

Don't just wait. Draft objectively verifiable assertions with descriptive names for each eval, and explain them to the user. Subjective qualities are better left to human review; don't force assertions onto them. Add them to `evals/evals.json` as `"assertions": ["…"]` and to each `eval_metadata.json`.

### Step 3: Grade, then show the results in the session

Once all runs are done:

1. **Grade each run.** Write `grading.json` into each `run-N/` dir, following `agents/grader.md`. The `expectations` array must use the fields `text`, `passed`, `evidence` (`results.js` depends on these names). Check assertions programmatically with a script wherever possible; it's faster, more reliable, and reusable across iterations. For judgment calls, either grade inline or spawn grader subagents in parallel through `spawn.js`, with a prompt like: "Read `<this-skill-dir>/agents/grader.md` and follow it. expectations: [...]. transcript_path: <run>/transcript.md. outputs_dir: <run>/outputs. Write <run>/grading.json."
2. **Print the results**:
   ```bash
   node scripts/results.js <workspace>/iteration-N
   ```
   For each eval this prints the prompt, then for each config/run the ✓/✗ assertions (with evidence for failures), output files, the start of the agent's final message, and time/tokens/tool calls. It ends with a summary table (pass rate, time and tokens per config, with the delta) and a list of assertions that pass in every config (they don't discriminate). It also writes `benchmark.json`. Use `--summary-only` for just the table, or `--lines N` for longer excerpts.
3. **Analyst pass.** Look past the averages (see the "Analyzing Benchmark Results" section of `agents/analyzer.md`): non-discriminating assertions, high-variance or flaky evals, time/token tradeoffs, and things the transcripts reveal (wasted steps, ignored instructions).
4. **Present it to the user** in your reply: a compact per-eval rundown (what the skill version did vs. the baseline, with key excerpts or file contents where they matter), the summary table, and your analyst observations. Point them to the paths if they want to inspect outputs themselves (`<run>/outputs/`, `<run>/transcript.md`, or the tmux windows if still open). Then ask for feedback per eval.

Show the user the results *before* you start revising. Their judgment is the point.

### Step 4: Record the feedback

The user replies in chat. Save their comments to `<workspace>/iteration-N/feedback.md` (one heading per eval), so the next iteration can check whether each complaint was actually addressed. No comment on an eval means it looked fine. Focus on the ones with complaints.

---

## Improving the skill

This is the heart of the loop.

1. **Generalize from the feedback.** The skill will be used across countless prompts. You're iterating on a few examples only because that's fast. Avoid fiddly, overfit patches and oppressive MUSTs. If something keeps failing, try a different metaphor or a different recommended way of working.
2. **Keep it lean.** Remove what isn't pulling its weight. Read the **transcripts**, not just outputs. If the skill makes the model waste time on unproductive steps, cut the parts causing it.
3. **Explain the why.** Even when feedback is terse or frustrated, understand what the user actually needs and transmit that understanding into the instructions.
4. **Bundle repeated work.** If every run independently wrote a similar helper (`build_chart.js`, `parse_input.py`), write it once in `scripts/` and point the skill at it.

Draft a revision, reread it fresh, improve it.

### The iteration loop

1. Apply improvements
2. Rerun everything into `iteration-<N+1>/` with `run-evals.js`, including baselines. For a new skill the baseline stays `without_skill`. For an existing skill, choose between the original snapshot and the previous iteration.
3. Grade, run `results.js`, and present the results. Compare against the previous iteration and say explicitly whether each item in the previous `feedback.md` is fixed
4. Wait for the user's feedback; record it; repeat

Stop when the user is happy, has no more complaints, or progress stalls.

---

## Advanced: blind comparison

For a rigorous "is the new version actually better?", give two outputs to an independent subagent without saying which is which. Follow `agents/comparator.md` for judging and `agents/analyzer.md` for explaining why the winner won. Spawn these through `spawn.js`. This is optional; the human review loop is usually enough.

---

## Description optimization

The description decides whether pi uses the skill at all. After the skill is in good shape, offer to optimize it.

### Step 1: Generate trigger eval queries

Write ~20 queries, 8-10 should-trigger and 8-10 should-not-trigger, saved as JSON:

```json
[ {"query": "the user prompt", "should_trigger": true}, {"query": "another prompt", "should_trigger": false} ]
```

Make them realistic and specific, the way someone really types to a coding agent: file paths, project context, column names, URLs, backstory, the occasional typo or lowercase rush. Mix lengths. Focus on edge cases rather than clear-cut ones.

Bad: `"Format this data"`. Good: `"ok so my boss sent me 'Q4 sales final FINAL v2.xlsx' (in ~/Downloads) and wants a profit margin % column, revenue is col C and costs col D i think"`

- **Should-trigger**: varied phrasings of the same intent, cases where the user doesn't name the domain but clearly needs it, uncommon use cases, and cases where this skill competes with another but should win.
- **Should-not-trigger**: near-misses that share keywords but need something else, adjacent domains, ambiguous phrasing. "Write a fibonacci function" as a negative for a PDF skill tests nothing.

Note that the model only reaches for skills when the task benefits. Trivial one-step requests may not trigger even with a perfect description, so keep queries substantive.

### Step 2: Review with the user

Show the queries in chat as two short numbered lists (should trigger / should not) and ask the user to add, remove or flip any. Save the agreed set to `<workspace>/trigger-evals.json`. Bad eval queries lead to bad descriptions, so this step matters.

### Step 3: Run the optimization loop

Tell the user it takes a while. Save the eval set in the workspace and run in the background:

```bash
nohup node <this-skill-dir>/scripts/optimize-description.js \
  --eval-set <workspace>/trigger-evals.json --skill-path <skill-dir> \
  --out <workspace>/description-opt/results.json --max-iterations 5 \
  > <workspace>/description-opt.log 2>&1 &
```

It splits queries 60/40 into train and held-out test, runs each query 3× against an isolated pi with only this skill installed (`scripts/trigger-eval.js`), asks pi to propose a better description from the train failures (`scripts/improve-description.js`, which never sees test results), and repeats. It logs one line per iteration (train/test scores) to stderr, then prints a short table of every attempt and the best description, chosen by **test** score to avoid overfitting. The full history goes to `--out`. Add `--verbose` for per-query PASS/FAIL lines. Trigger checks kill each pi process as soon as its first tool call is formed, so eval queries never execute anything. It uses the current session's model by default (`--model` to override), so results match what the user experiences.

Tail the log periodically and pass progress on to the user (iteration, train/test scores).

To measure a single description without looping: `node scripts/trigger-eval.js --eval-set … --skill-path … --verbose`.

### How triggering works in pi

The system prompt lists available skills (name, description, path). For a matching task the model's first move is to `read` that SKILL.md, which is what `trigger-eval.js` detects. Evals hide the user's other skills, so real-world competition can differ slightly. Mention that if two installed skills overlap.

### Step 4: Apply the result

Update the frontmatter with `best_description`, show the user before/after with scores, run `validate.js`, and remind them to `/reload`.

---

## Updating an existing skill

- Keep the directory name and `name` field unchanged unless the user asks otherwise.
- Snapshot before editing (see Step 1) so you have a baseline.
- If the skill lives in a read-only location or a package install, copy it somewhere writable, edit there, and tell the user how to install it (copy into `~/.pi/agent/skills/`, add a path to the `skills` setting, or publish as a pi package).

---

## Reference files

- `agents/grader.md`: evaluating assertions against transcripts and outputs
- `agents/comparator.md`: blind A/B comparison of two outputs
- `agents/analyzer.md`: why one version beat another, and benchmark pattern analysis
- `references/schemas.md`: evals.json, grading.json, benchmark.json, timing.json and related formats

Scripts (usage is documented in each file's header comment):

| Script | Purpose |
|---|---|
| `scripts/validate.js <dir>` | Check frontmatter, naming, length limits, dangling file references |
| `scripts/run-evals.js` | Launch all eval runs (skill + baseline) in parallel |
| `scripts/spawn.js` | Run arbitrary subagent jobs in parallel (tmux windows or background) |
| `scripts/subagent.js` | One isolated pi run with transcript/timing/metrics capture |
| `scripts/results.js` | Prints eval results and summary in the session and writes benchmark.json |
| `scripts/trigger-eval.js` | Measure the trigger rate of a description |
| `scripts/improve-description.js` | One description-improvement step |
| `scripts/optimize-description.js` | Full train/test description optimization loop |

---

The core loop once more:

- Figure out what the skill is about
- Draft or edit it
- Run pi-with-the-skill on test prompts (`run-evals.js`)
- Evaluate with the user: grade, `results.js`, present results in chat, collect feedback
- Improve and repeat until you and the user are satisfied
- Optimize the description, `/reload`, done

Track these steps in a todo list if you have one. In particular, don't skip "show the user the results and get their feedback before revising".
