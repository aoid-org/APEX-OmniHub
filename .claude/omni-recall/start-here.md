# Start Here

Entry point for durable memory in any future Claude Code session on this repo.

## Required Read Order

1. `CLAUDE.md`
2. `user-operating-model.md`
3. `quality-bar.md`
4. `do-not-do.md`
5. `omni-recall-master-blueprint-2026-05-23.md`

## Usage Rule

Use Omni-Recall by default for continuity, correction memory, and durable operating preferences unless the user explicitly supersedes it.

## Silent Compounding Rule

- Stay quiet by default
- Reduce repeated prompting
- Prefer canonical updates over duplicate notes
- Promote stable corrections into durable memory
- Remain honest about missing access or incomplete backfill

## Session-End Rule

Before ending any session that produced new corrections, decisions, or wiki updates:
- Commit changed `.claude/omni-recall/` files to the active branch
- Use specific file staging (never `git add .`)
- Commit message format: `docs(omni-recall): <what changed> [YYYY-MM-DD]`
