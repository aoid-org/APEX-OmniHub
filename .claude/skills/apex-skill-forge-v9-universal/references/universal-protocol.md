# Universal Protocol (no-execution fallback)

Read this when the runtime cannot execute Python or shell — a chat-only model, a restricted agent, or any platform without code execution. The forge's gates are rules first and tooling second; this file is the rules, applied by hand. An agent that can run `scripts/forge.py` should prefer it (deterministic, cheaper); everything below produces the same verdicts manually.

## Format baseline

The package follows the open Agent Skills format: a folder whose `SKILL.md` carries YAML frontmatter (`name`, `description`, `license`) followed by markdown instructions. Any agent that can read a file — or be pasted a file — can ingest it. Nothing in SKILL.md depends on a specific vendor's tools.

## Manual gates (apply in order)

**1. Frontmatter.** Exactly three keys: `name`, `description`, `license`. Name: lowercase, hyphenated, ≤64 characters, equal to the folder name. Each value on a single line.

**2. Description.** ≤500 characters, three sentences: what it does (third person) · "Use when …" with concrete contexts · "Does not cover …" exclusion. Count the characters; do not estimate.

**3. Budgets.** SKILL.md ≤200 lines. Body ≈ characters ÷ 4 ≤ 2,500 estimated tokens. Reference files over 100 lines open with `## Contents`. Depth belongs in `references/`; determinism belongs in `scripts/` even when you cannot run them — a future runtime can.

**4. Banned lexicon.** Fail the package if SKILL.md or frontmatter contains any of: omnipotent · omniscient · god-mode · godlike · world's best · world-class · revolutionary · quantum leap · ultimate · magic / magical · singularity · first-pass perfection · zero-failure · infallible. In README these are warnings. Reason: zero capability per token, and curated registries score against them.

**5. Claims.** A number or multiplier may appear only if `scorecard.json` contains the measurement that produced it. No tooling? Then no numbers — write `UNCERTAIN: <unmeasured>` instead. Superlatives never ship.

**6. Trigger eval.** `evals/trigger-eval.json`: ≥8 realistic should-trigger and ≥8 near-miss should-not-trigger queries (shared keywords, different correct tool). Validate by reading; measure only with a live harness, and record a rate only if actually run.

**7. Distribution pack.** README contains: `## Install` with a copyable command in its first screen · `## Before / After` with measured columns sourced from the scorecard · an APEX attribution / runtime footer · a checksum verify block when a packed archive exists.

## Manual rubric (mirrors `forge.py rubric` — 20 checks × 5)

Score 5 per check met; 100 means publish-ready. The score certifies structure and evidence presence, nothing more.

```
[ ] 1  SKILL.md present, frontmatter parses
[ ] 2  Frontmatter exactly name/description/license
[ ] 3  Name format valid and matches directory
[ ] 4  Description ≤500 chars
[ ] 5  Description has "Use when" clause
[ ] 6  Description has exclusion clause
[ ] 7  SKILL.md ≤200 lines
[ ] 8  Body ≤2,500 estimated tokens (chars ÷ 4)
[ ] 9  Zero banned-lexicon hits in SKILL.md
[ ] 10 Zero multiplier claims in SKILL.md + README
[ ] 11 LICENSE.md present, names APEX Business Systems
[ ] 12 MANIFEST.json valid: name match, version, license
[ ] 13 References >100 lines carry "## Contents"
[ ] 14 Scripts are syntactically valid (skip if unreadable)
[ ] 15 templates/ holds SKILL, README, MANIFEST templates
[ ] 16 Trigger eval ≥8 positive / ≥8 negative, well-formed
[ ] 17 scorecard.json present with lint failures = 0
[ ] 18 README "## Install" with command block
[ ] 19 README "## Before / After" section
[ ] 20 README carries APEX attribution footer
```

## Packaging without Python

Shell available: `zip -r dist/<name>-<version>-universal.skill <name>/ -x "<name>/dist/*"` then `sha256sum` the archive into `dist/<file>.sha256`. No shell at all: deliver the folder and this checklist; the receiving environment packs.

## Porting note

When adapting for an agent with different tool names, change only tool invocations — never the gates, budgets, lexicon, or claim policy. The rules are the product; the tooling is one implementation of them.
