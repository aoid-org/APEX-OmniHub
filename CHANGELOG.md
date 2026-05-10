# Changelog

All notable changes to the APEX OmniHub platform.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] - 2026-05-08

### 🔒 Security & Hardening
- Armageddon Live Validation passed: 2,399 Vitest + 891 Pytest + 21 Playwright
  E2E + 168 simulation + 5 Worldwide Wildcard — all green (2026-05-08)
- SIM_MODE=false chaos guardrail confirmed operational against live Supabase
- Secret scan clean: zero findings

### 🧹 Repository Hygiene
- Relocated dev artifacts from root to scripts/debug/ and scripts/dev/
- Deleted logs.txt (ephemeral runtime artifact; already absent during audit)
- Canonicalized package manager metadata with packageManager field
- Hardened .gitignore: excluded runtime logs, debug artifacts, volatile reports

### 📦 CI/CD
- GitHub Actions package manager usage audited against canonical metadata
- Playwright install-deps remediation documented for Chromium runtime dependencies
- Worldwide Wildcard runner remediation documented: guardrail blocks correctly
  scored as passing control-plane outcomes

### 📚 Documentation
- Armageddon 2026-05-08 validation report integrated into docs/testing/
- Release Notes v1.6.0 published
- PR Triage Report published in docs/ops/

### Added

- **Bounded planner fallback chain** in `orchestrator/activities/tools.py` with deterministic model candidate resolution and strict attempt/time guards:
  - `LLM_FALLBACK_MODELS`
  - `LLM_PLAN_MAX_MODEL_ATTEMPTS`
  - `LLM_PLAN_REQUEST_TIMEOUT_SECONDS`
- **Planner resilience metrics** in `orchestrator/metrics.py`:
  - `llm_plan_attempts_total`
  - `llm_plan_outcomes_total`
- **Operational moat runbook**: `docs/ops/APEX_RELIABILITY_MOAT.md`.
- **New regression coverage**:
  - `orchestrator/tests/test_llm_plan_resilience.py`
  - `orchestrator/tests/test_llm_metrics.py`
  - `orchestrator/tests/test_cache_recursive_hydration.py`

### Changed

- **Semantic cache hydration/parameterization** now recursively traverses nested dict/list payloads in `orchestrator/infrastructure/cache.py` to prevent partial plan-template rewrites and cache replay drift.

### Fixed — Zero Tech Debt Pass (2026-05-07)

- **Security (create-checkout):** Added `ALLOWED_ORIGINS` allowlist for `returnUrl`
  validation to prevent open-redirect abuse; replaced raw `error.message` in catch
  block with a generic `500` message to prevent internal stack exposure.
- **Security (OmniAppShell):** Replaced unsafe `innerHTML` template literal for
  `config.title` in shadow DOM placeholder with `textContent` assignments —
  eliminates XSS vector in the sandbox placeholder path.
- **Dependency hygiene:** Removed duplicate/invalid `overrides` entries from root
  `package.json` (`axios: "$axios"`, inline `protobufjs: ^7.5.5`, inline
  `axios: ^1.16.0`, redundant `picomatch: >=2.3.2`). Single clean `axios: ^1.7.9`
  override remains. Removed unused direct deps `reactflow` and `nanoid` (zero
  production imports confirmed).
- **Orchestrator requirements:** Added missing runtime packages to
  `orchestrator/requirements.in`: `authlib`, `slowapi`, `aiofiles`,
  `prometheus-client`, `mysql-connector-python`; aligned `temporalio` version to
  match `pyproject.toml`.
- **Orchestrator Dockerfile:** Added missing `COPY` directives for 'core/',
  'observability/', `security/`, 'policies/', 'providers/', 'omniboard/',
  `server.py`, and `metrics.py` — container was missing six runtime packages
  and two entry-point files that `main.py` and `server.py` directly import.
- **Documentation drift:** Updated 4 stale 'src/components/omnidash/media/' paths
  in `docs/platform/OMNIDASH.md` and 1 stale path in `README.md` to canonical
  `apps/omnihub-site/dashboard/components/` locations.
- **JSDoc @module comments:** Fixed 4 dashboard components with stale
  '@module apps/omnihub-site/src/components/omnidash/*' headers —
  now correctly reflect 'apps/omnihub-site/dashboard/components/*'.

### Fixed — Code Quality Improvements (2026-05-07)

- **Security headers:** `Cross-Origin-Opener-Policy` in `public/_headers` upgraded
  from `unsafe-none` to `same-origin` — matches the stricter policy already in
  `apps/omnihub-site/public/_headers` and closes the deployed header split.
- **Repo hygiene:** Removed tracked `output.txt` CI artifact; added `output.txt`
  to `.gitignore` to prevent future leakage.
- **OmniDash consolidation:** Deleted stale legacy tree
  'apps/omnihub-site/src/components/omnidash/' (24 files, superseded by the
  canonical `apps/omnihub-site/dashboard/components/`). Updated two test files
  to reference the active tree only.
- **React version drift:** Aligned `apps/omnihub-site` devDependency `react` /
  `react-dom` from `^19.2.4` back to `^18.3.1` — matches root package and
  `CANONICAL_TRUTH.md` statement 1; eliminates split that caused dedupe ambiguity.
- **eventStore.ts docs:** Replaced misleading module-header comment that claimed
  fire-and-forget dispatch + DLQ were active; documented that dispatch helpers
  exist but are not wired in production ingress paths.

## [1.6.1] - 2026-05-04

### Fixed — Supabase Security & Performance Hardening (Production `rtopreovkywofgwgmozi`)

Applied four migrations to the production Supabase project resolving all
Security Advisor ERRORs, 60+ WARNs, and 14 performance advisor findings.
Zero breaking changes — all authenticated and service_role access preserved.

**Migrations applied (in order):**

- **`supabase/migrations/20260417000000_omnibridge_events.sql`** — applied to production (was previously only validated on the Armageddon Test Suite). Tables `omnibridge_events`, `omnibridge_events_dlq`, `omnibridge_control_audit` + `omnibridge_event_stats_hourly` view now live. Migration file corrected: removed invalid `super_admin`/`operator` enum values (only `admin` and `user` exist in `app_role`); all CREATE POLICY statements are idempotency-guarded.
- **`supabase/migrations/20260426000000_fix_security_advisor_findings.sql`** — fixed 2 `SECURITY DEFINER` view ERRORs (`user_provider_connections_safe`, `active_idempotency_receipts`) by setting `security_invoker = true`. Enabled RLS on 10 previously-unprotected public tables with `service_role` bypass policies.
- **`supabase/migrations/20260504000000_security_hardening_functions_rls.sql`** *(new)* — pinned `search_path = public` on 4 mutable-search-path functions. Revoked PUBLIC execute from trigger-only and maintenance functions (re-granted to `service_role` only). Added `service_role` RLS policy to `admin_claim_secrets`.
- **`supabase/migrations/20260504000001_fk_indexes_performance.sql`** *(new)* — added 14 `CREATE INDEX IF NOT EXISTS` covering indexes on foreign key columns flagged by the Supabase Performance Advisor.

### Security Posture Change

| Category | Before | After |
|---|---|---|
| Security Advisor ERRORs | 12 | 0 |
| Security Advisor WARNs (anon/auth fn exposure) | ~55 | 0 |
| Mutable search_path WARNs | 4 | 0 |
| RLS-enabled-no-policy WARNs | 1 | 0 |
| Performance Advisor FK index INFOs | 14 | 0 |

---

## [1.6.0] - 2026-04-17

### Added — SBBL-HQ Bidirectional Integration + Control Plane (Cloudflare Pages target)

This release closes the `FUTURE: Durable execution routing` gap previously
at `ingest.ts` and wires OmniHub as the authoritative
control plane for SBBL-HQ ahead of the 2026 Spring Edition live event.

**Deployment target: Cloudflare Pages Functions (`functions/api`).**

- **`supabase/migrations/20260417000000_omnibridge_events.sql`** — durable event log, dispatch DLQ, and hash-chained control audit with RLS + tenant-scoped admin reads.
- **`src/lib/omnibridge/syncPacketVerifier.ts`** — SBBL-HQ native HMAC-SHA256 verifier with base64url decode + constant-time `crypto.subtle.verify`.
- **`functions/api/omnibridge/sync.ts`** — new CF Pages Function accepting SBBL-HQ's native `{packet, signature}` envelope.
- **`functions/api/omnibridge/ingest.ts`** — CF Pages Function for the hardened 5-header HMAC profile.
- **`src/lib/omnibridge/outboundCaller.ts`** — signs + POSTs control commands to SBBL-HQ with exponential-backoff retries (3x max).
- **`supabase/functions/omnibridge-control/index.ts`** — privileged control-plane endpoint (JWT + RBAC) with RED-lane two-party MAN approval.
- **`src/components/omnibridge/OmniBridgeLiveFeed.tsx`** — real-time admin dashboard backed by Supabase Realtime.

### Verification (Release Blocking)

- `vitest run` → **2,379 passed, 0 failed**, 70 skipped.
- `tsc --noEmit` → 0 errors.
- `eslint` on all new files → 0 errors, 0 warnings.

---

## [1.5.1] - 2026-03-25

### Fixed — Critical Production Login Outage (SEV-1)

- **Login Permanently Unavailable** — Empty `[env.production]` and `[env.preview]` sections in `wrangler.toml` caused Cloudflare Pages to skip injecting dashboard environment variables into the Vite build. Fix: removed empty `[env.*]` sections from `wrangler.toml`.
- **Broken Logo on Login Page** — `icon.png` only existed in `apps/omnihub-site/public/`. Fix: copied `icon.png` to root `public/` and added inline SVG fallback with `onError` handler.
- **Cryptic Error Message** — Users saw "Login is unavailable." Fix: added proactive `role="alert"` banner showing exact env var names and Cloudflare Pages setup instructions.

### Added

- **`tests/login-page-fixes.test.ts`** — 43 new tests across 5 describe blocks.

### Verification (Release Blocking)

- `vitest login` → **54/54 PASS**
- `tsc --noEmit --skipLibCheck` → 0 errors in changed files

---

## [1.5.0] - 2026-03-21

### Added — APEX-DEV MCP Gateway Architectural Alignment

- **'src/omnihub-gateway/mcp-client/' Core Integration** — Secure, cross-platform A2A SDK, directly superseding legacy single-endpoint Edge Functions.
- **Zero-Trust JWT Delegation** — Hardened `.env` properties to utilize fail-safe `anon` keys with strict RLS.
- **Live OpenTelemetry SSE Support** — Restructured `OmniTracePanel` to use live `EventSource`.
- **SonarQube A-Grade Extinctions** — Decoupled nested Promises in `useDashboardData.ts`, removing empty catches and untyped `any` assignments.

### Verification (Release Blocking)

- `vitest run` → 100% Core pass.
- `tsc --noEmit` & `eslint` → 0 errors, 0 warnings.
- SonarQube Quality Gate: PASSED (A-Grade).

---

## [1.4.3] - 2026-03-16

### Fixed

- **Idempotency Guard Extraction** — Extracted shared `_idempotency_guard()` helper in `orchestrator/activities/tools.py`.
- **SonarCloud Quality Gate** — Added `.claude` to `sonar.cpd.exclusions` and `sonar.coverage.exclusions`.

### Added

- **`test_core_intents.py`** — 100% coverage of `intents`.
- **`test_tools_extended.py`** — Extended coverage for `orchestrator/activities/tools.py`.
- **`test_universal_intents.py`** — 100% coverage of the universal intent mapping layer.
- **`test_iron_law_verify.py`** (improved) — 100% branch and statement coverage.

### Quality Gates

- Orchestrator Python tests: **177 passed**, 0 failed
- SonarCloud: Quality Gate: **PASSED**

---

## [1.4.2] - 2026-03-15

### Fixed

- **OmniDash Spatial Wiring** — Wired ModuleRenderer into WidgetShell and FloatingWindow.
- **SSR Compatibility** — Guarded `window` access in `openFloating()`.
- **Z-Index Fix** — Fixed Spatial/Sandbox z-index stacking by using `Z_MODAL`.

## [1.4.1] - 2026-03-10

### Fixed

- **Marketing Site i18n key leak** — Added missing hero install keys across all shipped locales.
- **Landing install CTA theming** — Replaced residual UA-default dark disabled-button rendering with explicit brand navy token styling.

### Changed

- **Header language UX** — Standardized to globe-triggered dropdown.
- **Landing conversion affordance** — Restored PWA install node in hero CTA stack.

### Verification

- `bun run lint` ✅
- `bun run typecheck` ✅
- `bun run build` ✅

---

## [1.4.0] - 2026-03-07

### Fixed

- **sim/metrics.ts** — Adjusted adaptive latency and retry thresholds for CI determinism under `SIM_MODE`.

### Added

- **`src/stores/omniBoardStore.ts`** — New Zustand global store for connector hydration state.
- **`src/omnidash/useOmniDashAction.ts`** — Universal OmniDash Interaction Interceptor hook.

### Quality Gates

- TypeScript: 0 errors | ESLint: 0 warnings, 0 errors | Vitest: all suites pass

---

## [1.3.9] - 2026-03-03

### Added

- **ACRA v2.2 Persistent Memory (multi-tenant + anti-poisoning)** with RLS, device-trust gating, SHA-256 content-hash dedupe, and HNSW vector search.
- **Compliance retention split** — `security_incidents` table w/ append-only RLS + 24-month retention.
- **Circuit breaker persistence (P1)** — Tenant-scoped state table + atomic `upsert_circuit_breaker()`.
- **Quarantine lane (fail-closed governance)** — `is_quarantined` blocks recall + promotion.
- **Ciphertext-only memory storage** — `pgcrypto` enabled; plaintext never persisted.
- **Memory SDK (P2)** — `MemoryClient`: `store()`, `recall()`, `purge()`, `export()`.

### Verification (release blocking)

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors / 0 warnings
- `npm test` → green
- `npm run build` → exit 0

---

## [1.3.8] - 2026-03-02

### Added — Agentic Intelligence Architecture (Phases 1–3A)

- **OmniCognition Unit Tests** — 93 tests across CognitionManager, compressionEngine, OmniRoute.
- **OmniMCP Framework (Phase 2)** — 6 new modules: mcp.config, MCPTransport, MCPServerRegistry, MCPToolDiscovery, MCPHostManager, index barrel.
- **OmniVision Foundation (Phase 3A)** — omniVisionStore, VisionCacheController, VisionSourceSchema.

### Quality Gates

- TypeScript (`tsc --noEmit`): 0 errors
- Full Suite: **1101 passed**, 86 skipped, 0 new failures
- SonarQube: A-grade maintained

---

## [1.3.7] - 2026-03-01

### Fixed — i18n Locale Resolution & Test Hygiene (PR #660)

- **Root Cause:** Hardcoded `const targetLocale = 'fr-FR'` replaced with dynamic `resolveTargetLocale()`.
- **Modal Accessibility:** Radix `aria-describedby` warning suppressed via conditional prop spread.
- **IronLaw:** Added `APEX_IRON_LAW_FAST_MODE` env guard — skips recursive `npm test` inside vitest.

### Quality Gates

- Tests: **956 passed**, 87 skipped, 0 failed (92 test files)
- TypeScript (`tsc --noEmit`): 0 errors

---

## [1.3.4] - 2026-02-27

### Added — Edge Compute & Deterministic Media Cache

- **Vercel Edge CORS Proxy** (`api/cors.ts`) — zero-latency cross-origin media proxying with Range request passthrough.
- **LRU Media Cache Governor** (`lib/media/EdgeCacheController.ts`) — 250 MB hard ceiling, deterministic LRU eviction, localStorage-backed ledger.

### Quality Gates

- Build: 0 errors | TypeScript: 0 errors | ESLint: 0 errors, 0 warnings
- SonarQube: A-grade maintained

---

## [1.3.3] - 2026-02-26

### Added — Production Infrastructure Enhancements

- **Idempotency Hit-Rate Monitoring** — Prometheus counters + Grafana dashboard.
- **pg_cron Automatic Receipt Cleanup** — daily 03:00 UTC cleanup migration.
- **Guard Rail Violation Alerting** — CI failure workflow opens GitHub Issue + Slack alert.

---

## [1.3.2] - 2026-02-25

### Fixed — Production Audit & Optimization

- **Console logging hardened** — All 36+ `console.log` statements guarded with `import.meta.env.DEV`.
- **Vitest coverage crash fixed** — Coverage now opt-in via `VITEST_COVERAGE=true`.
- **Stale CI artifacts removed** and `.gitignore` extended.

---

## [1.3.1] - 2026-02-25

### Fixed — Sim Framework P0 Bug Fixes

- **BUG-1:** `dedupeRate >= 0` always-true idempotency scoring fixed.
- **BUG-2:** `calculateBackoff()` backoff consolidation — delegates to `calculateRetryDelay()`.
- **BUG-3:** `flushQueue()` event loss on circuit recovery fixed.
- **BUG-4:** `if (!event.payload)` strict null/undefined check fixed.

---

## [1.3.0] - 2026-02-24

### Added — SPA Architecture & Security Hardening

- **OmniDash SPA** restructured with panel-based navigation and `react-grid-layout`.
- **MAESTRO Engine Hardening** — 6 adversarial injection vectors, 22/22 tests passing.
- **OmniConnect Translation Engine** — Zod runtime schemas + Zero-Drift enforcement.
- **Zero-Trust Cyber-Physical Layer** — `isDeviceAuthorized()`, `validateDeviceFingerprint()`, `getDeviceRiskScore()`.

### Quality Gates

- TypeScript (`tsc --noEmit`): 0 errors | ESLint: 0 errors | Vitest: 155 passed, 0 failed

---

## [1.2.1] - 2026-02-20

### Changed

- Standardized JavaScript/TypeScript workflow commands on Bun for local and CI usage.
- Updated `package.json` release version to `1.2.1` and declared Bun package manager metadata.

---

## [1.2.0] - 2026-02-18

### Added — Armageddon Level 7 Temporal Certification

- **CERTIFIED** — 0.0000% escape rate across 40,000 adversarial iterations (Batteries 10–13).
- **Run ID:** `10efa424-e2e1-4659-b684-f37401f61f2f`

### Quality Gates

- TypeScript (`tsc --noEmit`): 0 errors | ESLint: 0 warnings, 0 errors
- Production build: exit 0 | SonarQube: A-grade maintained

---

## [1.1.1] - 2026-02-13

### Fixed

- **CI/CD Build** - Added missing PostCSS dependencies to `apps/omnihub-site`.
- **Python Lint** - All E501 line length violations resolved.
- **Security** - Updated npm dependencies via `npm audit fix`.

---

## [1.1.0] - 2026-02-09

### Added — Realtime Brokering & Device Classification Core

- **Nexus (ApexRealtimeGateway)** — WebSocket proxy for OpenAI Realtime API.
- **Spectre (SpectreHandshake)** — Device authentication and TrustTier classification.
- **AegisKernel** — Stateless authorization kernel with per-tool access control.
- **ChronosLock** — Idempotency state machine with deterministic duplicate detection.
- **Veritas** — Tool output validation engine.
- **64 new tests** — 91.7% statement coverage.

### Quality Gates

- ESLint: 0 warnings, 0 errors | TypeScript strict mode: 0 errors | Vitest: 64/64 tests passing

## [1.0.0] - 2026-02-08

### Production Release

First production release of the APEX OmniHub platform. All CI gates green, 564 tests passing,
SonarQube A rating across all dimensions, chaos battery verified.

### Verified

- **597 tests pass** with live Supabase (564 without credentials), 0 code failures
- **TypeScript compilation**: zero errors (strict mode)
- **ESLint**: zero warnings (`--max-warnings 0`)
- **Production build**: 7,997 modules, all chunks valid
- **Chaos battery**: all stress tests GREEN
