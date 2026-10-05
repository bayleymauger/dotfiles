#!/usr/bin/env node
// Validate a skill directory against the Agent Skills spec as pi applies it.
// Usage: validate.js <skill-dir>

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { isMain, parseFrontmatter } from "./lib.js";

const ALLOWED = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
  "disable-model-invocation",
]);

export function validateSkill(dir) {
  const errors = [];
  const warnings = [];
  const file = join(dir, "SKILL.md");

  if (!existsSync(file)) return { errors: ["SKILL.md not found"], warnings };

  const content = readFileSync(file, "utf8");
  let data, body;

  try {
    ({ data, body } = parseFrontmatter(content));
  } catch (e) {
    return { errors: [`Invalid frontmatter: ${e.message}`], warnings };
  }

  const unknown = Object.keys(data).filter((k) => !ALLOWED.has(k));

  if (unknown.length)
    warnings.push(
      `Unknown frontmatter key(s): ${unknown.join(", ")} (allowed: ${[...ALLOWED].join(", ")})`,
    );

  const name = typeof data.name === "string" ? data.name.trim() : "";

  if (!name) errors.push("Missing 'name'");
  else {
    if (!/^[a-z0-9-]+$/.test(name))
      errors.push(
        `Name '${name}' must be lowercase letters, digits and hyphens`,
      );
    if (/^-|-$|--/.test(name))
      errors.push(
        `Name '${name}' cannot start/end with a hyphen or contain '--'`,
      );
    if (name.length > 64) errors.push(`Name is ${name.length} chars (max 64)`);
    if (name !== basename(resolve(dir)))
      warnings.push(
        `Name '${name}' differs from directory '${basename(resolve(dir))}' (pi allows it; other agents may not)`,
      );
  }

  const desc =
    typeof data.description === "string" ? data.description.trim() : "";

  if (!desc) errors.push("Missing 'description' (pi will not load the skill)");
  else {
    if (desc.length > 1024)
      errors.push(`Description is ${desc.length} chars (max 1024)`);
    if (/[<>]/.test(desc))
      warnings.push(
        "Description contains angle brackets; some agents reject these",
      );
    if (desc.length < 80)
      warnings.push(
        "Description is very short; say what the skill does AND when to use it",
      );
  }

  if (data.compatibility && String(data.compatibility).length > 500)
    errors.push("compatibility exceeds 500 chars");

  const bodyLines = body.split("\n").length;

  if (bodyLines > 500)
    warnings.push(
      `SKILL.md body is ${bodyLines} lines; consider moving detail into references/`,
    );

  // Relative file references that don't exist
  const prose = body.replace(/```[\s\S]*?```/g, "");
  const refs = [
    ...prose.matchAll(/`((?:scripts|references|assets|agents)\/[^`\s]+)`/g),
  ].map((m) => m[1]);
  for (const r of new Set(refs)) {
    const path = r.split(/\s/)[0];
    if (!existsSync(join(dir, path)))
      warnings.push(`Referenced file not found: ${path}`);
  }

  for (const sub of ["scripts"]) {
    const p = join(dir, sub);
    if (existsSync(p) && readdirSync(p).length === 0)
      warnings.push(`Empty ${sub}/ directory`);
  }

  return { errors, warnings };
}

if (isMain(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: validate.js <skill-dir>");
    process.exit(1);
  }
  const { errors, warnings } = validateSkill(dir);
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error:   ${e}`);
  console.log(errors.length ? "Skill is INVALID" : "Skill is valid");
  process.exit(errors.length ? 1 : 0);
}
