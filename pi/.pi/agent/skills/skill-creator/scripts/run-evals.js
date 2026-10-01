#!/usr/bin/env node
// Run every eval in evals.json with the skill AND a baseline, in parallel.
//
// Usage:
//   run-evals.js --skill-path <skill> --workspace <ws> --iteration <N>
//                [--evals <skill>/evals/evals.json] [--baseline none|<old-skill-dir>]
//                [--runs 1] [--only 1,3] [--parallel 4] [--no-tmux]
//                [--model provider/id] [--timeout 900] [--natural] [--context-files] [--extensions]
//
// Layout produced (what results.js expects):
//   <ws>/iteration-N/eval-<id>-<name>/eval_metadata.json
//   <ws>/iteration-N/eval-<id>-<name>/<config>/run-<k>/{outputs/,work/,transcript.md,timing.json,metrics.json,...}
// <config> is with_skill plus without_skill (--baseline none, default) or old_skill.
//
// By default with-skill runs are invoked as `/skill:<name> <prompt>` so the
// skill is guaranteed to load; pass --natural to send the bare prompt and let
// the model decide (tests triggering + execution together).

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { defaultModel, die, isMain, parseArgs, parseSkill } from "./lib.js";
import { runJobs } from "./spawn.js";

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

function harnessNote(outputsDir, inputs) {
  return [
    "",
    "---",
    "Notes from the eval harness (not part of the user's request):",
    inputs.length
      ? `- Input files are in your current working directory: ${inputs.join(", ")}`
      : "- There are no input files.",
    `- Save every final deliverable the user would care about into: ${outputsDir}`,
    "  (If the answer is just text, also write it to response.md there.)",
    "- Work autonomously; nobody will answer questions. Make reasonable assumptions and list them in user_notes.md in that same directory.",
  ].join("\n");
}

export async function runEvals(a) {
  const skillPath = resolve(a.skillPath);
  const { name } = parseSkill(skillPath);
  const evalsFile = resolve(a.evals || join(skillPath, "evals", "evals.json"));

  if (!existsSync(evalsFile)) die(`evals file not found: ${evalsFile}`);

  const { evals } = JSON.parse(readFileSync(evalsFile, "utf8"));
  const only = a.only ? String(a.only).split(",").map(Number) : null;
  const iterDir = resolve(a.workspace, `iteration-${a.iteration}`);
  const runs = Number(a.runs) || 1;
  const baseline =
    a.baseline && a.baseline !== "none" ? resolve(a.baseline) : null;
  const configs = [
    { config: "with_skill", skill: skillPath, skillName: name },
    baseline
      ? {
          config: "old_skill",
          skill: baseline,
          skillName: parseSkill(baseline).name,
        }
      : { config: "without_skill", skill: null },
  ];

  const jobs = [];

  for (const ev of evals) {
    if (only && !only.includes(ev.id)) continue;

    const evalName =
      ev.name || slug(ev.prompt.split(/\s+/).slice(0, 6).join(" "));
    const evalDir = join(iterDir, `eval-${ev.id}-${slug(evalName)}`);

    mkdirSync(evalDir, { recursive: true });

    const metaPath = join(evalDir, "eval_metadata.json");
    const prevMeta = existsSync(metaPath)
      ? JSON.parse(readFileSync(metaPath, "utf8"))
      : {};

    writeFileSync(
      metaPath,
      JSON.stringify(
        {
          eval_id: ev.id,
          eval_name: evalName,
          prompt: ev.prompt,
          expected_output: ev.expected_output,
          assertions:
            ev.assertions ?? ev.expectations ?? prevMeta.assertions ?? [],
        },
        null,
        2,
      ),
    );

    for (const c of configs) {
      for (let k = 1; k <= runs; k++) {
        const runDir = join(evalDir, c.config, `run-${k}`);
        const outputs = join(runDir, "outputs");
        const work = join(runDir, "work");

        mkdirSync(outputs, { recursive: true });
        mkdirSync(work, { recursive: true });

        const inputs = [];

        for (const f of ev.files || []) {
          const src = resolve(skillPath, f);

          if (!existsSync(src))
            die(`eval ${ev.id}: input file not found: ${src}`);
          cpSync(src, join(work, basename(src)), { recursive: true });
          inputs.push(basename(src));
        }

        const forced = c.skill && !a.natural ? `/skill:${c.skillName} ` : "";

        // Same prompt text for each config so the comparison is fair; only the skill differs.
        jobs.push({
          name: `e${ev.id}-${c.config}-r${k}`,
          out: runDir,
          cwd: work,
          prompt: `${forced}${ev.prompt}\n${harnessNote(outputs, inputs)}`,
          skill: c.skill || undefined,
          model: a.model || defaultModel(),
          thinking: a.thinking,
          timeout: Number(a.timeout) || 900,
          contextFiles: !!a.contextFiles,
          extensions: !!a.extensions,
        });
      }
    }
  }
  if (!jobs.length) die("No evals selected.");
  writeFileSync(join(iterDir, "jobs.json"), JSON.stringify(jobs, null, 2));

  const results = await runJobs(jobs, {
    parallel: Number(a.parallel) || 4,
    tmux: a.noTmux ? false : undefined,
  });

  return { iterDir, results };
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), {
    boolean: ["no-tmux", "natural", "context-files", "extensions"],
  });

  if (!a.skillPath || !a.workspace || !a.iteration)
    die(
      "Usage: run-evals.js --skill-path <skill> --workspace <ws> --iteration <N> [--baseline none|<old-skill>] [--runs 1] [--only ids] [--parallel 4] [--no-tmux]",
    );

  const { iterDir, results } = await runEvals(a);
  const failed = results.filter((r) => r.code !== 0);

  console.log(
    `\n${results.length} run(s) finished in ${iterDir}${failed.length ? `; ${failed.length} non-zero exit: ${failed.map((f) => f.name).join(", ")}` : ""}`,
  );
  console.log("Next: grade each run (grading.json), then results.js to review");
}
