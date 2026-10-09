---
name: unslop
description: Cut AI tells from any writing.
disable-model-invocation: true
---

# Unslop

The writing rules live in the global instructions (`~/.config/opencode/AGENTS.md`, "Writing" section), so they already apply to every message. Other skills load this one to ask for a deliberate pass.

To unslop a piece of text:

1. Scan it for every pattern in the "Writing" section.
2. Rewrite it. Preserve the meaning and match the intended tone.
