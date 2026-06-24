---
version: 1.0.0
last_audited: 2026-06-21
status: verified
---

# Omni-Recall — Claude Code Runtime Adaptation

- Purpose: persistent continuity system for knowledge, preferences, corrections, and project memory.
- Canonical root: `memory/omni-recall/` (within the APEX-OmniHub repo)
- Installed: 2026-05-23 on branch `claude/optimistic-mccarthy-w982b`

## Multi-Agent Environment (verified 2026-06-02)

- This repo receives commits from **multiple AI agents**, not only Claude Code:
  **Google Jules, Google Antigravity, OpenAI Codex, and Dependabot** all commit here.
- Do **not** assume Claude authored a given commit, branch, or current state.
- The root `CLAUDE.md` can lag reality (other agents move `main`); treat its
  commit/date facts as hints and verify HEAD with `git log` before relying on them.
- Verified HEAD at this audit (2026-06-24, Session 3): `main` HEAD `8bfb1a6` (PR #1486, fix(sonar) omnihub-site code-smell closure); development branch tracks `main` at the same commit; no open PRs. Release line `1.8.2` (`package.json` bumped; `v1.8.2` tag + release auto-cut from `package.json` on push to `main` via `compliance.yml`). Owner-approved cert: `docs/release/owner-approved/PRODUCTION_CERTIFICATION_2026_06_24.md`.
- Prior audit (2026-06-22): working branch `claude/focused-ptolemy-dgd054`; Main HEAD `1f22570`. Release line `1.8.1`, `1.8.2` in progress. Superseded by the line above.
- Prior audit (2026-06-21): `8772015e` (v1.8.1 release cut); branch `claude/dreamy-albattani-fw93y3`.

## Runtime Facts (Claude Code / ephemeral container)

- Persistence mechanism: git commits + push to `origin`. The repo IS the workspace.
- Session-load hook: the repo root `CLAUDE.md` §29 references this system. Any session that loads the repo's CLAUDE.md inherits this context.
- No persistent `/workspace/memory/` — that path is from the GPT-origin blueprint and does not apply here.
- No always-on background hooks. Automation is via Claude Code settings hooks only.

## Operating Rules

- Use raw evidence first, compiled wiki second, user-operating rules third.
- Treat `raw/` as immutable source material.
- Treat `wiki/` as AI-maintained canonical knowledge.
- Prefer concise, linked markdown pages over long narrative dumps.
- Keep claims traceable to raw evidence, repo evidence, tool evidence, or explicit user statements.
- Never imply hidden access to full account history, model weights, or always-on hooks.
- Retroactive backfill only from available exports, uploads, repos, and connected tools.
- If historical data is missing, say so plainly and mark backfill pending.
- Capture meaningful corrections in `wiki/corrections/` and promote stable ones to directives or `user-operating-model.md`.
- Separate verified fact from inference and claimed-but-unverified evidence.
- Default timezone: `America/Edmonton`. Use absolute dates when clarity matters.
- Optimize for "wind, not dashboard": quiet by default, surface only real drift, conflict, risk, or decisions.
- Deduplicate aggressively; update canonical pages instead of spawning near-duplicates.
- Do not overwrite raw evidence to "clean it up."

## Common Failure Modes to Avoid

- pretending inaccessible history was ingested
- storing temporary preferences as permanent rules
- mixing audit claims with verified system truth
- repeating corrected framing
- producing noisy status output without need
