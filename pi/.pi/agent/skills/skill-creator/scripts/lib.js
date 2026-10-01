// Shared helpers for skill-creator scripts. No dependencies (Node 20+).

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** True when the calling module is the entry point (symlink-safe). */
export function isMain(metaUrl) {
  try {
    return (
      realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1])
    );
  } catch {
    return false;
  }
}

/** POSIX shell single-quote. */
export const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/** Tiny argv parser: --flag, --key value, --key=value, positionals in `_`. */
export function parseArgs(
  argv = process.argv.slice(2),
  { boolean = [], alias = {} } = {},
) {
  const out = { _: [] };

  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];

    if (a === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!a.startsWith("-") || a === "-") {
      out._.push(a);
      continue;
    }
    a = a.replace(/^--?/, "");

    let val;

    if (a.includes("="))
      [a, val] = [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)];
    a = alias[a] || a;

    const key = a.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

    if (val === undefined) {
      if (boolean.includes(a) || a.startsWith("no-")) val = true;
      else if (i + 1 < argv.length) val = argv[++i];
      else val = true;
    }
    out[key] = val;
  }
  return out;
}

export function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

/**
 * Minimal YAML frontmatter parser (no deps). Supports `key: value`, quoted
 * values, booleans, block scalars (| > |- >-) and one nested map (metadata).
 * Returns { data, body }. Throws on malformed input.
 */
export function parseFrontmatter(content) {
  const lines = content.split("\n");

  if (lines[0]?.trim() !== "---")
    throw new Error("missing frontmatter (no opening ---)");

  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");

  if (end === -1) throw new Error("missing frontmatter (no closing ---)");

  const data = {};
  const fm = lines.slice(1, end);

  for (let i = 0; i < fm.length;) {
    const line = fm[i];

    if (!line.trim() || line.trimStart().startsWith("#")) {
      i++;
      continue;
    }

    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!m)
      throw new Error(`unparseable frontmatter line: ${JSON.stringify(line)}`);

    const key = m[1];
    let value = m[2].trim();

    i++;
    if (["|", ">", "|-", ">-", ""].includes(value)) {
      const block = [];

      while (i < fm.length && (/^[ \t]/.test(fm[i]) || !fm[i].trim()))
        block.push(fm[i++]);

      const nonEmpty = block.filter((b) => b.trim());

      if (
        value === "" &&
        nonEmpty.length &&
        nonEmpty.every((b) => /^\s+[A-Za-z0-9_-]+:/.test(b))
      ) {
        data[key] = Object.fromEntries(
          nonEmpty.map((b) => {
            const idx = b.indexOf(":");

            return [b.slice(0, idx).trim(), unquote(b.slice(idx + 1).trim())];
          }),
        );
      } else {
        data[key] = block
          .map((b) => b.trim())
          .join(value.startsWith("|") ? "\n" : " ")
          .trim();
      }
    } else {
      value = unquote(value);
      data[key] = value === "true" ? true : value === "false" ? false : value;
    }
  }
  return { data, body: lines.slice(end + 1).join("\n") };
}

function unquote(v) {
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    return v.slice(1, -1);
  return v;
}

/** Returns { name, description, content, data } for a skill directory. */
export function parseSkill(skillPath) {
  const file = join(skillPath, "SKILL.md");

  if (!existsSync(file)) throw new Error(`No SKILL.md found at ${skillPath}`);

  const content = readFileSync(file, "utf8");
  const { data } = parseFrontmatter(content);

  return {
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    content,
    data,
  };
}

/** Model powering the current pi session as provider/model (if known). */
export function defaultModel() {
  const { PI_PROVIDER: p, PI_MODEL: m } = process.env;

  return p && m ? `${p}/${m}` : m || undefined;
}

/** Base args for an isolated, non-interactive pi run. */
export function piBaseArgs({ model, thinking, extensions = false } = {}) {
  const args = ["-p", "--no-session", "--no-prompt-templates", "--offline"];

  if (!extensions) args.push("--no-extensions");
  if (model) args.push("--model", model);
  if (thinking) args.push("--thinking", thinking);
  return args;
}

/** One-shot text completion via pi: no tools, skills or context files. Prompt via stdin. */
export function callPi(prompt, { model, timeoutMs = 300_000 } = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      ...piBaseArgs({ model }),
      "--no-tools",
      "--no-skills",
      "--no-context-files",
    ];
    const child = spawn("pi", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(out)
        : reject(new Error(`pi -p exited ${code}\n${err}`));
    });
    child.stdin.end(prompt);
  });
}

/**
 * Split a byte stream into strict LF-delimited JSON records (pi's JSONL
 * framing — don't use readline, it also splits on U+2028/U+2029).
 */
export function jsonlSplitter(onRecord) {
  let buf = "";

  return (chunk) => {
    buf += chunk.toString("utf8");

    let idx;

    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).replace(/\r$/, "");

      buf = buf.slice(idx + 1);
      if (!line) continue;

      let ev;

      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (onRecord(ev, line) === false) return false;
    }
    return true;
  };
}

export function tmuxAvailable() {
  if (!process.env.TMUX) return false;
  return (
    spawnSync("tmux", ["display-message", "-p", "#S"], { stdio: "ignore" })
      .status === 0
  );
}

export function stats(values) {
  if (!values.length) return { mean: 0, stddev: 0, min: 0, max: 0 };

  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const stddev =
    n > 1
      ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))
      : 0;
  const r4 = (x) => Math.round(x * 10000) / 10000;

  return {
    mean: r4(mean),
    stddev: r4(stddev),
    min: r4(Math.min(...values)),
    max: r4(Math.max(...values)),
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
