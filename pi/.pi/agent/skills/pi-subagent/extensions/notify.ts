// Tells the parent session when its subagents finish, so it doesn't have to
// block in `pi-subagent wait`. A run counts as reported once it has
// .collected (written here or by `wait`); `send` clears it for the next answer.
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const ROOT = process.env.PI_SUBAGENT_DIR || "/tmp/pi-subagents";
const MAX = 20_000;

export default function (pi: ExtensionAPI) {
  let watcher: fs.FSWatcher | undefined;

  // Only while idle, so a `wait` in flight collects the output instead. Runs
  // that finish mid-turn are picked up by the agent_settled rescan.
  const scan = (ctx: ExtensionContext) => {
    if (process.env.PI_SUBAGENT || !ctx.isIdle() || ctx.hasPendingMessages()) return;
    const session = ctx.sessionManager.getSessionId();

    for (const name of fs.readdirSync(ROOT)) {
      const dir = path.join(ROOT, name);
      const read = (f: string) => { try { return fs.readFileSync(path.join(dir, f), "utf8").trim(); } catch { return ""; } };
      if (read("parent") !== session || !fs.existsSync(path.join(dir, ".done")) || fs.existsSync(path.join(dir, ".collected"))) continue;

      fs.writeFileSync(path.join(dir, ".collected"), "");
      const exit = read("exit_code") || "?";
      if (process.env.TMUX) execFile("tmux", ["display-message", "-d", "5000", `pi-subagent: ${name} finished (exit ${exit})`], () => {});
      let out = read("output.md") || "(no output.md; the subagent stopped before reporting)";
      if (out.length > MAX) out = `${out.slice(0, MAX)}\n\n[truncated; full output: ${dir}/output.md]`;
      pi.sendMessage(
        { customType: "pi-subagent", content: `Subagent ${name} finished (exit ${exit}):\n\n${out}`, display: true },
        { triggerTurn: true, deliverAs: "followUp" },
      );
    }
  };

  pi.on("session_start", (_event, ctx) => {
    if (process.env.PI_SUBAGENT) return;
    watcher?.close();
    fs.mkdirSync(ROOT, { recursive: true });
    watcher = fs.watch(ROOT, { recursive: true }, (_ev, file) => {
      if (file && path.basename(file) === ".done") scan(ctx);
    });
    scan(ctx);
  });

  pi.on("agent_settled", (_event, ctx) => scan(ctx));
  pi.on("session_shutdown", () => watcher?.close());
}
