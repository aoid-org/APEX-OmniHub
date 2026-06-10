# Token Economics

Read this when a skill blows a budget, when deciding what goes in SKILL.md vs references vs scripts, or when the hype linter fires.

## The three-tier cost model

| Tier | When it costs | Implication |
|---|---|---|
| name + description | **Every conversation, always** | This is a tax multiplied by installed-skill count × every session. The cheapest tier to over-spend and the most expensive over time. |
| SKILL.md body | Each time the skill triggers | Competes directly with the user's conversation history once loaded. Lean bodies leave room for the actual work. |
| references/ | Only the file (and ideally only the section) needed | Effectively free until consulted. Put depth here. |
| scripts/ | **Never loaded** — executed via bash | Zero context cost regardless of size. Put determinism here. |

Budgets enforced by `forge.py lint`: description ≤500 chars · SKILL.md ≤200 lines · body ≤2,500 estimated tokens (hard fail at 5,000) · references >100 lines open with `## Contents` so the model jumps instead of reading linearly.

## Why generation gets cheaper too

Two mechanisms, both structural rather than aspirational:

1. **Slot-filling beats free-writing.** `forge.py init` stamps the full structure; the model fills `{{slots}}`. Fewer sampled tokens per skill, and the structure can't drift because it was never sampled.
2. **Scripts replace repeated reasoning.** If test transcripts show the model rebuilding the same helper logic each run, that logic belongs in `scripts/` — written once, executed forever at zero context cost.

## The hype lexicon (lint check `hype-lexicon`)

Banned in SKILL.md and frontmatter; warned in README:

`omnipotent · omniscient · god-mode · godlike · world's best · world-class · revolutionary · quantum leap · ultimate · magic(al) · singularity · first-pass perfection · zero-failure · infallible`

Three independent reasons, any one sufficient:

1. **Zero capability per token.** These words change nothing about what the model does, but they are paid for at the most expensive tiers.
2. **Marketplace signaling.** Curated directories and AI-evaluated registries score skills on substance; superlative-dense listings pattern-match to spam and depress install conversion with exactly the technical buyers worth reaching.
3. **Claim discipline.** A word the scorecard cannot back is an unverified claim. The APEX non-negotiable is that those never ship.

Numeric multipliers ("3x faster") follow the same rule via lint check `unbacked-multiplier`: allowed only when `scorecard.json` exists in the package and contains the measurement that produced the number.

## Measurement honesty

**Code-heavy content caveat.** The chars÷4 estimate drifts 15–30 % for SKILL.md bodies that are predominantly code blocks, inline code spans, or non-ASCII characters — these tokenize more densely than prose. If a skill's estimated body token count is within 20 % of the 2,500-token target and its body is code-heavy, measure with an actual tokenizer before signing off. Record the tokenizer name and version in `scorecard.json` under `tokens.method`; never silently mix methods between a pre- and post-edit comparison.
