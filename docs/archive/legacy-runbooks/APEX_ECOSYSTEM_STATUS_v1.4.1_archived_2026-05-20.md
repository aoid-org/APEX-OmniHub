> **ARCHIVED 2026-05-20** — This document is a historical snapshot preserved for reference.
> It is NOT the current operational truth. See the stub at the original path for the authoritative replacement.
> Archived reason: Claims version 1.4.1 (stale; current is 1.6.0); last updated 2026-03-10 (66 days stale)
>

<!-- APEX_DOC_STAMP: VERSION=v9.1-L10N-PWA-HARDENING | LAST_UPDATED=2026-03-10 -->
# APEX Ecosystem Status

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


**Last Updated:** 2026-03-10 (historical snapshot — see PRODUCTION_CERTIFICATION_STATUS.md for current state)
**Platform Version:** 1.4.1 (current: 1.6.0 — see CHANGELOG.md)
**Status:** 🟢 PRODUCTION LIVE — Audit Score 94.3/100 (A)

---


## Latest Delta (2026-03-10)

- **UI Layer (Marketing Site):** Global language selector finalized as globe dropdown and anchored left of Launch Console/Login CTA on desktop/tablet, with mobile menu parity.
- **PWA Conversion Surface:** Landing hero includes install node with `beforeinstallprompt` + `appinstalled` event flow and iOS install fallback messaging.
- **Localization Integrity:** Added missing hero install translation keys across all shipped locales to eliminate raw key leakage in runtime UI.
- **Brand Token Compliance:** Disabled install CTA state now enforces brand navy token styling instead of browser-default dark text/border behavior.

---

## Core Systems

- **Guardian Heartbeats**: `src/guardian/heartbeat.ts`, loops started via `initializeSecurity`, status CLI `npm run guardian:status`.
- **Prompt Defense**: Config in `src/security/promptDefenseConfig.ts`, evaluation in `src/security/promptDefense.ts`, analysis script under `scripts/prompt-defense`, tests in `tests/prompt-defense`.
- **DR/Backup**: Runbook `../guides/DR_RUNBOOK.md`, scripts under `scripts/dr/*`, backup verification in `scripts/backup/verify_backup.ts` with doc `../infrastructure/BACKUP_VERIFICATION.md`.
- **Security Advisories**: Audit script `npm run security:audit`, dependency policy `../security/dependency-scanning.md`.
- **Compliance**: GDPR (`../compliance/GDPR_COMPLIANCE.md`), SOC2 (`../compliance/SOC2_READINESS.md`), audit log helper `src/security/auditLog.ts`.
- **Zero-Trust**: Baseline metrics `src/zero-trust/baseline.ts` + CLI, registry `src/zero-trust/deviceRegistry.ts`, docs `../security/zero-trust-baseline.md` and `../security/device-registry.md`.

---

## OmniPort Ingress Engine

The proprietary fortified ingress gateway for all input sources.

| Component | Location | Status |
|-----------|----------|--------|
| **Engine** | `src/omniconnect/ingress/OmniPort.ts` | ✅ Production Ready |
| **Types** | `src/omniconnect/types/ingress.ts` | ✅ Zod-validated |
| **Metrics** | `src/omniconnect/ingress/omniport-metrics.ts` | ✅ OmniDash Integration |
| **Voice** | `src/omniconnect/ingress/omniport-voice.ts` | ✅ Natural Language |
| **DLQ** | `supabase/migrations/20260124000000_omniport_dlq.sql` | ✅ Risk-prioritized |
| **Tests** | `tests/omniconnect/omniport.spec.ts` | ✅ 27/27 Passing |

**Features:**
- Zero-Trust Gate with device validation (trusted/suspect/blocked)
- MAN Mode governance for high-risk intents (`delete`, `transfer`, `grant_access`)
- Idempotent execution with FNV-1a hashing (browser + Node.js compatible)
- Circuit breaker with Dead Letter Queue fallback
- Real-time metrics (latency, throughput, P95) for OmniDash dashboards
- Voice command processing with wake word detection

**Usage:**
```typescript
import { ingest, processVoiceCommand, getOmniPortMetrics } from '@/omniconnect/ingress';

// Text/Webhook ingestion
const result = await ingest({ type: 'text', content: 'Hello', source: 'web', userId: 'uuid' });

// Voice command
const voiceResult = await processVoiceCommand(transcript, confidence, audioUrl, durationMs, userId);

// Metrics for OmniDash
const metrics = getOmniPortMetrics(60000);
```

---

## Edge Compute Layer (v1.3.8)

Deterministic client-side infrastructure for media delivery.

| Component | Location | Status |
|-----------|----------|--------|
| **Edge CORS Proxy** | `edge/cors-proxy/edge-cors-proxy.js` (Cloudflare-first); `api/cors.ts` (Vercel Edge Runtime) retained as LEGACY reference | ✅ Cloudflare-first canonical; Vercel Edge Runtime is LEGACY historical/reference context |
| **LRU Media Cache** | `src/lib/media/EdgeCacheController.ts` | ✅ 250 MB ceiling, localStorage ledger |
| **Cloudflare Worker** | `edge/cors-proxy/edge-cors-proxy.js` | ✅ Stateless CORS proxy |

---

## Idempotency & Observability (v1.3.3)

| Component | Location | Status |
|-----------|----------|--------|
| **Prometheus Metrics** | `orchestrator/metrics.py` | ✅ Hit/miss counters, `/metrics` endpoint |
| **Grafana Dashboard** | `docs/monitoring/idempotency_hitrate.json` | ✅ Hit-rate panel + alert rule |
| **pg_cron Cleanup** | `supabase/migrations/20260226*_receipt_cleanup.sql` | ✅ Daily 03:00 UTC, 30-day TTL |
| **Guard Rail Alerting** | `.github/workflows/alert-guard-rail-violation.yml` | ✅ Auto-opens issue + Slack alert |

---

## Audit Log & Device Registry

| Component | Location | Status |
|-----------|----------|--------|
| **Audit Log Table** | `supabase/migrations/20251218000000_create_audit_logs_table.sql` | ✅ Persistent (Supabase Postgres) |
| **Device Registry Table** | `supabase/migrations/20251218000001_create_device_registry_table.sql` | ✅ Persistent (Supabase Postgres) |
| **Audit Log Helper** | `src/security/auditLog.ts` | ✅ Production |
| **Security Audit Logger** | `src/security/securityAuditLogger.ts` | ✅ Production |
