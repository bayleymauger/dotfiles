#!/usr/bin/env node
// Print eval results as plain text for review in the pi session, and write
// benchmark.json (when runs are graded) for the analyst pass.
//
// Usage: results.js <iteration-dir> [--lines 12] [--summary-only] [--skill-name n] [--model m]
//
// Expects <iteration-dir>/eval-*/<config>/run-*/ as produced by run-evals.js.
// Per run it shows: grades (from grading.json, if present), output files,
// the agent's final message (first --lines lines), time/tokens/tool calls.
// Ends with a summary table: pass rate, time, tokens per config, with delta.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { defaultModel, die, isMain, parseArgs, stats } from "./lib.js";

const ORDER = ["with_skill", "new_skill", "without_skill", "old_skill"];
const sortConfigs = (cs) =>
  [...cs].sort(
    (a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99),
  );

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const subdirs = (p, prefix = "") =>
  existsSync(p)
    ? readdirSync(p)
        .filter(
          (d) => d.startsWith(prefix) && statSync(join(p, d)).isDirectory(),
        )
        .sort()
    : [];

const listFiles = (dir, pre = "") =>
  existsSync(dir)
    ? readdirSync(dir)
        .sort()
        .flatMap((f) => {
          const p = join(dir, f);
          const s = statSync(p);

          return s.isDirectory()
            ? listFiles(p, `${pre}${f}/`)
            : [`${pre}${f} (${s.size}B)`];
        })
    : [];

/** Load every run: { evalId, evalName, prompt, config, run, dir, grading, timing, metrics } */
export function loadRuns(iterDir) {
  const runs = [];

  subdirs(iterDir, "eval-").forEach((evalDirName, idx) => {
    const evalDir = join(iterDir, evalDirName);
    const meta = readJson(join(evalDir, "eval_metadata.json")) || {};
    const evalId =
      meta.eval_id ?? (Number.parseInt(evalDirName.split("-")[1], 10) || idx);

    for (const config of sortConfigs(subdirs(evalDir))) {
      for (const run of subdirs(join(evalDir, config), "run-")) {
        const dir = join(evalDir, config, run);

        runs.push({
          evalId,
          evalName: meta.eval_name || evalDirName,
          prompt: meta.prompt || "",
          config,
          run: Number.parseInt(run.split("-")[1], 10),
          dir,
          grading: readJson(join(dir, "grading.json")),
          timing: readJson(join(dir, "timing.json")) || {},
          metrics: readJson(join(dir, "metrics.json")) || {},
        });
      }
    }
  });
  return runs;
}

export function buildBenchmark(runs, { skillName, skillPath, model }) {
  const graded = runs.filter((r) => r.grading);
  const configs = sortConfigs([...new Set(graded.map((r) => r.config))]);
  const flat = graded.map((r) => {
    const s = r.grading.summary || {};
    const n = r.grading.user_notes_summary || {};

    return {
      eval_id: r.evalId,
      configuration: r.config,
      run_number: r.run,
      result: {
        pass_rate: s.pass_rate ?? 0,
        passed: s.passed ?? 0,
        failed: s.failed ?? 0,
        total: s.total ?? 0,
        time_seconds: r.timing.total_duration_seconds || 0,
        tokens: r.timing.total_tokens || 0,
        tool_calls: r.metrics.total_tool_calls || 0,
        errors: r.metrics.errors_encountered || 0,
      },
      expectations: r.grading.expectations || [],
      notes: [
        ...(n.uncertainties || []),
        ...(n.needs_review || []),
        ...(n.workarounds || []),
      ],
    };
  });

  const summary = {};

  for (const c of configs) {
    const rs = flat.filter((r) => r.configuration === c).map((r) => r.result);

    summary[c] = {
      pass_rate: stats(rs.map((r) => r.pass_rate)),
      time_seconds: stats(rs.map((r) => r.time_seconds)),
      tokens: stats(rs.map((r) => r.tokens)),
    };
  }

  const [p, b] = [summary[configs[0]] || {}, summary[configs[1]] || {}];
  const d = (k) => (p[k]?.mean || 0) - (b[k]?.mean || 0);
  const sign = (x, n) => `${x >= 0 ? "+" : ""}${x.toFixed(n)}`;

  summary.delta = {
    pass_rate: sign(d("pass_rate"), 2),
    time_seconds: sign(d("time_seconds"), 1),
    tokens: sign(d("tokens"), 0),
  };

  const evalIds = [...new Set(flat.map((r) => r.eval_id))].sort(
    (x, y) => x - y,
  );

  return {
    metadata: {
      skill_name: skillName,
      skill_path: skillPath || "",
      executor_model: model || defaultModel() || "",
      timestamp: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      evals_run: evalIds,
      runs_per_configuration: Math.max(1, ...flat.map((r) => r.run_number)),
    },
    runs: flat,
    run_summary: summary,
    notes: [],
  };
}

function printRun(r, lines) {
  const t = r.timing;
  const m = r.metrics;
  const tools = Object.entries(m.tool_calls || {})
    .map(([k, v]) => `${k}×${v}`)
    .join(" ");
  const g = r.grading?.summary;
  const score = g ? `  ${g.passed}/${g.total} passed` : "  (ungraded)";

  console.log(
    `\n  ▸ ${r.config} run-${r.run}${score} · ${t.total_duration_seconds ?? "?"}s · ${t.total_tokens ?? "?"} tok · tools: ${tools || "none"}${m.errors_encountered ? ` · ${m.errors_encountered} errors` : ""}`,
  );
  for (const e of r.grading?.expectations || [])
    console.log(
      `    ${e.passed ? "✓" : "✗"} ${e.text}${e.passed ? "" : `\n        ↳ ${String(e.evidence || "").slice(0, 200)}`}`,
    );

  const files = listFiles(join(r.dir, "outputs"));

  console.log(`    outputs: ${files.length ? files.join(", ") : "(none)"}`);

  const final = existsSync(join(r.dir, "final.md"))
    ? readFileSync(join(r.dir, "final.md"), "utf8").trim()
    : "";

  if (final && lines > 0) {
    const ls = final.split("\n");

    console.log(
      `    final message:\n${ls
        .slice(0, lines)
        .map((l) => `    │ ${l}`)
        .join(
          "\n",
        )}${ls.length > lines ? `\n    │ … (${ls.length - lines} more lines in final.md)` : ""}`,
    );
  }
}

function printSummary(bm) {
  const rs = bm.run_summary;
  const configs = Object.keys(rs).filter((k) => k !== "delta");

  if (!configs.length)
    return console.log(
      "\nNo graded runs yet — write grading.json per run for pass rates.",
    );

  const pct = (s) =>
    `${Math.round(s.mean * 100)}% ± ${Math.round(s.stddev * 100)}%`;
  const row = (cells) => `| ${cells.join(" | ")} |`;

  console.log(`\n${"═".repeat(60)}\nSUMMARY\n`);
  console.log(row(["metric", ...configs, "delta"]));
  console.log(row(["---", ...configs.map(() => "---"), "---"]));
  console.log(
    row([
      "pass rate",
      ...configs.map((c) => pct(rs[c].pass_rate)),
      rs.delta.pass_rate,
    ]),
  );
  console.log(
    row([
      "time",
      ...configs.map((c) => `${rs[c].time_seconds.mean.toFixed(1)}s`),
      `${rs.delta.time_seconds}s`,
    ]),
  );
  console.log(
    row([
      "tokens",
      ...configs.map((c) => `${Math.round(rs[c].tokens.mean)}`),
      rs.delta.tokens,
    ]),
  );

  // Assertions that pass in every config don't tell skill from baseline.
  const byText = {};

  for (const r of bm.runs)
    for (const e of r.expectations)
      (byText[e.text] ??= {})[r.configuration] = [
        ...(byText[e.text][r.configuration] || []),
        e.passed,
      ];

  const nonDiscriminating = Object.entries(byText).filter(
    ([, v]) =>
      configs.length > 1 &&
      configs.every((c) => v[c]?.length && v[c].every(Boolean)),
  );

  if (nonDiscriminating.length)
    console.log(
      `\nPass in every config (not discriminating):\n${nonDiscriminating.map(([t]) => `  - ${t}`).join("\n")}`,
    );
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), { boolean: ["summary-only"] });
  const dir = a._[0] && resolve(a._[0]);

  if (!dir || !existsSync(dir))
    die(
      "Usage: results.js <iteration-dir> [--lines 12] [--summary-only] [--skill-name n]",
    );

  const runs = loadRuns(dir);

  if (!runs.length) die(`No runs found in ${dir}`);

  const lines = a.lines !== undefined ? Number(a.lines) : 12;

  if (!a.summaryOnly) {
    let lastEval = null;

    for (const r of runs) {
      if (r.evalId !== lastEval) {
        lastEval = r.evalId;
        console.log(
          `\n${"═".repeat(60)}\nEVAL ${r.evalId}: ${r.evalName}\n${r.prompt
            .split("\n")
            .map((l) => `  > ${l}`)
            .join("\n")}`,
        );
      }
      printRun(r, lines);
    }
  }

  const bm = buildBenchmark(runs, {
    skillName:
      a.skillName || basename(resolve(dir, "..")).replace(/-workspace$/, ""),
    skillPath: a.skillPath,
    model: a.model,
  });

  printSummary(bm);
  if (bm.runs.length) {
    writeFileSync(join(dir, "benchmark.json"), JSON.stringify(bm, null, 2));
    console.log(`\nbenchmark.json written to ${join(dir, "benchmark.json")}`);
  }
}
