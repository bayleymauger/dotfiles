// node --test scripts/
import assert from "node:assert/strict";
import { test } from "node:test";
import { latestByFamily, parse } from "./tiers.js";

test("families and versions", () => {
  assert.deepEqual(parse("claude-sonnet-5-5"), { family: "claude-sonnet", version: [5, 5] });
  assert.deepEqual(parse("gpt-6.1-sol"), { family: "gpt-sol", version: [6, 1] });
  assert.equal(parse("claude-haiku-4-5-20251001"), null);
});

test("picks the newest version per family", () => {
  const best = latestByFamily([
    "claude-sonnet-4-5", "claude-sonnet-5", "claude-sonnet-5-5", "claude-sonnet-4-6",
    "gpt-5.6-sol", "gpt-6.1-sol", "gpt-6-sol", "gpt-6-luna", "gpt-5.6-luna",
    "claude-opus-4-5-20251101", "gpt-5.3-codex-spark",
  ]);
  assert.equal(best.get("claude-sonnet"), "claude-sonnet-5-5");
  assert.equal(best.get("gpt-sol"), "gpt-6.1-sol");
  assert.equal(best.get("gpt-luna"), "gpt-6-luna");
  assert.equal(best.get("claude-opus"), undefined);
  assert.equal(best.get("gpt-codex-spark"), "gpt-5.3-codex-spark");
});
