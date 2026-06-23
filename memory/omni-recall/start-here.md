---
version: 1.2.0
last_audited: 2026-06-21
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

- Audit date: 2026-06-21
- HEAD: `966d695f` (fix(omnidash): canonical widget rescue and global drift guards — PR #1441, merged this session; squash carries git date 2026-06-20)
- Branch: `docs/repo-truth-sync-2026-06-21` (docs); main at `966d695f`
- Package: `1.7.1` (root); app `1.3.10`
- Key facts: PR #1441 completed the OmniDash canonical widget rescue with a corrective commit — Links is now a genuine local URL-staging surface (validates input, Add Link never permanently disabled, "staged locally" + "OmniSlate handoff not connected" copy), the global action whitelist became a **module-keyed capability map** (`moduleKey + actionId`, module-specific copy, unsupported actions never call `trigger-workflow`), underscore/raw-id labels are humanized, the OmniBoard wizard gained timeout handling + explicit error taxonomy, and the live `omnilink-port` Links resolver returns an honest empty link-context state (no `integrations` read, no `test-all`). Corrective-commit gates green locally: typecheck/eslint/`vitest run tests/omnidash` (585 passed)/build/ops-doc-guard. `docs/APEX_AGENT_OPERATIONS.md §9.1` records the resolver contract change.
- Carried forward (not re-verified this pass): APEX Agent LIVE — demo-ready (restored via PR #1435 `4bbd3e5b`, end-to-end verified 2026-06-19, trace `da6e7fe5`). `respond_to_user` in TOOL_REGISTRY (9 tools). 90 forward migrations + 4 rollback (94 `.sql`). 23 workflows. See `docs/CURRENT_PLATFORM_STATE_2026_06_21.md`.
- Docs synced this session: README.md, `docs/CURRENT_PLATFORM_STATE_2026_06_21.md` (new), DOCUMENTATION_RELEASE_INDEX.md, docs/README.md, architecture/CANONICAL_TRUTH.md, state/checkpoints/current-status.md.

## Session 2026-06-23 (user-shoes validation + production flip)

- Verified on fresh `origin/main` clone @ `fd2d1833` (root 1.8.1 / app 1.3.10) + live https://apexomnihub.icu.
- **Links is now LIVE-persisted, not local-only** (supersedes the PR #1441 "local staging" note above): `LinksModule` writes to Supabase `omnilink_links` (migration `20260622102600`, own-row RLS); readback via `omnilink-port` `resolveLinks` SELECT, JWT-forwarded. Full loop verified in prod.
- **OmniBoard connect wizard** leaked the raw supabase string "Edge Function returned a non-2xx status code" (its `omniboard-start` edge returns non-2xx). Fixed `describeConnectionError` to map opaque transport strings to honest copy (descriptive errors still pass through); retry-label added. Underlying `omniboard-start` backend availability remains a separate backend item.
- **Production flip (no demo state):** `DemoModeContext` default `demoMode:false` + hard force-off in PROD builds (`import.meta.env.PROD`); Demo toggle hidden in prod (`SentinelPanel`); 3 hardcoded "(Simulated)" labels in `OmniDashShell` (header + footer) now gated on `demoMode`; fabricated `syncedMinutesAgo` replaced with honest null/—. `LinksModule` full-page reload replaced with in-place `useOmniModuleState().refetch()`.
- Changes made on a fresh clone; delivery pending push (PAT rotated 2026-06-23, sandbox has no push creds).
