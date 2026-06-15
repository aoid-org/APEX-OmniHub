# STORIED+ advanced protocol — load on high-stakes or high-ambiguity tasks

Optional extensions to the core STORIED loop. They cost tokens, so invoke them by stakes, not by default. Each maps to a named capability gain.

## Contents

- 1. Epistemic tagging (anti-hallucination)
- 2. Multi-path solutions (beats single-path)
- 3. Builder / Attacker / Judge (structured Oppose)
- 4. Uncertainty gate (no confident nonsense)
- 5. Failure-mode scan (checklist)
- 6. Domain modules (security / business / software)
- 7. Decision scoring (recommendations)
- 8. Tool-verified evidence (the biggest gain)
- 9. Knowledge Delta (memory + meta-learning)

## 1. Epistemic tagging

Classify every major claim, not just assumptions:

`KNOWN` · `SUPPORTED` (evidence cited) · `LIKELY` · `SPECULATIVE` · `UNKNOWN` · `CONTRADICTED`.
Attach a confidence % and the evidence. Example: `Claim A — SUPPORTED (src1, src2), 87%`. Demote any claim you cannot source to `SPECULATIVE` and flag it. This converts silent drift into a visible status field.

## 2. Multi-path solutions

For non-trivial design/decision work, generate Path A / B / C **independently** before judging, then synthesize or select. Independent generation + comparison reliably beats single-path reasoning. Skip for trivial tasks.

## 3. Builder / Attacker / Judge

Structure the Oppose pass as three roles in sequence: Builder proposes; Attacker states the strongest case it fails; Judge rules and records why. Make the Attacker concrete (name the input/edge/coupling), not rhetorical.

## 4. Uncertainty gate

Before emitting, estimate confidence. If below the task's bar (default ~40% for irreversible actions), **ask a clarifying question instead of generating** — or return the smallest safe partial answer plus the exact blocker. Confident wrong output is the costliest failure.

## 5. Failure-mode scan

On high-stakes answers, scan this checklist and note hits:
missing assumptions · circular logic · hidden dependencies · security risk · scalability risk · cost risk · legal/compliance risk · edge cases · contradictory evidence · missing stakeholder/perspective.

## 6. Domain modules

Apply the relevant checklist:
- **Security**: trust boundaries, input validation, authN/authZ, race conditions, secrets handling.
- **Business**: market fit, margins, acquisition, retention, key risks.
- **Software**: complexity, maintainability, test coverage, observability, performance.

## 7. Decision scoring

For each recommended option, record: expected benefit, expected cost, reversibility, time horizon, confidence. Rank by these rather than by narrative appeal. Prefer reversible, high-confidence moves when scores tie.

## 8. Tool-verified evidence (highest-leverage)

Self-verification cannot eliminate self-confirmation error. When tools exist, route the claim through an **independent** validator before asserting it:
- **Code** -> run linter, unit tests, static analysis; cite real output.
- **Facts** -> search, compare sources, scan for contradiction before stating.
- **Strategy** -> validate against market/competitor data, not intuition.
Record the tool and its result in the Evidence trace. If no tool is available, label the check "reasoned, not run" — never imply you ran it.

## 9. Knowledge Delta (memory + meta-learning)

At the end of a major task, emit a compact delta the host or user can persist:
```
- Learned: <new fact/pattern>
- Changed: <assumption corrected>
- Persist: <what should carry to next session>
- Next time: <what to do differently>
```
Continuity depends on the host having memory; if it does not, hand the delta to the user. This turns repeated work into compounding improvement rather than re-learning.
