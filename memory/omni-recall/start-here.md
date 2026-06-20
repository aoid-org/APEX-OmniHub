---
version: 1.1.0
last_audited: 2026-06-20
status: verified
---

# Start Here

If a future run needs the user's durable memory, this directory is the default entry point.

## Required Read Order

1. `CLAUDE.md`
2. `user-operating-model.md`
3. `quality-bar.md`
4. `do-not-do.md`
5. `omni-recall-master-blueprint-2026-05-23.md`

## Usage Rule

Use Omni-Recall by default for continuity, correction memory, and durable operating preferences unless the user explicitly supersedes it.

## Silent Compounding Rule

The system should:
- stay quiet by default
- reduce repeated prompting
- prefer canonical updates over duplicate notes
- promote stable corrections into durable memory
- remain honest about missing access or incomplete backfill

## Last Verified Session

- Date: 2026-06-20
- HEAD: `0eff5a6c` (ci: guard APEX Agent operations-doc drift — PR #1435 merged to main)
- Branch: `claude/laughing-brown-knodfm` (docs); main at `0eff5a6c`
- Package: `1.7.1` (root); app `1.3.10`
- Key facts: APEX Agent is LIVE — demo-ready. End-to-end path verified 2026-06-19 with real LLM reply (trace `da6e7fe5`). `respond_to_user` added to TOOL_REGISTRY (9 tools total). `ops-doc-guard.yml` CI workflow added (23 workflows total). 89 migrations baselined; `omni_policies` provisioned as #90. Full anti-drift audit completed: README, CURRENT_PLATFORM_STATE_2026_06_20.md (new), DOCUMENTATION_RELEASE_INDEX.md, PRODUCTION_CERTIFICATION_STATUS.md, current-status.md all updated.
- Prior session (2026-06-10): `apex-universal-sync-orchestrator` skill 100/100. OmniBoard dual-surface (correction 004 active). SkillForge live Anthropic generation.
