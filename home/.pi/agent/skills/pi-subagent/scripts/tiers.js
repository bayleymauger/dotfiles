#!/usr/bin/env node
// Check the tiers file against the models pi currently offers.
// Usage: tiers.js <tiers-file> [--update]
//
// A model id splits into a family (its non-numeric parts) and a version (its
// numeric parts): claude-sonnet-5-5 -> claude-sonnet (5,5); gpt-6.1-sol ->
// gpt-sol (6,1). Each row is compared with the newest model of its family;
// --update rewrites rows to it, keeping the :thinking suffix. Families that no
// row uses are listed so new model lines are easy to spot.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function parse(id) {
  const parts = id.split("-");
  // dated snapshots (claude-haiku-4-5-20251001) pin an alias; skip them
  if (parts.some((p) => /^\d{8}$/.test(p))) return null;
  const version = parts.filter((p) => /^\d+(\.\d+)*$/.test(p)).flatMap((p) => p.split(".").map(Number));
  const family = parts.filter((p) => !/^\d+(\.\d+)*$/.test(p)).join("-");
  return { family, version };
}

export function newer(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

export function latestByFamily(ids) {
  const best = new Map();
  for (const id of ids) {
    const p = parse(id);
    if (!p) continue;
    const cur = best.get(p.family);
    if (!cur || newer(p.version, parse(cur).version)) best.set(p.family, id);
  }
  return best;
}

function listModels(provider) {
  const out = execFileSync("pi", ["--list-models", provider], { encoding: "utf8" });
  return out
    .split("\n")
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter(([p, id]) => p === provider && id)
    .map(([, id]) => id);
}

function main([file, flag]) {
  const lines = readFileSync(file, "utf8").split("\n");
  const row = /^(\S+)(\s+)(\S+)(\s+)(\S+)\/([^:\s]+)(:\S+)?$/;
  const providers = [...new Set(lines.map((l) => l.match(row)?.[1]).filter(Boolean))];
  const latest = new Map(providers.map((p) => [p, latestByFamily(listModels(p))]));
  const used = new Set();
  let changes = 0;

  const updated = lines.map((l) => {
    const m = l.match(row);
    if (!m || l.startsWith("#")) return l;
    const [, provider, s1, tier, s2, , id, thinking = ""] = m;
    const p = parse(id);
    const best = p && latest.get(provider).get(p.family);
    used.add(`${provider}/${p?.family}`);
    if (!best) {
      console.log(`${provider} ${tier}: ${id} is not offered by pi anymore; pick a replacement`);
      return l;
    }
    if (best === id) {
      console.log(`${provider} ${tier}: ${id} (latest)`);
      return l;
    }
    changes++;
    console.log(`${provider} ${tier}: ${id} -> ${best}`);
    return `${provider}${s1}${tier}${s2}${provider}/${best}${thinking}`;
  });

  for (const [provider, fams] of latest) {
    const unused = [...fams].filter(([f]) => !used.has(`${provider}/${f}`)).map(([, id]) => id);
    if (unused.length) console.log(`\n${provider}: other model lines available: ${unused.join(", ")}`);
  }

  if (flag === "--update" && changes) {
    writeFileSync(file, updated.join("\n"));
    console.log(`\nUpdated ${changes} row(s) in ${file}`);
  } else if (changes) {
    console.log("\nRun `pi-subagent tiers --update` to apply.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
