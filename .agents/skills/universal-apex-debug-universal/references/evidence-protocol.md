## Contents
1. [STORIED Pass Reference](#storied)
2. [Verification Trace Template](#trace)
3. [Claim Policy](#claims)

---

## #storied — Full STORIED Discipline (apex-storied-agent)

For critical ship gates, combine with apex-storied-agent explicitly.
Run every pass. Skip none on consequential work.

```
S — Scope:     Restate goal. List assumptions, unknowns, definition of done.
T — Trace:     Work the actual execution path, not the intended one.
O — Oppose:    Adversarially attack your own draft. Generate the strongest counter-case.
R — Resolve:   For every attack that lands, fix or record why acceptable.
I — Inspect:   Re-read against Scope. Every requirement met? Every assumption still true?
E — Evidence:  Attach verification trace. Prefer independent validator over self-review.
Deliver:       Artifact + trace.
```

The Adversarial Gate in SKILL.md is a compressed O→R→E pass.
For P0 incidents and critical production fixes, run the full STORIED sequence.

---

## #trace — Verification Trace Template

Append to every consequential deliverable:

```
VERIFICATION TRACE
------------------
Goal:         <one line>
Assumptions:  <list> | UNCERTAIN: <gaps, or "none">
Checked:      <what was actually verified — ran, traced, tested, cross-read>
Found/fixed:  <defects caught, or "none after N adversarial attacks">
Prevention:   <structural mechanism added — test / rule / guard / policy>
Confidence:   <High | Medium | Low> — <reason>
```

Low confidence → escalate or add more checks before shipping.
"High confidence" without evidence in the Checked field is not valid.

---

## #claims — Claim Policy

A number, multiplier, or superlative may appear in SKILL.md or README only if
scorecard.json contains the field that produced it.

Current scorecard-backed claims for universal-apex-debug v1.0.0:
- "-56% line reduction vs universal-debug": scorecard.improvements_over_predecessor.line_reduction_pct
- "-56% token overhead": scorecard.improvements_over_predecessor.token_overhead_vs_predecessor

Do not add new claims without adding the scorecard field that backs them.
