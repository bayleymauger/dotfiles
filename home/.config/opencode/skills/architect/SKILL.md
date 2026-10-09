---
name: architect
description: "Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', kicking off a new feature, or non-trivial work where jumping to code would lock in the wrong shape."
disable-model-invocation: true
---

# Architect

Design before implementing. Sketch types, function signatures, class shapes, and module boundaries with `not implemented` bodies and pseudocode. Get independent sketches from different model families, synthesize them, then fill in code against the chosen sketch. If implementation proves the sketch wrong, throw it out and redesign.

The phases are Ground, Sketch, Agree, Implement, and Scrap.

## Phase A: Ground the problem

Build a real mental model of every system the new code touches. Run the `how` skill over the relevant subsystems.

Naming a file isn't grounding. Produce the traced model `how` prescribes. If the design redefines ownership or layering, also run the `why` skill on the existing shape so the rationale becomes a constraint, not a guess.

Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate.

## Phase B: Sketch

### Frame

1. State the design task in one paragraph: what the feature does, for whom, and the constraints Phase A surfaced.
2. Write 3-6 concrete criteria the winning design must meet. These are for you when picking a base. The runners only see the task.
3. Create a scratch directory outside the repository, such as `/tmp/opencode/architect-<slug>/`, with one subdirectory per runner. Runners write there, never into the repository.

### Fan out

Spawn two runners in a single message with the `subagent` tool, `agent: general`:

| Runner | Default family |
|--------|----------------|
| A | Newest Anthropic Opus, `xhigh` variant |
| B | Newest OpenAI Sol, `xhigh` variant |

Resolve each family to an exact model ID with the `models` tool before spawning. Filter by provider, and leave `all` unset so only the newest version of each family comes back. Pick the base model, not a `-fast` or `-ultrafast` speed tier. Use the `xhigh` variant, or the highest variant it lists if `xhigh` is missing. If the user names models, use those instead. If a model is unavailable, use the newest flagship from the same provider, or a third provider. Different model families are the point.

Each runner's prompt contains the design task, the Phase A grounding, its own output directory, and an instruction to read `references/runner-prompt.md` (give the absolute path under this skill's base directory) and follow it. Each produces a design package with a rationale shaped per `references/rationale-template.md`. Tell runners not to edit the repository.

Design it twice. Require at least two structurally distinct candidates before synthesis, even when the first looks sufficient. This is the `principle-exhaust-the-design-space` skill made concrete. Whole-shape alternatives, not point fixes inside one shape. If both runners converge on the same shape, that is a strong agreement signal, so note it and use the consensus shape. If you need a distinct alternative and both converged, spawn one more runner and tell it which shape to avoid.

### Pick and graft

Read every candidate end to end.

Screen every candidate against [`references/design-red-flags.md`](references/design-red-flags.md). Assume the next contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Prefer the design where a change that looks right from one file is right for the whole repo.

Score the candidates against your criteria one by one, not on holistic feel. Compare viable candidates on interface depth. Prefer the design that hides more complexity behind a smaller, simpler public surface. A rich interface can keep call chains short by concentrating capability instead of scattering it across layers.

Pick the strongest as the base. Graft the best ideas from the other into it by hand, per the `principle-redesign-from-first-principles` skill. Don't paste mechanically. The result has to stay coherent under one mental model. If the candidates diverge wildly, the framing was under-specified. Reframe and rerun rather than averaging them.

Record the base, the grafts, and the rejections in the rationale's "Synthesis decision" section.

## Phase C: Agree (opt-in)

Default: proceed directly to implementation with the synthesized design. No human checkpoint.

Opt in to a checkpoint when the invoker explicitly asks: "/architect with checkpoint," "stop and show me before implementing," or similar. Then surface the synthesized design and pause for sign-off.

The synthesis can ship as its own commit either way, as the "scaffold first" mode of the `principle-foundational-thinking` skill. Planned and scoped breakage while filling in the sketch is fine, as long as the end state is verified. For adversarial pressure on the design before implementing, run the `interrogate` skill on the synthesized sketch.

If the human pushes back on the shape (in a checkpoint or after the fact), treat that as Phase A evidence. Re-ground and re-run Phase B before writing more code.

## Phase D: Implement against the sketch

Replace `not implemented` bodies with code, pseudocode with logic. The synthesized sketch is the contract.

Deviations from the sketch are signal worth surfacing, not friction to absorb silently. If a function needs a parameter the sketch didn't anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching.

## Phase E: Scrap when the architecture is wrong

If implementation keeps producing friction the sketch can't absorb, throw the sketch out. Don't bolt fixes onto a wrong design, per the `principle-redesign-from-first-principles` skill. Fix the root cause, not the symptom.

The signal is a *pattern*, not single instances. Tells:

- The same shape of workaround appearing repeatedly across unrelated code.
- Multiple unrelated edge cases that all need special-case branches.
- Types that need escape hatches (`any`, casts, optional fields always set in practice) to compile.
- The "we need a lock" reflex when the sketch said the state wasn't shared.
- Callers having to know the abstraction's internal rules to use it.
- Two or more independent Phase D deviations of the same shape across the implementation.

Use judgment. A few edge cases don't condemn an architecture. Some problems are legitimately complex. Complexity in the data is not complexity in the design.

When you scrap:

1. Re-run the `how` skill over what's been built.
2. Redesign as if the new constraints had been day-one assumptions, per `principle-redesign-from-first-principles`.
3. Subtract before adding, per the `principle-subtract-before-you-add` skill. The new sketch should be smaller than the old one before it grows.
4. Return to Phase B.

## Outputs

The caller's usage is written first and the type sketch derived from it. One file with new types and signatures for small changes. Module map plus type definitions for larger work. The rationale ships alongside, shaped per `references/rationale-template.md`, including the usage sketch and the synthesis decision.
