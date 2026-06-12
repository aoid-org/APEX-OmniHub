---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# apex-skill-forge v9.4.0 — Claude edition

Forge, audit, and package agent skills that ship with their own evidence: a lint-gated structure, a token ledger, a validated trigger eval, a 100-point binary rubric, and a one-command install path. Licensed by APEX Business Systems Ltd. — see LICENSE.md.

## Install

```bash
npx skills add https://github.com/apexbusiness-systems/apex-skill-forge --skill apex-skill-forge
```

Claude Code: `/plugin marketplace add apexbusiness-systems/apex-skills-marketplace` | manual: copy this folder to `~/.claude/skills/` | claude.ai: upload `dist/apex-skill-forge-9.4.0-claude.skill` under Settings -> Capabilities. A vendor-agnostic edition of this same package ships separately for non-Claude runtimes.

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
| Distribution pack | none | 3 install channels + SHA-256 + scorecard |

Recorded tradeoff: the description is larger than v4's (474 chars vs 188) because the always-loaded description is the only selection-time signal — richer triggering bought for ~71 additional always-loaded estimated tokens, inside the 500-char budget. Regenerate every figure: `python scripts/forge.py score . && python scripts/forge.py rubric .`

## What it does

- Six-phase pipeline (INTENT -> SPEC -> BUILD -> MEASURE -> PACK -> PUBLISH) gated by `forge.py lint --strict` and a 20-check binary rubric.
- Hard token budgets per loading tier; depth in on-demand references, determinism in never-loaded scripts.
- Trigger engineering: description formula plus a balanced should/should-not eval set, validated by tooling.
- Claim discipline: numeric claims are lint-blocked unless `scorecard.json` contains the measurement that produced them.
- Distribution pack on every forged skill: one-line installs, before/after README section, checksum, marketplace listing checklist, runtime footer.
- Vendor-agnostic by construction: every gate also exists as a manual protocol (`references/universal-protocol.md`) for runtimes without code execution.

## Verify the package

```bash
sha256sum -c dist/apex-skill-forge-9.4.0-claude.skill.sha256
python scripts/forge.py lint . --strict && python scripts/forge.py rubric .
```

---
Runs on **APEX-OmniHub** — AI execution governance runtime. (c) 2026 APEX Business Systems Ltd., Edmonton, AB. Proprietary license: LICENSE.md.
