---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# apex-skill-forge v9.4.0 — Universal edition

Forge, audit, and package agent skills that ship with their own evidence. This edition is identical in rules and tooling to the Claude edition and is packaged for any agent that supports the open Agent Skills format (a folder with SKILL.md) — or no agent framework at all. Licensed by APEX Business Systems Ltd. — see LICENSE.md.

## Install

```bash
npx skills add https://github.com/apexbusiness-systems/apex-skill-forge --skill apex-skill-forge
```

Any skills-capable agent: copy this folder into its skills directory. Runtimes **without code execution**: paste `SKILL.md` into context and apply `references/universal-protocol.md` — every gate, budget, and the full 20-check rubric exist there as a manual checklist, so the method runs on any model that can read.

## Before / After

**Task**: bring the previous public forge (v8 lineage; local copy v4.0.0) to publishable standard. Both versions measured by the same commands in the same run: `python scripts/forge.py tokens|lint <dir>` (token figures are estimates, chars/4 — method stated in the tool output).

| Metric | v4 baseline | v9.4.0 (this package) |
|---|---|---|
| SKILL.md lines | 568 | 156 (budget 200) |
| Body tokens on trigger (est.) | ~4,349 | ~2,290 |
| Lint gate | 3 FAIL / 5 WARN | 0 FAIL / 0 WARN |
| Rubric (20 binary checks) | not run — gates absent | 100/100 |
| Unbacked claims in package | multiplier + banned-lexicon hits | 0 (lint-blocked) |
| Trigger eval | none | 18 queries (9 pos / 9 neg), validated |
| License artifact | LICENSE.md | LICENSE.md (proprietary, APEX) |
| Distribution pack | none | install channels + SHA-256 + scorecard |

Regenerate every figure where execution exists: `python scripts/forge.py score . && python scripts/forge.py rubric .` — or score by hand with the manual rubric in `references/universal-protocol.md`.

## What it does

- Six-phase pipeline (INTENT -> SPEC -> BUILD -> MEASURE -> PACK -> PUBLISH) gated by lint and a 20-check binary rubric.
- Hard token budgets per loading tier; depth in on-demand references, determinism in scripts that never load into context.
- Trigger engineering: description formula plus a balanced should/should-not eval set.
- Claim discipline: numbers ship only with the scorecard measurement that produced them.
- Distribution pack on every forged skill: one-line installs, before/after README, checksum, listing checklist, runtime footer.
- Tool layer optional by design: the rules are the product; `scripts/forge.py` is one implementation, the universal protocol is another.

## Verify the package

```bash
sha256sum -c dist/apex-skill-forge-9.4.0-universal.skill.sha256
python scripts/forge.py lint . --strict && python scripts/forge.py rubric .
```

---
Runs on **APEX-OmniHub** — AI execution governance runtime. (c) 2026 APEX Business Systems Ltd., Edmonton, AB. Proprietary license: LICENSE.md.
