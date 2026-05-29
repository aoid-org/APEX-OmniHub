# Corrections

Store durable correction records here.

Each correction should capture:
- date
- original wrong assumption
- corrected state
- scope: local, project-wide, global, or user-style
- affected pages
- promotion decision: page only, directive, or user-pattern rule

## Entries

### 2026-05-29 — Single-agent assumption + stale HEAD (global, permanent)

- **Original wrong assumption:** Omni-Recall framed the runtime as Claude/GPT-only and the
  root `CLAUDE.md` pinned `main @ a54bd7c (2026-05-20)`, implying Claude is the sole
  committer and the repo had not advanced.
- **Corrected state:** This repo is **multi-agent** — Google Jules, Google Antigravity,
  OpenAI Codex, and Dependabot also commit. Verify HEAD with `git log` before trusting
  `CLAUDE.md` commit/date facts. Verified HEAD `d1e83b0` on 2026-05-29.
- **Scope:** global.
- **Affected pages:** root `CLAUDE.md`, `memory/omni-recall/CLAUDE.md`, master blueprint,
  `quality-bar.md`, `state/checkpoints/current-status.md`, core directives.
- **Promotion decision:** directive (multi-agent block added to omni-recall/CLAUDE.md and core directives).
- **Permanent:** yes.
