# Omni-Recall — Claude Code Adaptation

- Purpose: persistent continuity system for knowledge, preferences, corrections, and project memory.
- Root: `.claude/omni-recall/` (repo-relative; persists via git)
- Runtime: Claude Code (claude-sonnet-4-6) in remote execution environment
- Adapted from: GPT `/workspace/memory/omni-recall/` — all paths rewritten for this environment

## Path Map

| Original (GPT) | This environment |
|---|---|
| `/workspace/memory/omni-recall/` | `.claude/omni-recall/` |
| `/workspace/user_files/` | `.claude/omni-recall/raw/historical_exports/` |

## Operating Rules

- Use raw evidence first, compiled wiki second, user-operating rules third.
- Treat `raw/` as immutable source material.
- Treat `wiki/` as AI-maintained canonical knowledge.
- Keep claims traceable to raw evidence, repo evidence, tool evidence, or explicit user statements.
- Never imply hidden access to full account history, model weights, or always-on hooks.
- Retroactive backfill only from available exports, uploads, repos, and connected tools.
- If historical data is missing, say so plainly and mark backfill pending.
- Capture meaningful corrections in `wiki/corrections/` and promote stable ones to directives or `user-operating-model.md`.
- Default timezone for user-facing date interpretation: `America/Edmonton`.
- Use absolute dates when clarity matters.
- Optimize for "wind, not dashboard": quiet by default, surface only real drift, conflict, risk, or decisions.
- Prioritize: projects, decisions, directives, user patterns, open loops, corrections.
- Deduplicate aggressively; update canonical pages instead of spawning near-duplicates.
- Do not overwrite raw evidence.

## Claude Code–Specific Notes

- This system persists across sessions only if changes are committed and pushed (remote execution env).
- Session start: read `start-here.md` then required read order.
- Session end: commit any new wiki pages, corrections, or log entries to `claude/blissful-curie-vduGB` (or active branch).
- Common failure modes: pretending inaccessible history was ingested; storing temporary preferences as permanent rules; mixing audit claims with verified system truth; repeating corrected framing.
