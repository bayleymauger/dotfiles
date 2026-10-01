#!/usr/bin/env node
// Propose a better skill description from trigger-eval results (one pi call).
//
// Usage: improve-description.js --eval-results results.json --skill-path <skill>
//                               [--history history.json] [--model provider/id] [--verbose]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  callPi,
  defaultModel,
  die,
  isMain,
  parseArgs,
  parseSkill,
} from "./lib.js";

const extract = (text) => {
  const m = text.match(/<new_description>([\s\S]*?)<\/new_description>/);

  return (m ? m[1] : text).trim().replace(/^"|"$/g, "");
};

export async function improveDescription({
  skillName,
  skillContent,
  currentDescription,
  evalResults,
  history = [],
  model,
  testResults,
  logDir,
  iteration,
}) {
  const failed = evalResults.results.filter((r) => r.should_trigger && !r.pass);
  const falseTrig = evalResults.results.filter(
    (r) => !r.should_trigger && !r.pass,
  );
  const train = `${evalResults.summary.passed}/${evalResults.summary.total}`;
  const scores = testResults
    ? `Train: ${train}, Test: ${testResults.summary.passed}/${testResults.summary.total}`
    : `Train: ${train}`;

  let prompt = `You are optimizing the description of a skill called "${skillName}" for the pi coding agent. A skill is a folder with a SKILL.md file. pi lists every available skill's name, description and file path in its system prompt; when a user request matches, the model reads the SKILL.md (and, from there, any bundled scripts/references). The full instructions are only loaded on demand — so the description alone decides whether the skill gets used.

Your goal is a description that makes the model load the skill for relevant requests and NOT for irrelevant ones.

Current description:
<current_description>
"${currentDescription}"
</current_description>

Current scores (${scores}):
<scores_summary>
`;

  if (failed.length)
    prompt += `FAILED TO TRIGGER (should have triggered but didn't):\n${failed.map((r) => `  - "${r.query}" (triggered ${r.triggers}/${r.runs} times)`).join("\n")}\n\n`;
  if (falseTrig.length)
    prompt += `FALSE TRIGGERS (triggered but shouldn't have):\n${falseTrig.map((r) => `  - "${r.query}" (triggered ${r.triggers}/${r.runs} times)`).join("\n")}\n\n`;
  if (history.length) {
    prompt +=
      "PREVIOUS ATTEMPTS (do NOT repeat these — try something structurally different):\n\n";
    for (const h of history) {
      prompt += `<attempt train=${h.train_passed ?? h.passed ?? 0}/${h.train_total ?? h.total ?? 0}>\nDescription: "${h.description}"\n`;

      const rs = h.train_results || h.results;

      if (rs)
        prompt += `Train results:\n${rs.map((r) => `  [${r.pass ? "PASS" : "FAIL"}] "${r.query.slice(0, 80)}" (triggered ${r.triggers}/${r.runs})`).join("\n")}\n`;
      prompt += "</attempt>\n\n";
    }
  }
  prompt += `</scores_summary>

Skill content (for context on what the skill does):
<skill_content>
${skillContent}
</skill_content>

Write a new, improved description. Generalize from the failures to broader categories of user intent rather than listing specific queries — an ever-growing list overfits, and every description is injected into every conversation, so space is precious.

Constraints and tips:
- About 100-200 words at most; hard limit 1024 characters.
- Say what the skill does AND when to use it ("Use when ..."), focusing on the user's intent, not implementation details.
- Models tend to under-use skills, so be a little pushy about the situations where it applies, including ones where the user doesn't name the skill's domain explicitly.
- Make it distinctive so it wins against other skills competing for the same requests, and say what it is NOT for if near-misses are triggering it.
- If earlier attempts kept failing, change sentence structure and framing, not just a few words.

Respond with only the new description inside <new_description> tags.`;

  const text = await callPi(prompt, { model });
  let description = extract(text);
  const transcript = {
    iteration,
    prompt,
    response: text,
    parsed_description: description,
    char_count: description.length,
  };

  if (description.length > 1024) {
    const retry = `${prompt}\n\n---\n\nA previous attempt was ${description.length} characters, over the 1024 limit:\n\n"${description}"\n\nRewrite it under 1024 characters, keeping the most important trigger words. Respond only with <new_description> tags.`;
    const t2 = await callPi(retry, { model });

    description = extract(t2);
    Object.assign(transcript, {
      rewrite_response: t2,
      rewrite_char_count: description.length,
    });
  }
  transcript.final_description = description;
  if (logDir) {
    mkdirSync(logDir, { recursive: true });
    writeFileSync(
      join(logDir, `improve_iter_${iteration ?? "unknown"}.json`),
      JSON.stringify(transcript, null, 2),
    );
  }
  return description;
}

if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2), { boolean: ["verbose"] });

  if (!a.evalResults || !a.skillPath)
    die(
      "Usage: improve-description.js --eval-results <file> --skill-path <skill> [--history file] [--model m]",
    );

  const { name, content } = parseSkill(resolve(a.skillPath));
  const evalResults = JSON.parse(readFileSync(a.evalResults, "utf8"));
  const history = a.history ? JSON.parse(readFileSync(a.history, "utf8")) : [];
  const description = await improveDescription({
    skillName: name,
    skillContent: content,
    currentDescription: evalResults.description,
    evalResults,
    history,
    model: a.model || defaultModel(),
  });

  if (a.verbose) console.error(`Improved: ${description}`);
  console.log(
    JSON.stringify(
      {
        description,
        history: [
          ...history,
          {
            description: evalResults.description,
            ...evalResults.summary,
            results: evalResults.results,
          },
        ],
      },
      null,
      2,
    ),
  );
}
