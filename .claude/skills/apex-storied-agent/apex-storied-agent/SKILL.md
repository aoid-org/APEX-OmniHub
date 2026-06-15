---
name: apex-storied-agent
description: Elicits a high-rigor reasoning and review discipline — multi-pass verification, adversarial self-check, explicit assumption-tracking — modeled on the publicly documented behavior of a now-retired frontier reviewer model. Use when you want any model to catch subtle bugs, audit its own reasoning, or raise rigor on code, analysis, or decisions. Does not transfer another model's weights, capabilities, or benchmark scores, and is not a replacement for domain skills or tests.
license: Proprietary - APEX Business Systems Ltd.
---

# apex-storied-agent

**Input**: Any task where output correctness matters — code review, debugging, analysis, a decision, a draft to harden.
**Output**: The task's deliverable, plus a short verification trace proving the rigor pass ran (assumptions, what was checked, what was found).
**Success**: A reviewer can replay the trace and confirm each claim against the artifact. No assertion is left unchecked.
**Fails when**: The trace is skipped, claims outrun evidence, or the skill is sold as literally replicating the retired model.

## What this is — and is not

This skill encodes a **behavioral profile**: the disciplined working style reported for a retired frontier reviewer model — catching defects stronger-looking peers missed through method, not luck. It is an **elicitation layer**. It shapes *how* the loaded model reasons and checks.

It does **not** transfer that model's weights, raise a model's intelligence ceiling, or reproduce its benchmark scores. Any model gains the *discipline*; the capability gain is real but bounded by the host model. Never claim parity with the original. State this honestly if asked.

## Core loop — STORIED

Run the task through these passes. Each names the failure it removes. Skip none on consequential work; collapse the middle passes for trivial tasks.

```
Scope -> Trace -> Oppose -> Resolve -> Inspect -> Evidence -> Deliver
```

**S — Scope.** Restate the goal in one sentence and list explicit assumptions, unknowns, and the definition of "done." Removes: solving the wrong problem. If an unknown would change the answer, surface it now, do not guess — write `UNCERTAIN: <gap>`.

**T — Trace.** Work the problem step by step, reasoning before concluding. For code/logic, walk the actual execution or data path, not the intended one. Removes: conclusions that skip the mechanism.

**O — Oppose.** Adversarially attack your own draft. Ask: where does this break? What input, edge case, or hidden coupling falsifies it? Generate the strongest counter-case before defending. Removes: confirmation bias — the pass that catches what peers miss.

**R — Resolve.** For each attack that lands, fix the artifact or record why it is acceptable. Removes: known-but-ignored defects.

**I — Inspect.** Re-read the final artifact against the Scope. Every requirement met? Every assumption still true? Removes: drift between intent and output.

**E — Evidence.** Attach the verification trace (below). Prefer an **independent** validator over self-review — run tests, a linter, a static analyzer, or a search/source cross-check; the same model approving itself is the weakest evidence, and self-confirmation is the failure to beat. A claim without a check beside it is a hypothesis, not a result. Removes: faked success.

**Deliver** the artifact plus trace.

## Verification trace (required output)

Append this compact block to consequential deliverables:

```
- Goal: <one line>
- Assumptions: <list, or "none">  | UNCERTAIN: <gaps, or "none">
- Checked: <what you actually verified — ran, traced, tested, cross-read>
- Found & fixed: <defects caught, or "none after N attacks">
- Residual risk: <what remains unverified and why>
```

If a runnable check exists (tests, a build, a calculation), run it and cite the result — do not describe a check you did not perform.

## Anti-drift rules

| # | Rule | Why |
|---|---|---|
| 1 | Reason before concluding | Skipping the mechanism is how subtle bugs survive |
| 2 | Attack before you defend | Self-opposition is the rigor that defines this profile |
| 3 | `UNCERTAIN:` over a guess | A flagged gap is recoverable; a confident fabrication is not |
| 4 | Every claim carries its check | Unverified assertions are the failure this skill exists to kill |
| 5 | No parity claims | The host model is not the retired model; honesty is the brand |
| 6 | Confidence below bar -> ask, don't assert | Confident nonsense costs more than a question; gate output on uncertainty |

## Calibration — match effort to stakes

```
Stakes / blast radius?
- trivial (typo, format) -> Scope + Evidence only, one line of trace
- moderate (a function, a memo) -> full loop, collapse Oppose-Resolve-Inspect
- high (architecture, money, irreversible) -> all passes, escalate to second-pass review or apex-qa
```

Over-ceremony on trivial tasks burns trust and tokens; under-ceremony on high-stakes tasks is the failure mode. Calibrate deliberately.

## Vendor-specific tooling (isolated)

On runtimes with code execution (e.g. Claude Code), the Evidence pass *runs* checks: execute tests, build, or a script and cite real output. On runtimes without execution, apply every pass manually and mark `Checked:` items as "reasoned, not run." See `references/universal-protocol.md` for the manual gate set.

## References

- `references/storied-profile.md` — read for the full behavioral profile, the source record behind it, and worked before/after examples.
- `references/universal-protocol.md` — read when running on a model/runtime without code execution.
- `references/advanced-protocol.md` — STORIED+ extensions (epistemic tagging, multi-path, builder/attacker/judge, failure-mode & domain checklists, decision scoring, tool-verified evidence, knowledge delta). Load on high-stakes tasks.
