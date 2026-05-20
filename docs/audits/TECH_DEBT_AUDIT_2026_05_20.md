# Tech Debt Audit Report — 2026-05-20

**Scope:** Full repository audit — TypeScript, Python, CI/CD, security, build, tests  
**Branch:** claude/audit-tech-debt-Pmwkx  
**Auditor:** Claude Agent (claude-sonnet-4-6) via APEX Agent Swarm  
**Status:** COMPLETE — 6 issues fixed and pushed

---

## Audit Method

All findings verified by executing actual commands against live code — not document scanning.

Commands run:
- `npm run typecheck` — TypeScript compilation
- `npm run lint` — ESLint (via vitest quality gate)
- `npm run test` — Full Vitest suite (216 files, 2575 tests)
- `npm run build` — Vite production build
- `npm run docs:check` — Documentation link/pointer validation
- `npm run check:react` — React singleton check
- `npm audit` — npm dependency vulnerabilities
- `python -m ruff check .` — Python lint
- `python -m ruff format --check .` — Python format check
- Manual code inspection of CI workflows, edge functions, sonar config, lighthouse config

---

## Findings: FIXED (6 items)

| # | File | Issue | Risk | Fix Applied |
|---|------|-------|------|-------------|
| F-1 | `.github/workflows/integration.yml` | `actions/checkout@v4` and `actions/setup-node@v4` unpinned; `node-version: '20'` below engine minimum; GH_PAT embedded in clone URL | HIGH | SHA-pinned all actions; node→24; credential substitution for clone |
| F-2 | `.github/workflows/deploy-omnihub-proof.yml` | `actions/checkout@v4`, `actions/setup-node@v4`, `cloudflare/wrangler-action@v3` unpinned | HIGH | SHA-pinned all three actions |
| F-3 | `.github/workflows/dependency-consolidation.yml` | Auto-merged PRs regardless of CI status (`mergeable_state` not checked) | HIGH | Added `mergeable_state === 'clean'` guard before merge |
| F-4 | `.lighthouserc.json` | `categories:accessibility` and `color-contrast` were `"warn"` — not blocking CI | MEDIUM | Changed both to `"error"` |
| F-5 | `sonar-project.properties` | `src/**,apps/**,packages/**` in `sonar.coverage.exclusions` — entire frontend hidden from SonarCloud | MEDIUM | Removed those three globs; frontend coverage now visible |
| F-6 | `supabase/functions/stripe-webhook/index.ts` + `_shared/requestSigning.ts` | Both used `?? ''` fallback for required secrets; missing STRIPE_WEBHOOK_SECRET made HMAC bypassable; missing ORCHESTRATOR_SHARED_SECRET made signing bypassable | HIGH | Explicit 503 guard in stripe-webhook; `throw Error()` in requestSigning |

---

## Findings: ENVIRONMENT-LIMITED (not fixable in audit env)

| # | Component | Finding | Root Cause | Recommended Action |
|---|-----------|---------|-----------|-------------------|
| E-1 | Python tests | `npm run ci:py` fails — `temporalio`, `numpy` not installed | Audit environment has base Python only | `pip install -r orchestrator/requirements.txt` before CI run |
| E-2 | Asset smoke test | `npm run test:assets` fails (7 checks) | Requires running preview server at localhost:4173 | Run `npm run preview` concurrently, or run in CI after build |

---

## Findings: ACCEPTABLE / WILL-NOT-FIX

| # | Component | Finding | Rationale |
|---|-----------|---------|-----------|
| A-1 | npm audit | 46 vulnerabilities (19 low, 27 moderate) in WalletConnect/Wagmi/viem chain | Transitive deps from Web3 wallet connection stack; no critical/high severity; versions are latest in the chain |
| A-2 | Coverage thresholds | 70% statements, 63% branches — below SonarCloud 80% target | Accurately reflects current actuals; increasing incrementally per vitest.config.ts comment |
| A-3 | Lighthouse `categories:performance` | `"warn"` at minScore 0.75 | Performance varies by network; not appropriate to hard-block on |
| A-4 | 40 Supabase integration tests skipped | Skip when Supabase not configured in env | Expected behavior — env-dependent tests skip cleanly |

---

## Verified Green Gates (2026-05-20)

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npm run typecheck` | PASS |
| Test suite | `npm run test` | 213 PASS, 3 SKIP (2505/2575 tests) |
| Production build | `npm run build` | PASS (2429 modules, no warnings) |
| Docs check | `npm run docs:check` | PASS |
| React singleton | `npm run check:react` | PASS (React 18.3.1) |
| Python lint | `python -m ruff check .` | PASS |
| Python format | `python -m ruff format --check .` | PASS (95 files) |

---

## Commits (branch: claude/audit-tech-debt-Pmwkx)

| SHA | Message |
|-----|---------|
| 3bc3890 | fix(ci): pin action SHAs, upgrade to node 24, mask GH_PAT in clone URL |
| 170e06c | fix(ci): pin wrangler-action and checkout SHA versions in deploy-omnihub-proof |
| d8eca6e | fix(ci): enforce accessibility and color-contrast as Lighthouse CI errors |
| 4438f9b | fix(sonar): include frontend src/apps/packages in coverage metrics |
| 0f23a63 | fix(ci): require CI green state before auto-merging dependency PRs |
| c6e589f | fix(security): require STRIPE secrets and ORCHESTRATOR_SHARED_SECRET explicitly |
