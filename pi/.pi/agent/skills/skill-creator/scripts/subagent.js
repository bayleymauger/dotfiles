#!/usr/bin/env node
// Run one isolated pi agent non-interactively and record what it did.
//
// Usage:
//   subagent.js --out <dir> (--prompt <text> | --prompt-file <file>)
//               [--cwd <dir>] [--skill <path>[,<path>]] [--model provider/id]
//               [--thinking level] [--tools read,bash,...] [--context-files]
//               [--timeout <seconds>] [--extensions]
//
// Artifacts written to --out:
//   events.jsonl   raw pi JSON event stream
//   transcript.md  readable transcript (prompt, assistant text, tool calls/results)
//   final.md       last assistant message text
//   timing.json    { total_tokens, duration_ms, total_duration_seconds }
//   metrics.json   { tool_calls, total_tool_calls, errors_encountered, ... }
//   .done          exit status; written last so callers can poll for completion
//
// The agent always runs with --no-skills (plus any --skill paths) and, unless
// --context-files is passed, without AGENTS.md/CLAUDE.md, so runs are
// reproducible and not influenced by the user's personal setup. Extensions
// (incl. built-in MCP) are off unless --extensions is passed.

import { spawn } from "node:child_process";
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
  defaultModel,
  die,
  isMain,
  jsonlSplitter,
  parseArgs,
  piBaseArgs,
} from "./lib.js";

const truncate = (s, n) =>
  s.length > n ? `${s.slice(0, n)}… [${s.length - n} more chars]` : s;
const resultText = (r) =>
  (r?.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

export function runSubagent(opts) {
  const out = resolve(opts.out);

  mkdirSync(out, { recursive: true });

  const cwd = resolve(opts.cwd || out);

  mkdirSync(cwd, { recursive: true });

  const prompt = opts.prompt ?? readFileSync(opts.promptFile, "utf8");
  const skills = []
    .concat(opts.skill || [])
    .flatMap((s) => String(s).split(","))
    .filter(Boolean);

  const args = [
    ...piBaseArgs({
      model: opts.model || defaultModel(),
      thinking: opts.thinking,
      extensions: !!opts.extensions,
    }),
    "--mode",
    "json",
    "--no-skills",
  ];

  for (const s of skills) args.push("--skill", resolve(s));
  if (!opts.contextFiles) args.push("--no-context-files");
  if (opts.tools) args.push("--tools", opts.tools);
  args.push("--", prompt);

  const events = createWriteStream(join(out, "events.jsonl"));
  const transcript = [
    `# Transcript\n`,
    `## Eval Prompt\n\n${prompt}\n`,
    `## Run\n`,
    `- cwd: ${cwd}`,
    `- skills: ${skills.join(", ") || "(none)"}`,
    `- model: ${opts.model || defaultModel() || "(default)"}\n`,
  ];
  const toolCalls = {};
  let errors = 0;
  let totalTokens = 0;
  let lastText = "";
  let outputChars = 0;
  const start = Date.now();
  const log = opts.quiet ? () => {} : (s) => process.stdout.write(s);

  return new Promise((resolveP) => {
    const child = spawn("pi", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const timeoutMs = (Number(opts.timeout) || 900) * 1000;
    const timer = setTimeout(() => {
      transcript.push(`\n**TIMEOUT after ${timeoutMs / 1000}s — killed.**\n`);
      errors++;
      child.kill("SIGKILL");
    }, timeoutMs);

    let stderr = "";

    child.stderr.on("data", (d) => (stderr += d));
    child.stdout.on(
      "data",
      jsonlSplitter((ev, line) => {
        events.write(`${line}\n`);
        switch (ev.type) {
          case "message_update": {
            const e = ev.assistantMessageEvent || {};

            if (e.type === "text_delta") log(e.delta);
            break;
          }
          case "message_end": {
            const m = ev.message || {};

            if (m.role !== "assistant") break;
            totalTokens += m.usage?.totalTokens || 0;

            const text = (m.content || [])
              .filter((c) => c.type === "text")
              .map((c) => c.text)
              .join("\n")
              .trim();

            if (text) {
              lastText = text;
              outputChars += text.length;
              transcript.push(`### Assistant\n\n${text}\n`);
              log("\n");
            }
            if (m.stopReason === "error") {
              errors++;
              transcript.push(
                `**Assistant error:** ${m.errorMessage || "unknown"}\n`,
              );
            }
            break;
          }
          case "tool_execution_start": {
            toolCalls[ev.toolName] = (toolCalls[ev.toolName] || 0) + 1;

            const a = JSON.stringify(ev.args);

            transcript.push(
              `### Tool call: ${ev.toolName}\n\n\`\`\`json\n${truncate(a, 2000)}\n\`\`\`\n`,
            );
            log(`\x1b[2m→ ${ev.toolName} ${truncate(a, 160)}\x1b[0m\n`);
            break;
          }
          case "tool_execution_end": {
            if (ev.isError) errors++;
            transcript.push(
              `<details><summary>Result${ev.isError ? " (error)" : ""}</summary>\n\n\`\`\`\n${truncate(resultText(ev.result), 3000)}\n\`\`\`\n</details>\n`,
            );
            break;
          }
        }
      }),
    );

    child.on("close", (code) => {
      clearTimeout(timer);
      events.end();

      const durationMs = Date.now() - start;

      if (code !== 0)
        transcript.push(
          `\n**pi exited with code ${code}.**\n\n\`\`\`\n${truncate(stderr, 4000)}\n\`\`\`\n`,
        );

      const timing = {
        total_tokens: totalTokens,
        duration_ms: durationMs,
        total_duration_seconds: Math.round(durationMs / 100) / 10,
      };
      const metrics = {
        tool_calls: toolCalls,
        total_tool_calls: Object.values(toolCalls).reduce((a, b) => a + b, 0),
        total_steps: transcript.filter((t) => t.startsWith("### ")).length,
        errors_encountered: errors,
        output_chars: outputChars,
        transcript_chars: transcript.join("\n").length,
      };

      writeFileSync(join(out, "transcript.md"), transcript.join("\n"));
      writeFileSync(join(out, "final.md"), lastText);
      writeFileSync(join(out, "timing.json"), JSON.stringify(timing, null, 2));
      writeFileSync(
        join(out, "metrics.json"),
        JSON.stringify(metrics, null, 2),
      );
      writeFileSync(join(out, ".done"), JSON.stringify({ code }));
      log(
        `\n\x1b[2m[done: exit ${code}, ${timing.total_duration_seconds}s, ${totalTokens} tokens → ${out}]\x1b[0m\n`,
      );
      resolveP({ code, timing, metrics, out });
    });
  });
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), {
    boolean: ["context-files", "quiet", "extensions"],
  });

  if (!a.out || (!a.prompt && !a.promptFile))
    die(
      "Usage: subagent.js --out <dir> (--prompt <text> | --prompt-file <file>) [--cwd dir] [--skill path] [--model m] [--timeout s]",
    );

  const { code } = await runSubagent(a);

  process.exit(code ?? 1);
}
