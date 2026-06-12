---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Evidence Loop

Read this when generating a scorecard, designing task evals, or deciding whether a claim may ship.

## The principle

A skill description is a promise; a scorecard is the receipt. In a market of thousands of listings, the package that ships its own measurements is differentiated by construction — competitors must either match the rigor or concede the comparison. This converts quality from an adjective into an artifact.

## scorecard.json (written by `forge.py score`)

```json
{
  "skill": "<name>",
  "generated_utc": "ISO-8601",
  "tooling": "apex-skill-forge v9 forge.py",
  "lint":   {"fails": 0, "warns": 0, "findings": []},
  "tokens": {
    "method": "estimate: characters / 4",
    "metadata_always_loaded": 0,
    "description_chars": 0,
    "skill_md_body_on_trigger": 0,
    "skill_md_lines": 0,
    "references_on_demand": {"file.md": 0},
    "scripts_loaded_tokens": 0
  },
  "trigger_eval": {"validated": true, "positive": 0, "negative": 0, "total": 0,
                    "measured_rate": "<only if run live — omit otherwise>"},
  "task_eval":    {"<optional — see below>": null},
  "note": "Token values are estimates (chars/4)."
}
```

Fields are only ever written by tooling or by a recorded run. Hand-editing a scorecard defeats its purpose and, once noticed, destroys exactly the trust it exists to build.

## Task evals (skills with verifiable outputs)

For file transforms, data extraction, codegen, fixed workflows — anything objectively checkable:

1. Write 2–3 realistic prompts into `evals/evals.json` (`{"id", "prompt", "expected_output", "files"}`).
2. Run each prompt **with** the skill and **without** it (or against the previous version when upgrading). Same prompt, same inputs.
3. Grade against explicit assertions — each one objectively verifiable, named so a reader instantly knows what it checks. Record per assertion: `{"text", "passed", "evidence"}`. Where an assertion is programmatically checkable, check it with a script, not by eyeball.
4. Summarize into the scorecard: pass rate with-skill vs baseline, plus tokens/time per run if the harness reports them.

Skip assertions for subjective skills (writing style, design taste) — forcing fake objectivity is itself an integrity failure. Use human review and say so in the scorecard (`"task_eval": {"method": "human-review", "runs": N}`).

## The iteration loop

Run → review failures → generalize the fix (don't overfit to the test case) → trim anything in the skill not pulling weight in transcripts → rerun. Two signals end the loop: assertions pass and human feedback comes back empty. One signal demands a structural fix, not a wording fix: when transcripts show the model independently rebuilding the same helper logic across runs, bundle it as a script.

## The 100-point rubric

`forge.py rubric <dir>` runs twenty binary checks worth 5 points each — structure, budgets, lexicon, claims, license, evidence, distribution pack. Binary on purpose: a check passes by command or it fails, so the score cannot be negotiated, only earned. 100/100 is the publish bar and certifies exactly those twenty properties — it is not a quality opinion and never a market prediction. The same twenty checks appear as a manual checklist in `universal-protocol.md` for runtimes that cannot execute the tool.

## Claim policy (lint-enforced)

| Claim type | Allowed when |
|---|---|
| Capability statement ("extracts tables from PDFs") | The skill demonstrably does it — an eval or example in the package shows it |
| Numeric/multiplier ("2,100 tokens", "3x") | `scorecard.json` present and contains the producing field |
| Superlative ("best", "ultimate") | Never — see hype lexicon in `token-economics.md` |
| Comparison vs a named alternative | Both sides measured by the same method in the same run, method stated |

When a measurement is missing, write `UNCERTAIN: <what is unmeasured>` rather than an estimate dressed as a fact. An honest gap costs one line; a discovered fabrication costs the catalog.
