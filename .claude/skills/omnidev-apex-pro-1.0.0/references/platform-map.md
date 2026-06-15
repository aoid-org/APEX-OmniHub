## Contents

1. Architecture Overview
2. Tri-Force Pipeline
3. Database Schema — Key Tables
4. Edge Functions Registry
5. Cloudflare Workers
6. Frontend Component Map
7. CI/CD Pipeline
8. Naming Conventions
9. Route Map
10. Module Connections
11. Active Development Context
12. Known P1 Gaps

---

## 1. Architecture Overview

APEX-OmniHub is an AI orchestration control plane built on TypeScript/React (frontend),
Temporal.io/Python (workflow engine), Supabase (database + edge functions + realtime),
and Cloudflare Pages/Workers (deployment + CDN). The platform hosts 13 GitHub repos
under `github.com/apexbusiness-systems`. Production domain: `apexomnihub.icu`.

Stack summary:
```
Frontend   : TypeScript · React · Vite · Tailwind · Vitest · Playwright
Backend    : Supabase (PostgreSQL + RLS + Realtime) · Edge Functions (Deno)
Workflow   : Temporal.io (Python worker) · Zephyr RTOS (PhysiOmni hardware)
Deployment : Cloudflare Pages · Workers · wrangler.toml
CI/CD      : GitHub Actions · SonarCloud · apex_policy_check.py
Skills     : SkillForge module · .claude/skills/ · OmniSkills registry
```

---

## 2. Tri-Force Pipeline

The platform orchestration core runs three coupled modules:

| Module | Role | MCP Tool |
|--------|------|----------|
| Guardian | Policy gate, security validation, RSI governance | apex_module_states |
| Planner | Task decomposition, skill routing, context planning | apex_module_states |
| Executor | Action dispatch, MCP tool calls, result reporting | apex_module_states |

All three must be ACTIVE before any production operation. Check with `apex_module_states`.
If any module shows DEGRADED or OFFLINE → P1 escalation before proceeding.

---

## 3. Database Schema — Key Tables

Query with `apex_db_schema [table_name]`. Critical tables:

| Table | Purpose | RLS Required |
|-------|---------|--------------|
| users | Auth principals | YES — always |
| clients | Multi-tenant client records | YES — always |
| payments | Stripe/PayMongo payment records | YES — always |
| skill_registry | OmniSkills catalog | YES |
| audit_log | Platform event log | YES — append-only |
| module_states | Tri-Force health snapshots | YES |
| workflow_runs | Temporal.io job records | YES |
| omnilink_sessions | OmniLink port session state | YES |

Skill name pattern in DB: `skill_${crypto.randomUUID()}`
Generate-business-skills model: `claude-3-5-haiku-20241022`
Migration path: `supabase/migrations/` — always additive, never destructive.
Check migration history: `apex_db_migrations [limit:20]`

---

## 4. Edge Functions Registry

List all deployed: `apex_edge_list`. Key functions:

| Function | Path | Purpose |
|----------|------|---------|
| omnilink-port | supabase/functions/omnilink-port/index.ts | OmniDash module state wiring (P1 gap: handleModuleState() was stubbed) |
| byom-login | supabase/functions/byom-login/index.ts | BYOM fingerprint-anchored identity (SHA-256 key) |
| health-check | supabase/functions/health-check/index.ts | Platform health probe |
| activate-client | supabase/functions/activate-client/index.ts | Client onboarding entitlement |
| generate-business-skills | supabase/functions/generate-business-skills/index.ts | SkillForge generation |

Invoke safely: `apex_edge_invoke [function_name] [body?]`
CORS root cause pattern: hardcoded `Access-Control-Allow-Origin` — always use env-var origin.

---

## 5. Cloudflare Workers

Check deployment: `apex_cf_deployment [service?]`

| Worker | Purpose |
|--------|---------|
| omni-gateway | Primary API proxy + rate limiting |
| cf-pages (OmniHub) | Main app deployment · apexomnihub.icu |
| cf-pages (OmniDash) | Dashboard SPA · /omnidash route |

Static assets: avatar PNG served as static file to bypass Vite pipeline.
WAF skip rules: /ops/health endpoint bypasses WAF (Cloudflare rule active).

---

## 6. Frontend Component Map

Repo root: `github.com/apexbusiness-systems/APEX-OmniHub`

```
src/
├─ components/
│   ├─ skills/SkillForgeWidget.tsx    ← SkillForge UI
│   ├─ dashboard/OmniDash.tsx         ← Main dashboard SPA
│   ├─ dashboard/SentinelPanel.tsx    ← P1: needs live-data wiring
│   ├─ dashboard/NotificationCenter.tsx ← P1: needs live-data wiring
│   ├─ dashboard/DashboardOverview.tsx  ← P1: needs live-data wiring
│   └─ ops/                           ← Ops widgets (4 data-testid gaps)
├─ pages/                             ← Route pages
├─ hooks/                             ← Custom React hooks
└─ lib/                               ← Utilities
```

OmniDash route: `/omnidash`
Known data-testid gaps (Playwright): `rt_security · rt_analytics · rt_trace · rt_ops`
These are in `e2e/ops-widgets-smoke.spec.ts` and block E2E test suite completion.

---

## 7. CI/CD Pipeline

```
.github/workflows/
├─ release.yml     ← Production deploy gate (OMEGA SCAN on commit 959a8fd6)
├─ ci.yml          ← PR validation: lint · test · sonar · policy-check
└─ [other]

Lint config: ESLint --max-warnings 0 (enforced since PRs #1347/#1348)
Test count:  2,480 passing Vitest unit tests (as of PR #1348)
E2E:         Playwright smoke tests — newly unblocked
Sonar:       SonarCloud quality gate (A-grade target)
Policy gate: governance/ci/scripts/apex_policy_check.py
```

CERTIFIED status: one `release.yml` trigger away from OMEGA SCAN CERTIFIED (commit 959a8fd6).
Platform state snapshot: `docs/CURRENT_PLATFORM_STATE_2026_06_06.md`
Active dev branch: `claude/gracious-mayer-0ba1m6`

---

## 8. Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Branches | claude/[adjective]-[noun]-[hash] | claude/gracious-mayer-0ba1m6 |
| Skills | skill_${crypto.randomUUID()} | skill_a1b2c3d4-... |
| Edge functions | kebab-case | omnilink-port |
| DB tables | snake_case | skill_registry |
| Components | PascalCase | SkillForgeWidget |
| Routes | kebab-case | /omnidash |
| Env vars | SCREAMING_SNAKE | APEX_SUPABASE_URL |
| Workers | kebab-case | omni-gateway |

---

## 9. Route Map

| Route | Component | Auth |
|-------|-----------|------|
| / | Landing / OmniHub home | Public |
| /omnidash | OmniDash SPA | Authenticated |
| /onboarding | OnboardingWizard | Authenticated |
| /ops/health | Health check | WAF-bypass |
| /skillforge | SkillForgeWidget | Authenticated |

---

## 10. Module Connections

```
OmniLink Port (edge fn)
  └─ Wires module state to OmniDash SPA
  └─ handleModuleState() — was stubbed, now P1 gap to wire real Supabase data

SkillForgeWidget → .claude/skills/ → OmniSkills registry → Guardian routing
BYOM Login → SHA-256 key fingerprint → byom-login edge fn → API-key-as-identity
Temporal.io → Python worker → Supabase workflow_runs table
PhysiOmni / OmniBot → Nordic nRF9161-DK + Zephyr RTOS → WebSocket → Cloudflare Workers → OmniDash
```

---

## 11. Active Development Context

- Implementation prompt ready: `OMNIDASH_REAL_DATA_IMPLEMENTATION_PROMPT.md` (9-phase, Google Antigravity 2.0)
- Platform state doc: `docs/CURRENT_PLATFORM_STATE_2026_06_06.md`
- Forge skill path: `.claude/skills/apex-skill-forge-v9-claude/scripts/forge.py`
- Skills dir: `.claude/skills/`
- Policy gate: `governance/ci/scripts/apex_policy_check.py`

---

## 12. Known P1 Gaps

| Component | Gap | Fix File |
|-----------|-----|----------|
| SentinelPanel | Mock data only, no live Supabase wiring | src/components/dashboard/SentinelPanel.tsx |
| NotificationCenter | Mock data only, no live Supabase wiring | src/components/dashboard/NotificationCenter.tsx |
| DashboardOverview | Mock data only, no live Supabase wiring | src/components/dashboard/DashboardOverview.tsx |
| omnilink-port | handleModuleState() was stubbed | supabase/functions/omnilink-port/index.ts |
| ops-widgets-smoke | 4 missing data-testid attrs | e2e/ops-widgets-smoke.spec.ts |
