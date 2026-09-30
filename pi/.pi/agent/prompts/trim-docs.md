---
description: Trim unnecessary comments and documentation
argument-hint: "[scope]"
---
Review and edit code comments and documentation in ${@:-the current changes}.

- Keep only what helps a reader use the code or understand non-obvious intent, constraints, or pitfalls.
- Remove comments that restate the code, redundant explanations, filler, and stale information.
- Make useful text concise and direct without losing essential context, warnings, or instructions.
- Preserve license notices and tool directives. Do not change code behavior.
- Do not add documentation for its own sake or expand the scope. If the text is already useful and concise, leave it alone.

Keep the edits and your summary brief. Don't bloat.
