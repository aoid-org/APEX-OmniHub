---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

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

### 2026-06-10 — OmniBoard "integration-only" scoping (project-wide, permanent)

- **Original wrong assumption:** "OmniBoard is strictly for application integration and is never client-facing."
- **Corrected state:** OmniBoard is the ONE and ONLY user-facing UI endpoint for third-party application integration and onboarding. The conversational modal (Left Sidebar Widget → `OmniBoardWizard.tsx`, typed prompt input) guides the user through app connections, producing a verified Connection Spec for the `apex-universal-sync-orchestrator`. Integration-pipeline skills scope to their function
  boundary; product descriptions present both surfaces.
- **Scope:** project-wide.
- **Affected pages:** `.claude/skills/apex-universal-sync-orchestrator/`,
  `docs/platform/OMNIBOARD.md`, `docs/skill-forge-implementation.md`,
  `docs/architecture/CANONICAL_TRUTH.md` (fact 19), `docs/README.md`.
- **Promotion decision:** canonical fact + ledger entry
  (`004-omniboard-dual-surface-scoping.md` has been superseded by the 2026-06-20 Canonical Widget Rescue).
- **Permanent:** yes.
