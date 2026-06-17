# APEX-OmniHub Architecture Audit
**Auditor:** APEX-AUDITOR-PRIME / AGENT_4 ARCHITECTURE_AUDITOR
**Date:** 2026-06-16
**Branch:** apex/omnihub/defcon4-clean-remediation (HEAD: 8ee42380)

---

## ARCHITECTURE TOPOLOGY MAP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CLIENTS                                  │
│   Browser (SPA)  │  Mobile (Capacitor iOS/Android)  │  Web3 Wallet       │
└──────────┬───────┴──────────────┬───────────────────┴──────────┬─────────┘
           │                      │                               │
           ▼                      ▼                               ▼
┌──────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│  Cloudflare Pages │  │  Cloudflare Pages      │  │  Smart Contract       │
│  (Production CDN) │  │  (Same deployment)     │  │  APEXMembershipNFT    │
│  apexomnihub.icu  │  │  Capacitor Shell       │  │  (Polygon/Sepolia)    │
└────────┬──────────┘  └───────────────────────┘  └───────────────────────┘
         │
         │  React 18 SPA (Vite 7 bundle)
         │  ├─ React Router v7
         │  ├─ Zustand stores (8 stores)
         │  ├─ TanStack Query v5
         │  ├─ TriforceGuardian (615 lines — client policy)
         │  └─ Zero-Trust device registry
         │
         ├──────────────────────────────────────────────────────────┐
         │  REST/SSE                                                 │  Auth JWT
         ▼                                                          ▼
┌──────────────────────────────────┐              ┌────────────────────────┐
│  Supabase Edge Functions (Deno)  │◄─────────────│  Supabase Auth         │
│  29 function directories         │              │  (PostgreSQL + GoTrue)  │
│  ├─ mcp-gateway (209 lines)      │              └────────────────────────┘
│  ├─ apex-agent (208 lines)       │
│  ├─ omnilink-port (1,364 lines ⚠)│              ┌────────────────────────┐
│  ├─ byom-proxy (333 lines)       │◄─────────────│  Supabase PostgreSQL    │
│  ├─ platform-health (208 lines)  │              │  88+ migrations         │
│  ├─ physiomni-ingress (495 lines)│              │  RLS on all tables      │
│  ├─ omnibridge-control (458 lines│              │  Realtime subscriptions │
│  ├─ execute-automation (449 lines│              └────────────────────────┘
│  └─ _shared/ (35 shared modules) │
└──────────────────┬───────────────┘
                   │ HTTP / Lambda dispatch
                   ▼
┌──────────────────────────────────┐
│  OmniHub Gateway (TypeScript)    │
│  src/omnihub-gateway/            │
│  ├─ SemanticRouter (377 lines)   │
│  ├─ TemporalBridge (453 lines)   │
│  ├─ JsonRpcHandler (510 lines)   │
│  ├─ IdempotencyManager           │
│  ├─ SSEManager                   │
│  └─ lambdaDispatchActivity (43L) │
└──────────────────┬───────────────┘
                   │ Temporal SDK
                   ▼
┌──────────────────────────────────┐
│  Python Temporal Orchestrator    │
│  orchestrator/                   │
│  ├─ activities/ (11 modules)     │
│  ├─ core/ (3 modules)            │
│  ├─ Docker deployment            │
│  └─ Temporal.io Cloud/self-host  │
└──────────────────────────────────┘

┌──────────────────────────────────┐  (standalone, local-only)
│  omni-recall Memory System       │
│  memory/omni-recall/             │
│  └─ Multi-agent continuity store │
└──────────────────────────────────┘
```

---

## SERVICE BOUNDARIES

| Service | Technology | Hosting | Confidence |
|---------|-----------|---------|-----------|
| Frontend SPA | React 18 / Vite 7 | Cloudflare Pages | VERIFIED |
| Auth | Supabase GoTrue (JWT) | Supabase managed | VERIFIED |
| Database | PostgreSQL via Supabase | Supabase managed | VERIFIED |
| Edge Functions | Deno runtime | Supabase managed | VERIFIED |
| Orchestration | Python + Temporal.io | Docker (self-hosted or Temporal Cloud) | VERIFIED |
| Gateway | TypeScript | Deployed via edge function or Lambda | PROBABLE |
| Mobile | Capacitor v6 (iOS + Android) | App stores | VERIFIED |
| Web3 | Hardhat / OpenZeppelin ERC721 | Polygon/Amoy/Sepolia | VERIFIED |
| Memory system | Markdown files | Local repo filesystem | VERIFIED |
| IaC | Terraform | Terraform Cloud (apexbusiness-systems-ltd org) | VERIFIED |

---

## SINGLE POINTS OF FAILURE (SPOFs)

### ARCH-S-001 — Supabase: Auth + Database in Single Vendor
**Severity:** HIGH
**Confidence:** VERIFIED
**Detail:** Supabase serves as both the authentication provider (GoTrue) AND the primary database (PostgreSQL) AND the edge function runtime (Deno). A Supabase outage or account suspension brings down auth, data access, and all backend logic simultaneously.
**Mitigation present:** `release-evidence.json` references shadow deployment. DR runbook exists (`docs/`). RTO: 30 min / RPO: 15 min per INSTITUTIONAL_READINESS.json.
**Residual risk:** No documented failover to alternative auth or database provider.
**Recommendation:** Implement at minimum a read replica or export mechanism. Document a "Supabase down" runbook with manual fallback steps.

### ARCH-S-002 — Cloudflare Pages: Sole Production Host
**Severity:** HIGH
**Confidence:** VERIFIED
**Detail:** All production traffic routes through a single Cloudflare Pages project (`apex-omnihub-shadow`). Shadow deployment pattern exists but is designed for atomic routing flip, not disaster recovery to an alternative CDN.
**Mitigation present:** Cloudflare's edge network is inherently highly available. Risk is account suspension or Cloudflare-specific outage.
**Recommendation:** Maintain a secondary S3/R2 static export as cold standby.

### ARCH-S-003 — Python Temporal Orchestrator: Single Docker Instance
**Severity:** MEDIUM
**Confidence:** PROBABLE (based on `orchestrator/docker-compose.yml` structure)
**Detail:** The Python orchestrator runs as a Docker deployment. No evidence of multiple replicas, health-based auto-restart beyond Docker restart policy, or horizontal scaling.
**Mitigation present:** Temporal.io SDK handles workflow durability — workflows survive worker restarts. Activity failures are retried.
**Residual risk:** Worker crash halts all in-flight orchestrations until restart. No documented replica count.

### ARCH-S-004 — `omnilink-port/index.ts`: 1,364-Line Monolith
**Severity:** MEDIUM
**Confidence:** VERIFIED
**Detail:** The omnilink-port edge function handles the core OmniLink session protocol in a single 1,364-line file. This violates the module cap, increases cognitive complexity, and makes targeted testing nearly impossible. A bug in any section degrades the entire OmniLink path.
**Recommendation:** Decompose into: session manager, message router, state machine, webhook processor.

---

## CI/CD PIPELINE EVALUATION

### Pipeline Structure (VERIFIED — `.github/workflows/release.yml`)

```
main push / workflow_dispatch
    │
    ├─ [GATE 1] verify:ci-integrity
    ├─ [GATE 2] verify:release suite
    │   ├─ verify:types (tsc -b --noEmit)
    │   ├─ verify:lint (ESLint + ruff)
    │   ├─ verify:test (Vitest + pytest)
    │   ├─ verify:build (Vite production build)
    │   ├─ verify:security (secret scan + npm audit)
    │   ├─ verify:assets
    │   ├─ verify:supabase-security
    │   ├─ verify:claim-hygiene
    │   └─ verify:supply-chain
    │
    ├─ [GATE 3] shadow-certification-preflight
    │   └─ Checks CF, Terraform, and env vars
    │
    ├─ [GATE 4] Deploy to Shadow Slot (CF Pages)
    ├─ [GATE 5] Shadow Health Check (5 attempts, 30s wait)
    ├─ [GATE 6] Deterministic Validator CI Gate
    ├─ [GATE 7] Terraform Plan (if release_cut + shadow validated)
    │
    └─ atomic-routing-flip (separate job, requires production-shadow env)
        └─ Terraform Apply (promote shadow to active)
```

**Gate ordering assessment:** VERIFIED CORRECT — quality gates precede security gates precede deployment. `always()` write-release-evidence ensures evidence captured on failure.

**Workflows by category:** 22 total — release, CI gates, staging CD, mobile build, security regression, secret scanning, governance, RSI governance, chaos simulation, lighthouse, nightly evaluation, compliance, dependency review, dependency consolidation, web3 deploy, orchestrator CI, deploy omnihub proof, alert guard rail, production readiness, deploy production CF direct.

**CRITICAL FINDING:** Current local branch is `apex/omnihub/defcon4-clean-remediation`, 9 commits behind `origin/apex/omnihub/defcon4-clean-remediation`. The `release.yml` CI runs on `main`. The `release-evidence.json` shows `"final_verdict": "CERTIFICATION_PENDING_FINAL_MAIN_CI"` — production certification is NOT complete. This is the expected pre-release state but must be resolved before any production claim.

---

## SCALABILITY ASSESSMENT

| Component | Mechanism | Confidence | Gap |
|-----------|-----------|-----------|-----|
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` | VERIFIED (devDep) | Needs prod verification |
| Caching | `lru-cache` + `src/lib/request-cache.ts` | VERIFIED | In-memory only — not distributed |
| Connection pooling | `src/lib/connection-pool.ts` | VERIFIED | Pool size UNVERIFIED |
| Idempotency | `IdempotencyManager` + `SupabaseIdempotencyStore` | VERIFIED | Supabase-backed — scales with DB |
| Multi-region | `false` | VERIFIED (INSTITUTIONAL_READINESS.json) | Roadmap 2026-Q4 |
| DB query patterns | Supabase PostgreSQL with RLS | VERIFIED | No query plan analysis performed |
| Edge function cold starts | Supabase Deno runtime | PROBABLE | omnilink-port at 1,364 lines → longer cold start |

**Primary scalability concern:** `omnilink-port/index.ts` at 1,364 lines will have longer cold start times than the target for a real-time session protocol function. Decomposing it into focused sub-functions would improve P50/P99 cold start latency.

---

## IaC AND DEPLOYMENT CONFIG REVIEW

| Item | State | Confidence |
|------|-------|-----------|
| `terraform/environments/production/` | Present, manages shadow slot | VERIFIED |
| `terraform/modules/` | Present, reusable modules | VERIFIED |
| Terraform Cloud org | `apexbusiness-systems-ltd` | VERIFIED (CURRENT_PLATFORM_STATE) |
| `TF_TOKEN_app_terraform_io` secret | Set in CI | VERIFIED |
| `ENABLE_ATOMIC_ROUTING_FLIP` | Set to `vars.ENABLE_ATOMIC_ROUTING_FLIP` (not hardcoded — PR #1391) | VERIFIED |
| `wrangler.toml` | Added in DEFCON4 for CF preview environments | VERIFIED |
| Docker Compose (orchestrator) | Present at `orchestrator/docker-compose.yml` | VERIFIED |
| `pyproject.toml` | Present for Python tooling | VERIFIED |

**Drift assessment:** IaC declared architecture (shadow slot → atomic flip) matches the CI pipeline logic in `release.yml`. No material drift detected between declared and observed. PROBABLE drift risk: orchestrator Docker config vs. actual production replica count (UNVERIFIED).

---

## ARCHITECTURE FINDINGS REGISTER

| ID | Finding | Severity | Confidence |
|----|---------|---------|-----------|
| ARCH-S-001 | Supabase SPOF — auth + db + edge in single vendor | HIGH | VERIFIED |
| ARCH-S-002 | Cloudflare Pages sole production host | HIGH | VERIFIED |
| ARCH-S-003 | Temporal orchestrator single Docker instance | MEDIUM | PROBABLE |
| ARCH-S-004 | omnilink-port monolith (1,364 lines) — SPOF for OmniLink path | MEDIUM | VERIFIED |
| ARCH-Q-001 | Certification PENDING — not safe for production claim | HIGH | VERIFIED |
| ARCH-Q-002 | Local branch 9 commits behind origin | MEDIUM | VERIFIED |
| ARCH-Q-003 | Multi-region not implemented — roadmap 2026-Q4 | LOW | VERIFIED |
| ARCH-Q-004 | LRU cache is in-memory — not distributed | LOW | VERIFIED |
| ARCH-Q-005 | omnilink-port cold start elevated by monolith size | LOW | PROBABLE |

---

*AGENT_4 COMPLETE — 9 architecture findings: 0 CRITICAL, 3 HIGH, 3 MEDIUM, 3 LOW*
