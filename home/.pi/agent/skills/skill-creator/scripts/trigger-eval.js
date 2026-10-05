#!/usr/bin/env node
// Measure how reliably a skill description makes pi load the skill.
//
// Usage:
//   trigger-eval.js --eval-set trigger-evals.json --skill-path <skill>
//                   [--description "override"] [--runs-per-query 3] [--num-workers 6]
//                   [--timeout 60] [--trigger-threshold 0.5] [--model provider/id] [--verbose]
//
// eval set: [{ "query": "...", "should_trigger": true }, ...]
//
// For each query an isolated `pi -p --mode json` starts with ONLY a temp copy
// of the skill (carrying the description under test) available. It counts as
// triggered if the model's first tool call reads that SKILL.md. The process is
// killed as soon as the first tool call is fully formed — before it runs — so
// eval queries never execute anything.
//
// Note: pi also loads the user's other skills normally; here they are hidden
// (--no-skills) so the result measures this description in isolation.

import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  defaultModel,
  die,
  isMain,
  jsonlSplitter,
  parseArgs,
  parseSkill,
  piBaseArgs,
} from "./lib.js";

function writeTempSkill(name, description) {
  const root = mkdtempSync(join(tmpdir(), "skill-trigger-"));
  const dir = join(root, name);

  mkdirSync(dir);

  const indented = description.split("\n").join("\n  ");

  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: |\n  ${indented}\n---\n\n# ${name}\n\nSkill under evaluation.\n`,
  );
  return dir;
}

export function runSingleQuery(query, skillDir, { timeout = 60, model, cwd }) {
  const skillMd = join(skillDir, "SKILL.md");
  const args = [
    ...piBaseArgs({ model }),
    "--mode",
    "json",
    "--no-skills",
    "--skill",
    skillDir,
    "--no-context-files",
    "--",
    query,
  ];

  return new Promise((res) => {
    const child = spawn("pi", args, {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      res(v);
    };
    const timer = setTimeout(() => finish(false), timeout * 1000);

    child.stdout.on(
      "data",
      jsonlSplitter((ev) => {
        if (
          ev.type === "message_update" &&
          ev.assistantMessageEvent?.type === "toolcall_end"
        ) {
          finish(
            JSON.stringify(ev.assistantMessageEvent.toolCall || {}).includes(
              skillDir,
            ),
          );
          return false;
        }
        if (ev.type === "tool_execution_start") {
          finish(JSON.stringify(ev.args || {}).includes(skillMd));
          return false;
        }
        if (ev.type === "agent_end" || ev.type === "agent_settled") {
          finish(false);
          return false;
        }
      }),
    );
    child.on("close", () => finish(false));
  });
}

async function pool(tasks, n) {
  const results = new Array(tasks.length);
  let i = 0;

  await Promise.all(
    Array.from({ length: Math.min(n, tasks.length) }, async () => {
      while (i < tasks.length) {
        const idx = i++;

        results[idx] = await tasks[idx]().catch(() => false);
      }
    }),
  );
  return results;
}

export async function runTriggerEval(
  evalSet,
  {
    skillName,
    description,
    numWorkers = 6,
    timeout = 60,
    runsPerQuery = 3,
    threshold = 0.5,
    model,
  },
) {
  const skillDir = writeTempSkill(skillName, description);
  const cwd = mkdtempSync(join(tmpdir(), "skill-trigger-cwd-"));

  try {
    const tasks = evalSet.flatMap((item) =>
      Array.from(
        { length: runsPerQuery },
        () => () =>
          runSingleQuery(item.query, skillDir, { timeout, model, cwd }),
      ),
    );
    const flat = await pool(tasks, numWorkers);
    const results = evalSet.map((item, qi) => {
      const t = flat.slice(qi * runsPerQuery, (qi + 1) * runsPerQuery);
      const triggers = t.filter(Boolean).length;
      const rate = triggers / t.length;

      return {
        query: item.query,
        should_trigger: item.should_trigger,
        trigger_rate: rate,
        triggers,
        runs: t.length,
        pass: item.should_trigger ? rate >= threshold : rate < threshold,
      };
    });
    const passed = results.filter((r) => r.pass).length;

    return {
      skill_name: skillName,
      description,
      results,
      summary: {
        total: results.length,
        passed,
        failed: results.length - passed,
      },
    };
  } finally {
    rmSync(join(skillDir, ".."), { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
}

export function printResults(out, label = "Results") {
  console.error(`${label}: ${out.summary.passed}/${out.summary.total} passed`);
  for (const r of out.results)
    console.error(
      `  [${r.pass ? "PASS" : "FAIL"}] rate=${r.triggers}/${r.runs} expected=${r.should_trigger}: ${r.query.slice(0, 70)}`,
    );
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), { boolean: ["verbose"] });

  if (!a.evalSet || !a.skillPath)
    die(
      "Usage: trigger-eval.js --eval-set <file> --skill-path <skill> [--description d] [--runs-per-query 3] [--verbose]",
    );

  const { name, description } = parseSkill(resolve(a.skillPath));
  const desc = a.description || description;

  if (a.verbose) console.error(`Evaluating: ${desc}`);

  const out = await runTriggerEval(
    JSON.parse(readFileSync(a.evalSet, "utf8")),
    {
      skillName: name,
      description: desc,
      numWorkers: Number(a.numWorkers) || 6,
      timeout: Number(a.timeout) || 60,
      runsPerQuery: Number(a.runsPerQuery) || 3,
      threshold: a.triggerThreshold ? Number(a.triggerThreshold) : 0.5,
      model: a.model || defaultModel(),
    },
  );

  if (a.verbose) printResults(out);
  console.log(JSON.stringify(out, null, 2));
}
