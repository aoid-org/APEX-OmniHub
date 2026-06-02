# Omni-Recall Source Index

Last index update: 2026-05-31 (post PR #1251 merge — apex-agent unification complete)
Superseding index update: 2026-06-01 (platform docs sync — HEAD `86bc14a`, PR #1274 + PR #1309 reconciled)

## Purpose

Track canonical source records that materially define Omni-Recall.

## Indexed Sources

1. `raw/historical_exports/2026-05-23-user-upload-omni-recall-blueprint.md`
   - Type: user-uploaded blueprint source
   - Status: directly read
   - Role: primary origin record for the current Omni-Recall architecture
   - Original GPT-workspace path: `/workspace/user_files/01-Pasted-text-26-.txt`

2. `omni-recall-master-blueprint-2026-05-23.md`
   - Type: canonical operating blueprint
   - Status: active
   - Role: runtime-adapted master spec

3. `CLAUDE.md`
   - Type: governing rule file
   - Status: active — Claude Code runtime adaptation
   - Role: short-form constitutional control file; replaces GPT-runtime version

4. `omni-recall-package-2026-05-23/` (repo root, archived)
   - Type: original zip extraction
   - Status: archived — live system is at `memory/omni-recall/`
   - Role: immutable record of initial package state

5. `current-status.md` (state/checkpoints/)
   - Type: session checkpoint log
   - Status: active — updated after each verified session
   - Role: canonical source for per-session outcomes, verified HEAD, and runtime facts

6. `state/checkpoints/2026-06-01-platform-doc-sync.md`
   - Type: platform-state checkpoint
   - Status: active
   - Role: durable memory for PR #1274 / PR #1309 documentation synchronization and stale-reference correction

7. `docs/CURRENT_PLATFORM_STATE_2026_06_02.md`
   - Type: repo documentation authority
   - Status: active
   - Role: current branch/head assessment and drift-control source for future agents
