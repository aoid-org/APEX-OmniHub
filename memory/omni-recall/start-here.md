---
version: 1.0.0
last_audited: 2026-06-12
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

- Date: 2026-06-10
- HEAD: e747507 (fix(skills): correct OmniBoard scoping in apex-universal-sync-orchestrator)
- Branch: claude/friendly-goodall-6bb4uc (main at ef0f337)
- Key facts: `apex-universal-sync-orchestrator` skill installed at rubric 100/100. OmniBoard is dual-surface — client-facing modal + application integration layer (correction 004; "never client-facing" is retired). SkillForge generation is live Anthropic `claude-3-5-haiku-20241022` with `skill_<uuid>` names. Repo docs synced: OMNIBOARD.md, skill-forge-implementation.md, CANONICAL_TRUTH.md facts 19–20.
