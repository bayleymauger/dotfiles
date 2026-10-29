# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the subagent `model`). Alias entries in a panel list still count toward its fan-out.
# budget: medium (high)
feature, refactoring: gpt-6-luna-high
bug-fix: gpt-6-luna-high
perf-issue: gpt-6-luna-high
hillclimb: gpt-6-luna-high
judgment and prose: gpt-6.1-sol-high
hardest tasks: gpt-6.1-sol-high
how explorer: gpt-6-luna-high
how explainer: gpt-6.1-sol-high
why investigators: gpt-6-luna-high
why synthesizer: gpt-6.1-sol-high
reflect tooling: gpt-6-luna-high
reflect judgment, divergent, synthesizer: gpt-6.1-sol-high
arena runners: gpt-6.1-sol-high, claude-opus-5-5-high
arena cross-judge pool: gpt-6.1-sol-high, claude-opus-5-5-high
swarm workers: gpt-6-luna-high
architect runners: gpt-6.1-sol-high, claude-opus-5-5-high
interrogate reviewers: gpt-6.1-sol-high, claude-opus-5-5-high
