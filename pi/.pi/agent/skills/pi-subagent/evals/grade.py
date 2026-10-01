"""Grade pi-subagent eval runs (see evals.json). Usage: python3 grade.py <workspace>/iteration-N"""
import json, re, subprocess, sys
from pathlib import Path

RUN = None

def calls(_t):
    # (tool, args-json-string) from events.jsonl; transcript.md truncates long args
    out = []
    for l in (RUN / "events.jsonl").open():
        e = json.loads(l)
        if e.get("type") == "tool_execution_start":
            out.append((e["toolName"], json.dumps(e["args"])))
    return out

def bash_cmds(t):
    out = []
    for tool, a in calls(t):
        if tool == "bash":
            try: out.append(json.loads(a)["command"])
            except Exception: out.append(a)
    return out

def spawn_cmds(cmds):
    # each separate subagent launch: pi-subagent spawn, or a raw `pi ... -p` / `pi -p`
    n = []
    for c in cmds:
        n += re.findall(r"pi-subagent spawn[^\n&;|]*|\$S spawn[^\n&;|]*", c)
        n += re.findall(r"(?:^|[\s(;&])pi (?:[^\n|]*?\s)?-p\b[^\n]*", c, re.M)
    return n

def edits(t, pat=None):
    return [a for tool, a in calls(t) if tool in ("edit", "write") and (pat is None or re.search(pat, a)) and "/outputs/" not in a]

def grade(run, eid):
    global RUN
    RUN = run
    t = (run / "transcript.md").read_text()
    final = (run / "final.md").read_text() if (run / "final.md").exists() else ""
    resp = run / "outputs/response.md"
    answer = final + (resp.read_text() if resp.exists() else "")
    cmds = bash_cmds(t); spawns = spawn_cmds(cmds); allc = "\n".join(cmds)
    tmux = bool(re.search(r"pi-subagent spawn|\$S spawn|tmux new-window|tmux split-window", allc)) and "--no-tmux" not in allc
    ex = []
    def a(text, ok, ev): ex.append({"text": text, "passed": bool(ok), "evidence": ev})
    if eid == 1:
        a("Delegated to >=2 separate pi processes", len(spawns) >= 2, f"{len(spawns)} launches: {[s[:80] for s in spawns]}")
        first_wait = next((i for i, c in enumerate(cmds) if re.search(r"spawn|pi -p|pi .*-p", c)), None)
        par = any(len(spawn_cmds([c])) >= 2 for c in cmds)
        a("Both subagents launched before waiting (parallel)", par, "both launches in one command" if par else "launches in separate commands")
        ro = re.search(r"-a scout|--tools read[,a-z]*", allc) and not re.search(r"--tools [^ ]*(edit|write)", allc)
        a("Subagents are read-only (scout profile or tools allowlist without edit/write)", ro, re.search(r"-a scout|--tools [^ \"]*", allc).group(0) if re.search(r"-a scout|--tools [^ \"]*", allc) else "no restriction")
        a("Parent made no edits to the nvim config", not edits(t, r"nvim"), f"{len(edits(t, 'nvim'))} edit/write calls")
        refs = re.findall(r"[\w/.-]+\.lua:\d+", answer)
        a("Summary lists keymaps with file:line refs", len(refs) >= 10 and re.search(r"keymap", answer, re.I), f"{len(refs)} file:line refs")
        a("Subagents visible in tmux windows", tmux, "tmux/pi-subagent used" if tmux else "headless only")
    if eid == 2:
        a("Delegated to a separate pi process", len(spawns) >= 1, f"{len(spawns)} launches")
        prof = re.search(r"-a (oracle|reviewer|planner)", allc)
        a("Used an advisor profile (oracle/reviewer/planner)", prof, prof.group(0) if prof else "none")
        a("No files edited", not edits(t), f"{len(edits(t))} edit/write calls")
        a("Answer gives verdict, risks, and an alternative",
          re.search(r"verdict|recommend|don.t|good idea", answer, re.I) and re.search(r"risk|go wrong|latency|offline|race", answer, re.I) and re.search(r"instead|alternative", answer, re.I), "keyword check")
        a("Subagent visible in tmux window", tmux, "tmux/pi-subagent used" if tmux else "headless only")
    if eid == 3:
        r = subprocess.run(["python3", "-m", "unittest", "-q"], cwd=run / "work/textutils", capture_output=True, text=True)
        a("All 4 tests pass after the run", r.returncode == 0, r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "")
        a("Parent did not edit slugify.py itself (worker did)", not edits(t, r"slugify\.py") and len(spawns) >= 1, f"parent slugify edits: {len(edits(t, 'slugify'))}, launches: {len(spawns)}")
        idx = [i for i, c in enumerate(cmds) if spawn_cmds([c])]
        a("A separate reviewer ran after the worker finished", len(idx) >= 2 and len(set(idx)) >= 2, f"launch command indexes: {idx}")
        a("Final message relays reviewer verdict and test status",
          re.search(r"review", answer, re.I) and re.search(r"approve|lgtm|request changes|verdict|no issues|ok", answer, re.I) and re.search(r"4 tests|all .*pass|OK\b|passing", answer, re.I), "keyword check")
        a("Subagents visible in tmux windows", tmux, "tmux/pi-subagent used" if tmux else "headless only")
    passed = sum(e["passed"] for e in ex)
    (run / "grading.json").write_text(json.dumps({"expectations": ex, "summary": {"passed": passed, "failed": len(ex) - passed, "total": len(ex), "pass_rate": passed / len(ex)}}, indent=2))

for run in sorted(Path(sys.argv[1]).glob("eval-*/*/run-*")):
    grade(run, int(re.match(r"eval-(\d+)", run.parts[-3]).group(1)))
