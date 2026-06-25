# IAS Tiers — Intelligence Amplification Stack

Adapted from apex-boost. Select the LOWEST tier that matches blast radius.
Never over-reason trivial problems — token overhead is real cost.

| Tier | Blast radius | Technique | Overhead | When |
|---|---|---|---|---|
| 1 | LOW | CoT-Lite: Plan → Execute → Verify | +15% | Clear single fix, no ambiguity |
| 2 | MODERATE | Full CoT: Decompose → Reason → Synthesize → Verify | +30% | Local bug, design question |
| 3 | HIGH | ToT-Branch: 2 paths → score → best → verify | +50% | User-facing, blocked work |
| 4 | CRITICAL | ToT + Self-Consistency: 3 independent paths → majority vote | +70% | Prod down, irreversible, financial |

## CoT-Lite (Tier 1)
```
1. State the fix
2. Apply it
3. Confirm it works — one sentence
```

## Full CoT (Tier 2)
```
1. Decompose the problem into ≤3 sub-problems
2. Reason through each sub-problem step by step
3. Synthesize into a unified fix
4. Verify: does the fix address all sub-problems?
```

## ToT-Branch (Tier 3)
```
Path A: [approach] → [mechanism] → [projected outcome] → score /10
Path B: [approach] → [mechanism] → [projected outcome] → score /10
Winner → Execute → Verify
```

## Self-Consistency (Tier 4)
```
Run 3 independent reasoning paths (different entry points, different framings).
If 2+ converge → that is the answer.
If diverge → escalate: surface the divergence explicitly before proceeding.
```

## Escalation rule
If Tier 3/4 reasoning paths diverge and cannot be resolved → output:
```
UNCERTAIN: [specific gap] — requires [exact file / data / decision] before proceeding
```
Never fabricate a resolution to a genuine disagreement between reasoning paths.
