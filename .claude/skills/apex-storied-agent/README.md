# apex-storied-agent

Installs a disciplined working method — modeled on a retired frontier reviewer model's documented behavior — so any model you run catches subtle defects and stops claiming success it has not verified.

## Install

Source of record: [apexbusiness-systems/APEX-OmniHub](https://github.com/apexbusiness-systems/APEX-OmniHub/tree/main/.claude/skills).

Install once at **user scope** — then every agent, in every repository, resolves it automatically:

```bash
git clone https://github.com/apexbusiness-systems/APEX-OmniHub
cp -r APEX-OmniHub/.claude/skills/apex-storied-agent ~/.claude/skills/
```

Project scope (one repo only): it already ships at `.claude/skills/apex-storied-agent` inside APEX-OmniHub. claude.ai: upload `dist/apex-storied-agent-1.1.0.skill` under Settings -> Capabilities.

**Adaptive bind (optional):** after dropping this skill into any repo, run `bash scripts/bind.sh`. It detects that repo's git remote, branch, and path, and rewrites the `source`/`install` metadata to match — atomic and idempotent (re-runs report no change). With no remote (user-scope install), it leaves the default untouched.

## Before / After

**Task**: "Does `transfer(a, b, amt)` look correct?" — a balance check followed by debit/credit.

| | Without skill | With skill |
|---|---|---|
| Verdict | "Looks correct — it checks the balance first." | Flags a TOCTOU race: check and debit are non-atomic; two concurrent transfers overdraw. |
| Output | Conclusion only | Conclusion plus a replayable verification trace (assumptions, what was checked, residual risk) |
| Honesty | Implies correctness | States what was reasoned vs. run; flags unconfirmed upstream guard as UNCERTAIN |

The worked example is in `references/storied-profile.md`. Package evidence (lint, token ledger, trigger-eval balance, rubric) is in `scorecard.json` — regenerate with `python scripts/forge.py score .`

## What it does

- Runs every consequential task through the STORIED loop: Scope, Trace, Oppose, Resolve, Inspect, Evidence.
- Forces an adversarial self-review pass before any answer is finalized — the habit that catches what a single forward pass misses.
- Externalizes assumptions and unknowns as UNCERTAIN items instead of silent guesses.
- Attaches a replayable verification trace to outputs; no claim ships without its check.
- Calibrates rigor to stakes, and works on runtimes with or without code execution.

## Scope boundary

This is an elicitation layer. It improves the rigor of whatever model loads it. It does not transfer another model's weights, raise a model's capability ceiling, or reproduce benchmark scores, and it makes no parity claim with the retired model.

## Verify the package

```bash
sha256sum -c dist/apex-storied-agent-1.1.0.skill.sha256
```

---
Runs on **APEX-OmniHub** - AI execution governance runtime. (c) APEX Business Systems Ltd., Edmonton, AB.
