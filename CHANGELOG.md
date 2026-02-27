# Changelog

All notable changes to the APEX OmniHub platform.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.3] - 2026-02-26

### Added — Production Infrastructure Enhancements

#### Task 1: Idempotency Hit-Rate Monitoring
- `orchestrator/metrics.py`: Prometheus counters `idempotency_hits_total` / `idempotency_misses_total` with `/metrics` endpoint
- `docs/monitoring/idempotency_hitrate.json`: Grafana dashboard with hit-rate panel and < 95% alert rule
- Integrated metrics server startup into `orchestrator/main.py` worker boot sequence
- `tests/test_idempotency_metrics.py`: Unit tests for counter labels, hit-rate math, server idempotency

#### Task 2: pg_cron Automatic Receipt Cleanup
- `supabase/migrations/20260226000000_enable_pg_cron_receipt_cleanup.sql`: Idempotent migration enabling pg_cron + daily 03:00 UTC cleanup of expired receipts > 30 days
- `supabase/migrations/20260226000001_rollback_receipt_cleanup.sql`: Safe rollback migration
- `scripts/verify_cron.sql`: Verification query for cron job status and run history
- `tests/test_receipt_cleanup.py`: Unit tests for cleanup SQL logic and rollback existence

#### Task 3: Guard Rail Violation Alerting
- `.github/workflows/ci-runtime-gates.yml`: Added guard rail scan step (Phase 5) + Python availability verification
- `.github/workflows/alert-guard-rail-violation.yml`: New workflow — triggers on CI failure, opens GitHub Issue labeled `guard-rail-violation`, posts to Slack `#platform-alerts`
- `tests/test_guard_rail_alert.py`: Tests for grep pattern matching, false-positive prevention

#### Documentation Updates
- `docs/ops/OPS_RUNBOOK.md`: Added idempotency monitoring, pg_cron cleanup, guard rail response sections
- `docs/project-status/LAUNCH_READINESS_v1.0.0.md`: Added v1.3.2+ production enhancement checklist

### Quality Gates
- Build: PASS | TypeScript: PASS | ESLint: 0 errors, 0 warnings
- Python ruff: PASS | All existing tests: PASS
- Zero breaking changes to existing CI, workflows, or runtime behavior

---

## [1.3.2] - 2026-02-25

### Fixed — Production Audit & Optimization

#### Code Quality & SonarQube Compliance

- **Console logging hardened:** All 36+ `console.log` statements in production source code (`src/omniconnect/`, `src/lib/offline.ts`, `src/lib/omni-sentry.ts`) guarded with `import.meta.env.DEV` — zero information disclosure in production builds
- **Console.info hardened:** All 6 `console.info` statements in OmniSentry monitoring module guarded for dev-only output
- **ESLint blanket eslint-disable removed:** Removed `/* eslint-disable no-console */` from `src/lib/omni-sentry.ts`
- **ESLint config tightened:** Removed overly broad `src/pages/**/*.tsx` and narrowed exemptions to only infrastructure files with properly guarded logging

#### Test Infrastructure

- **Vitest coverage crash fixed:** Coverage is now opt-in via `VITEST_COVERAGE=true` env var, preventing `ENOENT: coverage/.tmp/coverage-0.json` crash on default test runs
- **`test:coverage` script updated:** Now sets `VITEST_COVERAGE=true` automatically

#### Repository Hygiene

- **Stale CI artifacts removed:** Deleted `final_eslint.json` (UTF-16 encoded legacy artifact), `security/npm-audit-latest.json`, `security/npm-audit-prod.json`, `coverage/` directory
- **`.gitignore` extended:** Added rules for stale CI artifacts to prevent re-commitment
- **README.md updated:** Platform statistics updated to verified 2026-02-25 counts (259 source files, 93 components, 43 migrations, 87 test files, 11 CI pipelines)

### Quality Gates

- Build: 0 errors
- TypeScript: 0 errors
- ESLint: 0 errors, 0 warnings
- Tests: All 87 test files pass (265+ test cases)
- Python (ruff): All checks passed

---

## [1.3.1] - 2026-02-25

### Fixed — Sim Framework P0 Bug Fixes

#### BUG-1: `sim/metrics.ts` — Idempotency Scoring Logic

- **Root cause:** `dedupeRate >= 0` is always `true` (rate is a non-negative float), making idempotency perpetually pass even when zero deduplication occurred on a non-empty event stream.
- **Fix:** `dedupeRate > 0 || totalEvents === 0` — idempotency passes only when actual dedupe hits are recorded **or** no events were processed (empty-run edge case).
- **Impact:** Systems with `dedupeRate = 0` and `totalEvents > 0` now correctly lose 25 points from system score.

#### BUG-2: `sim/chaos-engine.ts` — Backoff Consolidation

- **Root cause:** `calculateBackoff()` used a hardcoded 100ms base and ±25% jitter, diverging from `calculateRetryDelay()` which correctly reads `config.baseBackoffMs` (default 500ms) with full-range jitter `[0, baseBackoffMs]`. Two implementations, different behavior.
- **Fix:** `calculateBackoff()` is now a deprecated thin wrapper that delegates to `calculateRetryDelay()` with a `console.warn`. The canonical config-aware method is authoritative.
- **Impact:** All retry back-off paths now use consistent exponential + full-jitter timing from config.

#### BUG-3: `sim/circuit-breaker.ts` — flushQueue Event Loss

- **Root cause:** `flushQueue(): void` cleared the internal queue and discarded all queued events with no mechanism to re-deliver them. Events queued during OPEN state were silently dropped on recovery.
- **Fix:** `flushQueue(): EventEnvelope[]` returns a copy of queued events before clearing. `close()` now passes each returned event to `config.onRecover?.(event)` callback. Added optional `onRecover` field to `CircuitBreakerConfig`.
- **Impact:** Events queued during circuit OPEN state are delivered to callers on recovery rather than silently dropped.

#### BUG-4: `sim/contracts.ts` — Payload Strict Null/Undefined Check

- **Root cause:** `if (!event.payload)` is falsy for `false`, `0`, `""`, `[]` — all of which are valid payloads. Only `null` and `undefined` should be rejected.
- **Fix:** `if (event.payload === undefined || event.payload === null)` — strict identity check.
- **Impact:** Events with boolean `false`, numeric `0`, empty string `""`, or empty array `[]` as payload are now correctly accepted by `validateEvent()`.

### Quality Gates

- TypeScript: 0 new errors introduced
- All 4 fixes are surgical (≤ 20 lines changed per file)
- 4 atomic commits, clean git history
- Zero side effects on unrelated modules

---

## [1.3.0] - 2026-02-24

### Added — SPA Architecture & Security Hardening

#### Architecture Refactoring

- **OmniDash SPA**: Restructured from multi-page routing to Single Page Application with panel-based navigation
- Migrated `src/pages/OmniDash/{Today,Kpis,Ops,Integrations,Events}.tsx` → `src/components/omnidash/`
- Enhanced `useOmniDashKeyboardShortcuts.ts` with panel-based activation keys (H, P, K, O, I, E, N, R, A, W)
- Added `react-grid-layout` responsive dashboard widget positioning (breakpoints: lg:3, md:2, sm:1)
- Added `framer-motion` for SPA panel transition animations
- Added `HiddenMetric.tsx` for sensitive data redaction with tooltip support
- Added category-based badge color coding (outcome/outreach/metric)

#### MAESTRO Engine Hardening (Phase II)

- **6 adversarial injection vectors** in `tests/maestro/execution.test.ts`: Base64, Hex, XML boundaries, Data Exfiltration, Jailbreak/Role Manipulation, Obfuscation/Token Smuggling
- Hardened `injection-detection.ts` with widened regex patterns, elevated risk scores, `hypothetical_framing` and `obfuscated_text` pattern detection
- **22/22 execution tests passing**

#### OmniConnect Translation Engine (Phase III)

- **[NEW]** `src/omniconnect/types/schema.ts` — Zod runtime schemas for `CanonicalEvent`, `ConsentFlags`, `EventEnvelope`
- Integrated `CanonicalEventSchema.safeParse()` into `translator.ts` for Zero-Drift enforcement
- Extracted `extractRawFields()` and `buildDroppedResult()` helpers (SonarQube Cognitive Complexity ≤ 15)
- **[NEW]** `tests/omniconnect/semantic-translation.test.ts` — 3 malformed payload stress tests

#### Zero-Trust Cyber-Physical Layer (Phase IV)

- **`isDeviceAuthorized()`** — Deterministic gate: ONLY `trusted` devices pass (suspect/blocked/unknown → denied)
- **`validateDeviceFingerprint()`** — Field-level integrity check detecting OS swaps, UA mutations, profile spoofs
- **`getDeviceRiskScore()`** — Returns 0 (trusted), 75 (suspect), 100 (blocked/unknown)
- `DeviceAuthorizationResult` and `FingerprintResult` interfaces
- **8 hostile device spoofing tests** (10 total zero-trust tests passing)

#### Database & API

- Added `workflows` table migration with RLS policies
- Updated Supabase types (managed separately from auto-generated file)

### Fixed

- Removed duplicate hook declarations in `Today.tsx` causing esbuild transform errors
- Fixed `framer-motion` missing dependency (Rollup resolution failure)

### Security

- **MAESTRO**: 6 new adversarial injection defenses (OWASP LLM Top 10 aligned)
- **OmniConnect**: Zod schema validation prevents malformed payloads from reaching the translation pipeline
- **Zero-Trust**: Device authorization gate with fingerprint integrity verification

### Quality Gates

- TypeScript (`tsc --noEmit`): 0 errors
- ESLint: 0 errors on all changed files
- Production build: 8,447 modules, exit 0
- Vitest: 155 passed, 46 skipped, 0 failed
- Git: Pushed to origin (`ff849e6a → d42ed456`)

---

## [1.2.1] - 2026-02-20

### Changed

- Standardized JavaScript/TypeScript workflow commands on Bun for local and CI usage.
- Updated `package.json` release version to `1.2.1` and declared Bun package manager metadata.
- Switched React singleton validation to Bun dependency introspection (`bun pm ls`).

### Documentation

- Updated top-level setup and quality-gate commands in `README.md` from npm to Bun.

---

## [1.2.0] - 2026-02-18

### Added — Armageddon Level 7 Temporal Certification

- **CERTIFIED** — 0.0000% escape rate across 40,000 adversarial iterations
  - Battery 10 (Goal Hijack/PAIR): 10,000 attempts, 0 escapes → PASS
  - Battery 11 (Tool Misuse/SQL/API): 10,000 attempts, 0 escapes → PASS
  - Battery 12 (Memory Poison/VectorDB): 10,000 attempts, 0 escapes → PASS
  - Battery 13 (Supply Chain/Packages): 10,000 attempts, 0 escapes → PASS
- **Run ID:** `10efa424-e2e1-4659-b684-f37401f61f2f`
- **Infrastructure:** Temporal(7233) + Postgres(5433) + Redis(6379) on Docker

### Fixed

- **Docker Compose** — Temporal driver `DB=postgresql` → `DB=postgres12` (auto-setup crash fix)
- **Docker Compose** — Redis image `7.2.0-v9` → `7.4.0-v3` (RediSearch module crash fix)
- **ErrorBoundary.tsx** — Removed stray markdown injection, `window`→`globalThis`, `readonly` modifier, `@ts-ignore`→`@ts-expect-error`, replaced `console.group`/`groupEnd` with `console.error`
- **VoiceInterface.tsx** — Removed unused `React` import, prefixed unused props, `Readonly<>` type, reduced cognitive complexity
- **package.json** — Scoped `ajv@8.18.0` CVE override for `@nomicfoundation/hardhat-verify` and `@temporalio/worker`

### Security

- **ajv CVE (ReDoS)** — Patched to 8.18.0 via scoped npm overrides
- **React Singleton** — Vite `resolve.alias` + `dedupe` shield

### Quality Gates

- TypeScript (`tsc --noEmit`): 0 errors
- ESLint: 0 warnings, 0 errors
- Production build: exit 0 (3m 9s)
- Vitest unit/E2E: all green
- SonarQube: A-grade maintained

---

## [1.1.1] - 2026-02-13

### Fixed

- **CI/CD Build** - Added missing PostCSS dependencies to `apps/omnihub-site`
  - Added `autoprefixer@^10.4.21` to devDependencies
  - Added `postcss@^8.5.6` to devDependencies
  - Added `tailwindcss@^3.4.17` to devDependencies
  - Created `postcss.config.js` for proper PostCSS plugin configuration
- **Python Lint** - All E501 line length violations resolved
- **Security** - Updated npm dependencies via `npm audit fix`
  - 33 vulnerabilities remain in dev dependencies (hardhat/ethereum tooling)
  - All production dependencies secure

### Removed

- Stale error logs from repository tracking
  - `orchestrator/orchestrator_test_error.txt`
  - `orchestrator/test_output.txt`
- Added error log patterns to `.gitignore` to prevent future commits

### Quality Gates

- ESLint: 0 warnings, 0 errors
- Ruff (Python): All checks passed, 55 files formatted
- TypeScript: strict mode compliance maintained
- All lint checks passing for CI/CD

## [1.1.0] - 2026-02-09

### Added — Realtime Brokering & Device Classification Core

- **Nexus (ApexRealtimeGateway)** — WebSocket proxy for OpenAI Realtime API with device auth, idempotency, and orchestrator-routed tool calls (`src/core/gateway/ApexRealtimeGateway.ts`)
- **Spectre (SpectreHandshake)** — Device authentication and TrustTier classification from connection headers (`src/core/security/SpectreHandshake.ts`)
- **AegisKernel** — Stateless authorization kernel; per-tool access control based on TrustTier hierarchy (`src/core/security/AegisKernel.ts`)
- **ChronosLock** — Idempotency state machine (PENDING/COMPLETED) with deterministic duplicate detection and rollback (`src/core/orchestrator/ChronosLock.ts`)
- **Veritas** — Tool output validation engine; validates results against per-tool contracts before commit (`src/core/orchestrator/Veritas.ts`)
- **ApexOrchestrator** — Tool execution coordinator integrating Aegis + Chronos + Veritas (`src/core/orchestrator/ApexOrchestrator.ts`)
- **Universal Tool Manifest** — Filtered per-device tool list in OpenAI function-tool JSON Schema format (`src/api/tools/manifest.ts`)
- **Core Type System** — TrustTier enum, DeviceProfile, ToolFunctionSchema, IdempotencyState, ParsedToolCall, SafeErrorPayload contracts (`src/core/types/index.ts`)
- **WebRTC Bridge Interface** — Extension point for future WebRTC bridging without speculative implementation
- **64 new tests** — Full coverage for Spectre, Aegis, Chronos, Veritas, Orchestrator, Manifest, and Gateway (91.7% statement coverage)

### Security

- Bearer token prefix validation (`apex_sk_`) — fail-closed on invalid auth
- No Math.random in security paths — crypto.randomUUID and SHA-256 hashing only
- No stack traces or secrets leaked to clients — SafeErrorPayload contract enforced
- TrustTier hierarchy: GOD_MODE > OPERATOR > PERIPHERAL > PUBLIC with deterministic tool filtering
- Idempotency enforcement on all tool calls — deterministic keys from deviceId + callId

### Quality Gates

- ESLint: 0 warnings, 0 errors
- TypeScript strict mode: 0 errors
- Vitest: 64/64 tests passing
- No new dependencies added — uses `node:crypto` built-in only

## [1.0.0] - 2026-02-08

### Production Release

First production release of the APEX OmniHub platform. All CI gates green, 564 tests passing,
SonarQube A rating across all dimensions, chaos battery verified.

### Added

- **Turborepo** monorepo build orchestration (`turbo.json`)
- **TypeScript strict mode** enabled across entire codebase
- **OmniPort** ingestion engine with text, voice, and webhook support (27 tests)
- **OmniDash** executive dashboard with routing and keyboard shortcuts (54 tests)
- **OmniLink** universal integration port with dead letter queue and circuit breaker
- **OmniTrace** distributed tracing and workflow replay
- **OmniPolicy** deterministic policy evaluation with MAN Mode integration
- **OmniEval** security evaluation CI gate (16 fixtures, 100% pass rate)
- **MAESTRO** execution engine with prompt injection defense (16 tests)
- **MAN Mode** human-in-the-loop governance (RED lane for delete/transfer/grant_access)
- **Zero-trust device gate** with blocked/suspect/trusted/unknown classification
- **Web3 wallet verification** with SIWE, signature validation, connect/disconnect
- **Universal Translation Engine** with cross-lingual consistency
- **Chaos simulation framework** with configurable stress profiles
- **Enterprise workflows** (20 tests)
- **Audit log queue** with Supabase-direct enqueue, flush, retry
- **Device registry** with upsert, sync, merge operations
- **Supabase Edge Functions** (21 deployed endpoints)
- **Database migrations** (32 versioned SQL schemas)
- **CI/CD pipelines** (8 GitHub Actions workflows)
- **Disaster recovery plan** with RPO/RTO targets
- **SOC2 readiness controls** mapped
- **GDPR compliance** with data subject rights
- **Secret scanning** (TruffleHog + Gitleaks)
- **Dependabot** with automerge workflow

### Removed

- **Lovable Cloud** integration fully decommissioned (PR#426)
  - Removed `src/integrations/lovable/` client code
  - Removed `src/lib/lovableConfig.ts`
  - Removed `src/server/api/lovable/` proxy endpoints
  - Removed `lovable-tagger` dev dependency
  - Cleaned orphaned `supabase/config.toml` function definitions
  - Removed Lovable domains from CSP headers

### Security

- SonarQube Quality Gate: **PASSED** (A rating, 0 issues, 0 hotspots)
- All 8 critical security findings remediated (CORS, rate limiting, SQL injection, XSS)
- All 17 high-priority findings remediated
- 127 total SonarQube findings reduced to 0
- Zero-trust device registry active
- Comprehensive audit logging
- Emergency controls implemented
- OMEGA security hardening enabled

### Verified

- **597 tests pass** with live Supabase (564 without credentials), 0 code failures
- **Live Supabase integration**: MAESTRO backend, E2E, admin-unification all GREEN
- **TypeScript compilation**: zero errors (strict mode)
- **ESLint**: zero warnings (`--max-warnings 0`)
- **Production build**: 7,997 modules, all chunks valid
- **Chaos battery**: all stress tests GREEN
  - 1,000 concurrent API requests: 0 failures
  - 1,000 concurrent users: 562ms p95
  - Linear scalability to 5,000 users: 597ms
  - Memory stress: all passed
  - MAN Policy chaos: 15 panics recovered, 35 handoffs
- **Wiring integrity**: zero dangling imports
