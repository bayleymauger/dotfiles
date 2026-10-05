#!/usr/bin/env node
// Run several subagents in parallel and wait for all of them.
//
// Usage: spawn.js --jobs <jobs.json> [--parallel 4] [--no-tmux] [--keep-windows]
//
// jobs.json is an array of subagent.js option objects, each with a `name`:
//   [{ "name": "eval-1-with_skill", "out": "/abs/run/dir", "prompt": "...",
//      "cwd": "/abs/work/dir", "skill": "/abs/skill", "timeout": 900 }]
//
// Inside tmux (and unless --no-tmux), each job gets its own detached tmux
// window named after the job so the user can watch it live (`prefix + w`).
// Otherwise jobs run as background child processes, logging to <out>/subagent.log.
// Completion is detected via the <out>/.done marker written by subagent.js.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { die, isMain, parseArgs, shq, sleep, tmuxAvailable } from "./lib.js";

const SUBAGENT = join(dirname(fileURLToPath(import.meta.url)), "subagent.js");

function jobArgs(job) {
  const args = [];

  for (const [k, v] of Object.entries(job)) {
    if (k === "name" || v === undefined || v === null || v === false) continue;

    const flag = `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

    if (v === true) args.push(flag);
    else for (const item of [].concat(v)) args.push(flag, String(item));
  }
  return args;
}

function launch(job, useTmux, keepWindows) {
  const out = resolve(job.out);

  mkdirSync(out, { recursive: true });
  rmSync(join(out, ".done"), { force: true });

  const args = jobArgs({ ...job, out });

  if (useTmux) {
    const cmd = `node ${shq(SUBAGENT)} ${args.map(shq).join(" ")}${keepWindows ? "; echo; read -p 'press enter to close'" : ""}`;
    const r = spawnSync(
      "tmux",
      ["new-window", "-d", "-n", job.name.slice(0, 40), cmd],
      { encoding: "utf8" },
    );

    if (r.status !== 0) throw new Error(`tmux new-window failed: ${r.stderr}`);
  } else {
    const logFd = openSync(join(out, "subagent.log"), "w");

    spawn("node", [SUBAGENT, ...args], {
      stdio: ["ignore", logFd, logFd],
      detached: false,
    });
  }
}

export async function runJobs(
  jobs,
  { parallel = 4, tmux, keepWindows = false, onDone } = {},
) {
  const useTmux = tmux ?? tmuxAvailable();

  console.error(
    `Running ${jobs.length} job(s), ${parallel} at a time, via ${useTmux ? "tmux windows" : "background processes"}`,
  );

  const queue = [...jobs];
  const running = new Map();
  const results = [];

  while (queue.length || running.size) {
    while (queue.length && running.size < parallel) {
      const job = queue.shift();

      launch(job, useTmux, keepWindows);
      running.set(job.name, { job, start: Date.now() });
      console.error(`  started  ${job.name}`);
    }
    await sleep(1000);
    for (const [name, { job, start }] of running) {
      const marker = join(resolve(job.out), ".done");

      if (!existsSync(marker)) continue;
      running.delete(name);

      let code = null;

      try {
        code = JSON.parse(readFileSync(marker, "utf8")).code;
      } catch {}

      const r = {
        name,
        out: resolve(job.out),
        code,
        seconds: Math.round((Date.now() - start) / 1000),
      };

      results.push(r);
      console.error(`  finished ${name} (exit ${code}, ${r.seconds}s)`);
      onDone?.(r);
    }
  }
  return results;
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), {
    boolean: ["no-tmux", "keep-windows"],
  });

  if (!a.jobs)
    die(
      "Usage: spawn.js --jobs <jobs.json> [--parallel 4] [--no-tmux] [--keep-windows]",
    );

  const jobs = JSON.parse(readFileSync(a.jobs, "utf8"));
  const results = await runJobs(jobs, {
    parallel: Number(a.parallel) || 4,
    tmux: a.noTmux ? false : undefined,
    keepWindows: !!a.keepWindows,
  });

  console.log(JSON.stringify(results, null, 2));
}
