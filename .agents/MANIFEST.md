# APEX OmniHub — Agent Manifest
> Last updated: 2026-05-20 | Branch: claude/audit-tech-debt-Pmwkx

## Active Agent Roles

| Role | Trigger | Scope | Key Rule |
|------|---------|-------|----------|
| apex-dev | apex code, omnihub dev, bug fix | Full repo | Read CLAUDE.md §1–4 first |
| security-review | security audit, auth, RLS | supabase/, src/ | Never expose secrets |
| docs-update | doc drift, audit update | docs/, CLAUDE.md | Run docs:check after |
| ci-guard | CI failure, workflow fix | .github/workflows/ | Pin SHAs, never force-merge |
| db-migration | schema change, RLS | supabase/migrations/ | Additive only, rollback required |
| python-orchestrator | orchestrator/, omega/, services/ | Python areas | Never conflate the 3 runtimes |

## Auto-Update Obligation (ALL agents)

After any verified committed change, every agent MUST:
1. Update CLAUDE.md §2 "Last verified" date
2. Add row to DRIFT_MATRIX.md: `| DATE | TOPIC | FILES | CHANGE |`
3. If security/CI changed: add addendum to docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md
4. If edge function changed: update docs/api/EDGE_FUNCTIONS_REFERENCE.md
5. If CI workflow changed: update docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md
6. Run `npm run docs:check` — must pass before push
7. Commit all doc updates: `docs(agents): sync [component] docs — YYYY-MM-DD`

## Zero-Drift Rules

- One source of truth per fact — update it, don't duplicate it
- Never claim test/build passed without running the command
- Never invent paths — verify with `find` or `rg --files`
- Never expose SUPABASE_SERVICE_ROLE_KEY, JWT secrets, or private keys
- Coverage thresholds: statements 70%, branches 63%, functions 72%, lines 71%
- SonarCloud target: 80% on new code

## Disambiguation (never conflate)

| Path | Runtime | Role |
|------|---------|------|
| orchestrator/ | Python/Temporal | Worker + HTTP dispatch |
| services/orchestrator/ | Python/FastAPI | HTTP API + FSM |
| omega/ | Python/stdlib | Human-in-the-loop verification |
| src/core/orchestrator/ | TypeScript | Frontend contract types only |
| src/omnihub-gateway/ | TypeScript/Node | Edge gateway, MCP client |

## Session-End Checklist (agents)

- [ ] `npm run typecheck` passes
- [ ] `npm run docs:check` passes
- [ ] `git status --short` is clean (no unintended files staged)
- [ ] CLAUDE.md §2 date updated
- [ ] DRIFT_MATRIX.md row added
- [ ] Commit pushed to correct branch
