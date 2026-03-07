# UX Audit Playbook (Friction → Fix → Measure)

## Inputs you can use
- Analytics funnels: drop-offs, time-to-complete
- Qualitative: reviews, support tickets, interviews
- Observational: usability tests, session replays

## Build a friction map
Create a table:
| Step | User intent | Evidence | Friction | Severity | Hypothesis | Fix | Metric |
Severity rubric:
- P0: blocks task completion
- P1: major confusion or high error rate
- P2: annoyance, slows down
- P3: cosmetic

## Prioritization (ICE)
Score each friction 1–10:
- Impact: effect on key metric
- Confidence: strength of evidence
- Effort: design + dev cost
Sort by (Impact × Confidence) / Effort.

## Fix design rules
- Change the smallest thing that could plausibly move the metric.
- Preserve user context; avoid breaking mental models.
- Provide rollback plan.

## Experiment plan
- Hypothesis: "If we ___ then ___ because ___"
- Primary metric: completion rate, conversion, retention, NPS proxy
- Guardrails: error rate, time, support tickets
- Duration/segment (if known); otherwise propose pre/post with caveats.

## Output checklist
- [ ] 3–10 frictions documented with evidence
- [ ] Top 1–3 fixes proposed with prototypes/specs
- [ ] Measurement plan + risks + rollback
