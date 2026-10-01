#!/usr/bin/env node
// Loop: trigger-eval -> improve description -> re-eval, with a held-out test split.
//
// Usage:
//   optimize-description.js --eval-set trigger-evals.json --skill-path <skill>
//       [--max-iterations 5] [--runs-per-query 3] [--holdout 0.4] [--num-workers 6]
//       [--timeout 60] [--model provider/id] [--out results.json] [--verbose]
//
// Progress goes to stderr (--verbose for per-query detail). stdout gets a short
// text summary ending with the best description (chosen by held-out TEST
// score to avoid overfitting). Full history is saved as JSON to --out
// (default: a temp file). Never edits SKILL.md — apply the result after review.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { improveDescription } from "./improve-description.js";
import { defaultModel, die, isMain, parseArgs, parseSkill } from "./lib.js";
import { runTriggerEval } from "./trigger-eval.js";

// Deterministic shuffle (mulberry32) so splits are stable across runs.
function shuffle(arr, seed = 42) {
  const a = [...arr];
  let s = seed;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;

    let t = Math.imul(s ^ (s >>> 15), 1 | s);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));

    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function splitEvalSet(set, holdout) {
  const pos = shuffle(set.filter((e) => e.should_trigger));
  const neg = shuffle(set.filter((e) => !e.should_trigger));
  const np = Math.max(1, Math.floor(pos.length * holdout));
  const nn = Math.max(1, Math.floor(neg.length * holdout));

  return {
    train: [...pos.slice(np), ...neg.slice(nn)],
    test: [...pos.slice(0, np), ...neg.slice(0, nn)],
  };
}

function stat(label, results, secs) {
  const pos = results.filter((r) => r.should_trigger);
  const neg = results.filter((r) => !r.should_trigger);
  const tp = pos.reduce((a, r) => a + r.triggers, 0);
  const fn = pos.reduce((a, r) => a + r.runs, 0) - tp;
  const fp = neg.reduce((a, r) => a + r.triggers, 0);
  const tn = neg.reduce((a, r) => a + r.runs, 0) - fp;
  const total = tp + tn + fp + fn;
  const pct = (x) => `${Math.round(x * 100)}%`;

  console.error(
    `${label}: ${tp + tn}/${total} correct, precision=${pct(tp + fp ? tp / (tp + fp) : 1)} recall=${pct(tp + fn ? tp / (tp + fn) : 1)}${secs ? ` (${secs.toFixed(1)}s)` : ""}`,
  );
  for (const r of results)
    console.error(
      `  [${r.pass ? "PASS" : "FAIL"}] rate=${r.triggers}/${r.runs} expected=${r.should_trigger}: ${r.query.slice(0, 60)}`,
    );
}

export async function optimize(o) {
  const { name, description: original, content } = parseSkill(o.skillPath);
  let current = o.description || original;
  const { train, test } =
    o.holdout > 0
      ? splitEvalSet(o.evalSet, o.holdout)
      : { train: o.evalSet, test: [] };

  if (o.verbose)
    console.error(
      `Split: ${train.length} train, ${test.length} test (holdout=${o.holdout})`,
    );

  const trainQs = new Set(train.map((q) => q.query));
  const history = [];
  let exitReason = "unknown";

  for (let it = 1; it <= o.maxIterations; it++) {
    if (o.verbose)
      console.error(
        `\n${"=".repeat(60)}\nIteration ${it}/${o.maxIterations}\nDescription: ${current}\n${"=".repeat(60)}`,
      );

    const t0 = Date.now();
    const all = await runTriggerEval([...train, ...test], {
      skillName: name,
      description: current,
      numWorkers: o.numWorkers,
      timeout: o.timeout,
      runsPerQuery: o.runsPerQuery,
      threshold: o.threshold,
      model: o.model,
    });
    const secs = (Date.now() - t0) / 1000;
    const tr = all.results.filter((r) => trainQs.has(r.query));
    const te = all.results.filter((r) => !trainQs.has(r.query));
    const tp = tr.filter((r) => r.pass).length;
    const ep = te.filter((r) => r.pass).length;

    history.push({
      iteration: it,
      description: current,
      train_passed: tp,
      train_failed: tr.length - tp,
      train_total: tr.length,
      train_results: tr,
      test_passed: test.length ? ep : null,
      test_failed: test.length ? te.length - ep : null,
      test_total: test.length ? te.length : null,
      test_results: test.length ? te : null,
    });
    console.error(
      `iteration ${it}: train ${tp}/${tr.length}${test.length ? `, test ${ep}/${te.length}` : ""} (${secs.toFixed(0)}s)`,
    );
    if (o.verbose) {
      stat("Train", tr, secs);
      if (test.length) stat("Test ", te);
    }
    if (tp === tr.length) {
      exitReason = `all_passed (iteration ${it})`;
      break;
    }
    if (it === o.maxIterations) {
      exitReason = `max_iterations (${o.maxIterations})`;
      break;
    }
    if (o.verbose) console.error("\nImproving description...");

    // The improver never sees test results — that's what keeps the held-out score honest.
    const blinded = history.map((h) =>
      Object.fromEntries(
        Object.entries(h).filter(([k]) => !k.startsWith("test_")),
      ),
    );

    current = await improveDescription({
      skillName: name,
      skillContent: content,
      currentDescription: current,
      evalResults: {
        results: tr,
        summary: { passed: tp, failed: tr.length - tp, total: tr.length },
      },
      history: blinded,
      model: o.model,
      logDir: o.logDir,
      iteration: it,
    });
    if (o.verbose) console.error(`Proposed: ${current}`);
  }

  const best = history.reduce((b, h) =>
    (
      test.length
        ? (h.test_passed ?? 0) > (b.test_passed ?? 0)
        : h.train_passed > b.train_passed
    )
      ? h
      : b,
  );
  const bestScore = test.length
    ? `${best.test_passed}/${best.test_total}`
    : `${best.train_passed}/${best.train_total}`;

  if (o.verbose)
    console.error(
      `\nExit reason: ${exitReason}\nBest score: ${bestScore} (iteration ${best.iteration})`,
    );
  return {
    exit_reason: exitReason,
    original_description: original,
    best_description: best.description,
    best_score: bestScore,
    best_train_score: `${best.train_passed}/${best.train_total}`,
    best_test_score: test.length
      ? `${best.test_passed}/${best.test_total}`
      : null,
    final_description: current,
    iterations_run: history.length,
    holdout: o.holdout,
    train_size: train.length,
    test_size: test.length,
    history,
  };
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), { boolean: ["verbose"] });

  if (!a.evalSet || !a.skillPath)
    die(
      "Usage: optimize-description.js --eval-set <file> --skill-path <skill> [--max-iterations 5] [--out results.json] [--verbose]",
    );

  const skillPath = resolve(a.skillPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = resolve(
    a.out ||
      join(tmpdir(), `description-opt-${basename(skillPath)}-${stamp}.json`),
  );
  const out = await optimize({
    evalSet: JSON.parse(readFileSync(a.evalSet, "utf8")),
    skillPath,
    description: a.description,
    numWorkers: Number(a.numWorkers) || 6,
    timeout: Number(a.timeout) || 60,
    maxIterations: Number(a.maxIterations) || 5,
    runsPerQuery: Number(a.runsPerQuery) || 3,
    threshold: a.triggerThreshold ? Number(a.triggerThreshold) : 0.5,
    holdout: a.holdout !== undefined ? Number(a.holdout) : 0.4,
    model: a.model || defaultModel(),
    verbose: !!a.verbose,
    logDir: a.out ? join(resolve(a.out, ".."), "improve-logs") : null,
  });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));

  const lines = [
    `Exit: ${out.exit_reason} · train ${out.train_size} / test ${out.test_size} queries`,
    "",
    "| iter | train | test | description |",
    "|---|---|---|---|",
  ];

  for (const h of out.history)
    lines.push(
      `| ${h.iteration} | ${h.train_passed}/${h.train_total} | ${h.test_total ? `${h.test_passed}/${h.test_total}` : "-"} | ${h.description.slice(0, 90)}${h.description.length > 90 ? "…" : ""} |`,
    );
  lines.push(
    "",
    `Best (${out.best_score}${out.best_test_score ? " test" : " train"}):`,
    out.best_description,
    "",
    `Full results: ${outPath}`,
  );
  console.log(lines.join("\n"));
}
