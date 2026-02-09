# Changelog

All notable changes to the APEX OmniHub platform.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
