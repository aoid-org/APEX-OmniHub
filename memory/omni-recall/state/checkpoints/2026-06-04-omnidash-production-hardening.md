---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# OmniDash Production Hardening Session — 2026-06-04

**Branch:** `feat/omnidash-production-hardening` → PR #1263
**Head commit:** `ead5cd9f`
**Base:** main @ `e5b93237`
**Method:** Parallel agent swarm (2 isolated git worktrees) + direct fixes

---

## Scope

Three parallel work streams resolved in one PR:

1. OmniDash stuck-modal trap
2. Zero mock data enforcement across all module modals
3. Governed Cloudflare Pages deploy workflow (replacing defective PR #1262)

Plus: README version fix, RSI policy correction.

---

## Changes (verified by file inspection)

| Stream | Files | What changed |
|---|---|---|
| Modal fix | `apps/omnihub-site/src/components/ui/dialog.tsx` | Added `max-h-[calc(100dvh-2rem)] overflow-y-auto` to `DialogContent` base classes. Close button and footer now always reachable. |
| Zero mock data | `dashboard/components/moduleData.json` | All 9 entries flagged `isDemo: true`. No fabricated business data can appear as "LOCAL" tenant data. |
| Zero mock data | `dashboard/components/modules/AuditsModule.tsx` | Removed `"GDPR Art. 30 compliant / 2h ago"` hardcoded literals; content derives from `state.items`. |
| Zero mock data | `dashboard/components/modules/BillingModule.tsx` | Removed `"Pro Plan / Renews Mar 15 / 72% used"` hardcoded literals; derives from `state.stats`/`state.items`. |
| Zero mock data | `dashboard/components/modules/SettingsModule.tsx` | Removed `"All settings validated / Rev. 47"` hardcoded literal; derives from `state.items`. |
| Zero mock data | `dashboard/components/modules/WorkflowsModule.tsx` | Removed `"8 running / 2 pending / 14 completed"` hardcoded literals; derives from `state.items` status counts. |
| Real data | `dashboard/components/modules/PhysiOmniModule.tsx` | Added `usePhysiOmniDevices` hook querying `physiomni_devices` table (RLS: `tenant_id = auth.uid()`). Nordic hardware block relabelled "Reference" with unconditional DEMO badge. Static `demo-tenant-id` removed from cockpit URL. |
| CF deploy | `.github/workflows/deploy-production-cf-direct.yml` | New governed workflow: `workflow_dispatch` only, `environment: production-shadow` (human reviewer required), project name from repo variable defaulting `apex-omnihub`, SHA-pinned actions, no `${{ github.event.* }}` in run blocks. |
| CF deploy | `scripts/ci/verify-deployed-bundle.mjs` | Real bundle smoke test: fetches deployed HTML, extracts JS, asserts `rtopreovkywofgwgmozi.supabase.co` baked in + key shape valid, hard-fails on `placeholder.supabase.co`. |
| CF deploy | `scripts/set-cf-pages-env.sh` | Example project name corrected to `apex-omnihub`; `exit 1` guard if `CF_PAGES_PROJECT=omnihub` passed. |
| RSI policy | `policy/rsi-policy.yaml` | v1.3.2 → v1.3.3: added `!.github/workflows/deploy-production-cf-direct.yml` exclusion; corrected stale `20260528000000_omniconnect_vault.sql` → `20260528000001`. |
| Docs | `README.md` | Line 15: `1.6.3 (target) / 1.6.0` → `1.7.0` (matches `package.json`). |

---

## Agent Swarm

Two agents ran on isolated git worktrees in parallel:

- **Agent A** (`worktree-agent-abf379f1529877424`): Mock-data elimination + PhysiOmni real data. Commits `255ef5a9`, `fe2f670b`.
- **Agent B** (`worktree-agent-a08ab12a4fb7f7a2b`): Governed CF deploy workflow. Commit `6d4a89e9`.

Both worktrees: typecheck exit 0, eslint exit 0, bash -n (shell scripts) clean, node --check (JS) clean.

---

## Verification (observed, not claimed)

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 — no errors |
| `npm run lint` | exit 0 — no output |
| `GITHUB_BASE_REF=main bun run scripts/ci/check-additive-migrations.ts` | 1 file checked, 0 violations |
| GitHub CI — all 42 checks | success or skipped |
| RSI Governance Gate | success (after `ead5cd9f` RSI policy fix) |

---

## PR #1262 disposition

PR #1262 (`fix/auth-supabase-cf-pages-deploy-override`) — CI passes but has structural defects:
- Targets `omnihub` (non-existent CF Pages project, not `apex-omnihub`)
- Bypasses governed pipeline
- False-green smoke test (curls `apexomnihub.icu/login` which always returns 200 regardless of deploy)

Recommendation: close PR #1262; merge PR #1263 instead.

---

## Mock data remaining outside scope (agent A findings, for follow-up)

- `apps/omnihub-site/src/lib/demo-data.ts` — seeded/`Math.random()` demo-mode engine, gated behind explicit demo mode / missing Supabase config. Acceptable in current form; worth confirming it is unreachable in authenticated production sessions.
- `supabase/functions/omnilink-port/index.ts` — the `module-state` edge function is a stub returning fabricated `{ State: Online }` with empty items/actions. This is the upstream gap that means no module has a true live backend source beyond PhysiOmni. Real per-module aggregation in this function is the correct follow-on.
- Main dashboard widgets (Tasks, Today) appear already real-wired with explicit `useDemoStore` demo toggle — not module modal surface, not in scope.
