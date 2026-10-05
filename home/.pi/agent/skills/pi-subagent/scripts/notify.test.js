// node --test scripts/
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagents-"));
process.env.PI_SUBAGENT_DIR = root;
delete process.env.PI_SUBAGENT;
delete process.env.TMUX;
const { default: notify } = await import("../extensions/notify.ts");

const run = (name, parent, collected) => {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "parent"), parent);
  fs.writeFileSync(path.join(dir, "output.md"), `answer ${name}`);
  if (collected) fs.writeFileSync(path.join(dir, ".collected"), "");
  fs.writeFileSync(path.join(dir, ".done"), "");
};

test("posts each finished run of this session once, when idle", async () => {
  const sent = [], on = {};
  let idle = true;
  const ctx = { sessionManager: { getSessionId: () => "S1" }, isIdle: () => idle, hasPendingMessages: () => false };
  const settle = () => new Promise((r) => setTimeout(r, 200));

  notify({ on: (e, f) => (on[e] = f), sendMessage: (m) => sent.push(m.content) });
  on.session_start({}, ctx);
  run("mine", "S1");
  run("other", "S2");
  run("waited", "S1", true);
  await settle();
  assert.deepEqual(sent, ["Subagent mine finished (exit ?):\n\nanswer mine"]);

  idle = false;
  run("late", "S1");
  await settle();
  assert.equal(sent.length, 1, "nothing posted mid-turn");
  idle = true;
  on.agent_settled({}, ctx);
  on.session_shutdown();
  assert.equal(sent[1], "Subagent late finished (exit ?):\n\nanswer late");
  assert.equal(sent.length, 2);
});
