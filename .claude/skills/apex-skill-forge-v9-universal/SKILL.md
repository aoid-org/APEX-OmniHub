---
name: apex-skill-forge-v9-universal
description: Production skill engineering system that forges, audits, and packages agent skills with measured trigger accuracy, hard token budgets, and a marketplace-ready distribution pack (one-line install, before/after README, evidence scorecard). Use whenever the user wants to create, build, improve, audit, optimize, package, or publish a skill — including vague requests like "turn this workflow into a skill". Does not cover MCP server development or general prompt optimization.
license: Proprietary - APEX Business Systems Ltd.
---

# APEX-SKILL-FORGE v9

**Input**: Any skill request — new build, upgrade of an existing skill, audit, or publish prep.
**Output**: A skill package that passes `forge.py lint --strict`, ships with `scorecard.json`, and includes a distribution pack (README with one-line install + before/after, MANIFEST.json, packed `.skill` archive).
**Success**: Lint passes strict, token budgets hold, trigger eval exists and is balanced, every numeric claim traces to the scorecard.
**Fails when**: Intent is still ambiguous after 2 questions, lint fails, or a claim has no scorecard field behind it.

## Why this design

Skill marketplaces now index thousands of entries. Supply is commoditized; selection and trust are the bottlenecks. A skill wins on three things only: (1) it triggers exactly when it should, (2) it costs few tokens to carry and run, (3) its quality claims are verifiable. The forge mechanizes all three. Adjectives are not evidence — a scorecard is.

## Pipeline

Run every forge job through six phases. Skip none; phases are cheap and each one prevents a specific failure class.

```
INTENT → SPEC → BUILD → MEASURE → PACK → PUBLISH
```

**Which entry point?**
```
├─ "Create/build a skill"            → Phase 1 (INTENT)
├─ "Improve/upgrade/fix my skill"    → Phase 3 (BUILD), diff against current
├─ "Audit/score this skill"          → Phase 4 (MEASURE) only
└─ "Package/publish/list my skill"   → Phase 5–6 (PACK, PUBLISH)
```

### Phase 1 — INTENT

Extract from the request (and conversation history if the user says "turn this into a skill"): purpose, trigger contexts, output format, success check. If two or more of these are missing, ask at most 2 questions, then lock a contract:

```
Purpose: <one sentence>
Triggers: <3-6 concrete user contexts>
Output: <format + location>
Verify: <command or check that proves success>
```

Present the contract. User confirms → proceed. This prevents the most expensive failure: building the wrong skill correctly.

### Phase 2 — SPEC

Write the frontmatter description BEFORE the body. The description is the only signal the model has at selection time, so it determines whether the skill ever runs. Use the formula in `references/description-engineering.md`:

```
[What it does — 1 sentence, third person]
+ [Use when/whenever: concrete contexts, slightly pushy — models under-trigger]
+ [Does not cover: 1 near-miss exclusion]
```

Budget: ≤500 characters (spec hard limit is 1024). No hype lexicon — banned words are listed in `references/token-economics.md` and enforced by lint.

### Phase 3 — BUILD

Scaffold, then fill slots instead of free-writing (cheaper to generate, harder to drift):

```bash
python scripts/forge.py init <skill-name> --dir <target>
```

Build rules, each with its reason:
- **SKILL.md ≤200 lines / ≤2,500 estimated body tokens.** Once loaded, every token competes with the user's conversation. Depth goes to `references/`, loaded only on need.
- **Imperative voice; explain why, not just what.** Models follow instructions better when the reason is stated; rigid all-caps walls are a yellow flag for overfitting.
- **Decision trees at branch points, prose elsewhere.** Trees remove variance where it matters; prose carries reasoning.
- **Working code only.** Every example must run as pasted. An untested example is a claim without evidence.
- **Failure modes documented next to the operation that fails.** A table of failures the author never saw is decoration; a check beside the risky step is protection.
- **Extract to `scripts/` anything the model would otherwise rewrite per run** (multi-step transforms, syntax-fragile ops). Scripts execute without loading into context — near-zero token cost.
- **References >100 lines start with `## Contents`.** The model reads the ToC, then jumps; it never pays for the whole file.
- **Portability**: write the body against the open Agent Skills format (folder + SKILL.md). Isolate vendor-specific tool calls in one labeled section; runtimes without code execution apply every gate manually via `references/universal-protocol.md` — one source, every agent.

### Phase 4 — MEASURE

No skill ships on assertion. Generate evidence:

```bash
python scripts/forge.py lint <skill-dir>        # structure, budgets, hype, claims
python scripts/forge.py tokens <skill-dir>      # per-tier token ledger (estimated)
python scripts/forge.py triggers <skill-dir>    # validates evals/trigger-eval.json
python scripts/forge.py score <skill-dir>       # writes scorecard.json from the above
python scripts/forge.py rubric <skill-dir>      # 20 binary checks x 5 pts; 100 = publish-ready
```

The rubric is twenty machine-checkable gates — its score certifies structure and evidence presence, never market outcomes. Run it after `score`, before `pack`.

Trigger eval: write ≥8 should-trigger and ≥8 should-not-trigger queries into `evals/trigger-eval.json`. Make them realistic (typos, file paths, casual phrasing) and make the negatives near-misses — adjacent tasks that share keywords but need a different tool. Obvious negatives test nothing. Schema and worked examples: `references/description-engineering.md`. Where the Claude Code CLI is available, run the trigger set live and record the measured rate into the scorecard; in environments without it, the validated set ships with the skill so any consumer can reproduce the measurement.

Task evals (for skills with verifiable outputs): 2–3 realistic prompts with objective assertions, run with-skill vs without-skill, grade per `references/evidence-loop.md`. Skip assertions for purely subjective skills; use human review instead.

**Claim policy (hard rule)**: a number, multiplier, or superlative may appear in SKILL.md or README only if `scorecard.json` contains the field that produced it. Lint enforces this. The reason is strategic, not cosmetic: in a curated market, unverifiable claims read as spam; measured ones read as engineering.

### Phase 5 — PACK

```bash
python scripts/forge.py pack <skill-dir>
```

Runs lint in strict mode (warnings become failures for publish), then emits `dist/<name>-<version>.skill` (zip) + SHA-256. The checksum is the trust anchor: marketplaces tell users to install only from trusted sources, so provenance (source repo + hash) is part of the product.

### Phase 6 — PUBLISH

Every published skill carries the distribution pack — this is what converts a listing into installs:

1. **One-line install** at the top of README (all three channels):
   - `npx skills add <repo-url> --skill <name>` (skills.sh ecosystem)
   - `/plugin marketplace add <org>/<marketplace-repo>` (Claude Code)
   - Upload `dist/<name>-<version>.skill` in claude.ai → Settings → Capabilities (zip path)
2. **Before/After section** showing one real workflow: the task, the unaided result, the with-skill result, with an artifact or measured numbers.
3. **Runtime footer** linking the platform the skill is built to run against (for APEX skills: APEX-OmniHub).
4. **Listing targets + checklist**: `references/distribution.md`.

## Token budgets (enforced by lint)

| Tier | Loaded | Budget | Why |
|---|---|---|---|
| name + description | Always, every conversation | desc ≤500 chars | This cost recurs across every session for every installed skill |
| SKILL.md body | On trigger | ≤200 lines, ≤2,500 est. tokens | Competes with conversation context once loaded |
| references/ | On demand | ToC if >100 lines | Pay only for the section needed |
| scripts/ | Executed, not loaded | unbounded | Runs outside context entirely |

## Iron rules

| # | Rule | Why |
|---|---|---|
| 1 | Contract before code | Wrong-target builds are the costliest failure |
| 2 | Description before body | Selection failure makes everything else moot |
| 3 | Evidence before claims | Unverifiable numbers are spam in a curated market |
| 4 | Budgets are hard limits | Context is the scarcest shared resource |
| 5 | Scripts for the fragile | Deterministic ops don't belong in sampled text |
| 6 | Ship the scorecard | The measurement is the differentiator |
| 7 | Never invent paths, schemas, or results | Output `UNCERTAIN: <gap>` instead |

## Command reference

```bash
python scripts/forge.py init <name> --dir <path>   # scaffold from templates/
python scripts/forge.py lint <dir> [--strict]      # validate; strict for publish
python scripts/forge.py tokens <dir>               # token ledger (estimated, chars/4)
python scripts/forge.py triggers <dir>             # trigger-eval validation
python scripts/forge.py score <dir>                # write scorecard.json
python scripts/forge.py rubric <dir>               # 20 binary checks; exit 0 only at 100
python scripts/forge.py pack <dir> [--label x]     # strict lint → .skill zip + sha256
```

## References

- `references/description-engineering.md` — description formula, trigger eval design
- `references/token-economics.md` — budgets, hype lexicon, measurement method
- `references/evidence-loop.md` — scorecard schema, task evals, claim policy
- `references/distribution.md` — marketplace matrix, install commands, listing checklist
- `references/universal-protocol.md` — manual gates + rubric for runtimes without code execution
