---
name: prototype
description: "Build throwaway variants to settle one design decision before the real build: a layout, an interaction, a density, or an approach whose behavior or timing you need to see. Use for /prototype, 'prototype this', 'try a few options', or when the right shape depends on how it looks or behaves."
disable-model-invocation: true
---

# Prototype

**You own the design decision, not the code. The prototype is a throwaway instrument. The real build comes after, with the `architect` skill for the shape.**

This is the one case where "smallest change" and the usual verification bar invert. Speed beats polish, code quality does not matter, and there is no planning. The rigor is in picking the right design cheaply. Propose variations the user didn't ask for. Throw an approach away and try another.

1. **Scope the decision the prototype exists to make.** Which layout, which interaction, which density, or for an empirical fork, which behavior, timing, or approach. No decision means no prototype. Build the feature normally instead.
2. **Gather references when the design space is open.** Search for prior art, summarize a moodboard of themes, palettes, and layouts, and let the user pick directions before building. Skip this when the direction is set.
3. **Build throwaway in an isolated scratch directory** outside production source, such as `/tmp/opencode/prototype-<slug>/`. For a visual decision, use vanilla HTML, CSS, and JS or the lightest stack that renders the idea, with CDN dependencies and a dev server with hot reload. For a behavioral or timing decision, write the smallest script that exercises the question. No production framework, no tests, no abstractions.
4. **Put alternatives behind one switcher** (buttons or a keypress), each variant labeled. This is the `principle-exhaust-the-design-space` skill made cheap.
5. **Observe each variant on the surface the decision is about.** For a visual decision, open the page in a browser tool (the in-app browser panel or Playwright), drive the interaction, and capture a screenshot of each variant. For a behavioral or timing decision, log the timing, print the output, or watch the render. The observation is the test here, not an assertion.
6. **Present alternatives, tradeoffs, and a recommendation.** The output is the decision plus the throwaway artifact, not shippable code. Hand the chosen direction to the real build, using the `architect` skill when the shape is non-trivial.

**Reply:** the variants explored, the evidence (screenshots for a visual decision, the observed output or timing for a behavioral one), tradeoffs, your recommendation, and the scratch path. Say plainly that the prototype is throwaway.
