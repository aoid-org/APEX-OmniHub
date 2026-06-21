---
version: 1.0.0
last_audited: 2026-06-12
status: archived
archived_date: 2026-06-21
note: SBBL ↔ OmniHub integration completed. See CURRENT_PLATFORM_STATE_2026_06_21.md for current integration status.
---

# Step 1 — Repo Scope: APEX-OmniHub

## Top-level architecture
- Monorepo with major roots: `api/`, `packages/`, `orchestrator/`, `tests/`, `scripts/`, `omega/`, `e2e/`.
- API surfaces include `api/omniconnect/*`, `api/omnibridge/*`, and middleware.
- Python orchestrator domain under `orchestrator/` includes workflows, activities, observability, security, and models.

## Integration surface points
- OmniPort ingestion envelope contract referenced in `orchestrator/models/events.py` (`EventEnvelope<T>` compatibility notes).
- HMAC verification path in `orchestrator/security/request_signing.py` controlled by `ORCHESTRATOR_REQUIRE_SIGNATURE` and `ORCHESTRATOR_SHARED_SECRET`.
- Supabase-integrated ingress/outbox schema and workers are present in SQL migrations (OmniPort pattern): `ingress_buffer`, `event_outbox`, pending/claim/requeue helpers and RLS.

## Telemetry nodes and data flows
- OmniTrace observability controls in `orchestrator/observability/omnitrace.py` (sample rate, max events/bytes, enable flags).
- OmniBoard domain exists under `orchestrator/omniboard/` (FSM internals require deeper per-file review) [UNVERIFIED: complete FSM transition matrix not fully enumerated in this pass].
- OmniCognition / OmniRoute naming appears in broader architecture docs and naming conventions [UNVERIFIED: exact runtime wiring path not fully located in one canonical file].

## CI/CD gates and quality contracts
- JS gates include unit, integration, e2e, infra drift checks, and coverage.
- Infra coverage hard gate: `--coverage.thresholds.lines=85`, `functions=85`, `branches=70`, `statements=85` in `package.json` script `test:infra:coverage`.
- Python orchestrator gate includes `pytest --cov-fail-under=55` in `.github/workflows/orchestrator-ci.yml`.
- SonarQube/SonarCloud gates run in CI workflows (`ci-runtime-gates.yml` and `compliance.yml`).

## Environment variables / secrets / bindings (observed)
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`.
- Orchestrator signing: `ORCHESTRATOR_REQUIRE_SIGNATURE`, `ORCHESTRATOR_SHARED_SECRET`.
- Observability: `OMNITRACE_*`, `ENVIRONMENT`.
- Additional service credentials mentioned in orchestrator docs for LLM/external APIs [UNVERIFIED: full env inventory requires exhaustive parse of all `.env.example` + workflow env blocks].

## v1.6.0 audit open gates / conditional flags
- [UNVERIFIED] No single file named explicitly as “v1.6.0 audit” found in this pass.
- Conditional security gate confirmed: signature verification enable/disable by env in request signing middleware.

---

# Step 2 — Repo Scope: SBBL-HQ

## Full-stack architecture
- Frontend: Vite + React + TypeScript (`src/*`, `vitest.config.ts`).
- Worker/API: Cloudflare Worker code in `src/worker/*`, `src/api-proxy-worker/*`.
- Data/Auth: Supabase client + SQL migrations in `supabase/migrations/*`.
- Billing: Stripe webhook handling both in worker path and deprecated Supabase Edge Function.

## Broadcast-critical paths
- `useLiveAccess` resolves server-authoritative broadcast via `rpc('get_active_broadcast')`; avoids direct client read of `stream_admin_config`.
- WHEP and playback logic in `LiveStreamPlayer.tsx` + `WhepPlayer.tsx`, with RC-3 fallback handling when no URL resolves.
- Schema linkage visible in migrations: `playback_asset_id` column and `collection_id` usage for stream URL wiring.
- Worker status endpoint exists [UNVERIFIED: exact route path not fully extracted in this pass].

## Supabase tables / RLS / edge functions
- OmniPort bridge objects in `202603290001_omniport_outbox.sql`: `ingress_buffer`, `event_outbox`, claim/requeue functions, RLS policies.
- Broad RLS hardening migrations present: auto-enable trigger, backfill baseline policies, policy performance hardening, hardened function search paths.
- Edge functions inventory includes at least `supabase/functions/stripe-webhook` (marked deprecated in favor of Worker canonical webhook).

## Stripe payment + PPV gate logic
- Client paywall flow in `PaywallGate.tsx` and `useLiveAccess.ts`.
- PPV entitlement paths in migrations (`ppv_invites`, entitlement checks, redeem function).
- Stripe idempotency controls in DB migrations and webhook handler (`stripe_events` table and duplicate-event handling).

## RC-1 / RC-2 / RC-3 status
- RC-3 explicitly referenced in `LiveStreamPlayer.tsx` comment and logic for named error if no URL after fallbacks.
- RC-1 and RC-2 references [UNVERIFIED: explicit canonical bug markers not found in scanned files during this pass].

## OmniPort / OmniHub wiring
- Explicit references to `ingress_buffer`, `event_outbox`, HMAC behaviors and outbox claim/requeue SQL in migrations.
- End-to-end packet contract from SBBL worker to OmniHub ingestion [UNVERIFIED: no single integration contract doc found in one location].

---

# Step 3 — Integration Surface Map

| Boundary | Direction | Protocol/Auth | Data Objects | Expected Consumer | Status / Gaps |
|---|---|---|---|---|---|
| SBBL-HQ Worker -> OmniHub OmniPort ingress | Outbound | HTTPS + HMAC (shared secret) | signed sync packets/events | OmniHub ingestion + orchestration | **UNVERIFIED** exact endpoint/path and signature canonicalization parity |
| SBBL-HQ -> Supabase `ingress_buffer` | Outbound | service-role DB/write path | raw_input, correlation_id, risk_score | ingestion worker/claimer | Present in migration SQL; production write caller path **UNVERIFIED** |
| SBBL-HQ -> Supabase `event_outbox` | Outbound | service-role DB/write path | event_type/entity/payload/trace_id | OmniHub pull/dispatch workers | Present with claim/requeue; pull worker identity **UNVERIFIED** |
| SBBL live auth -> Supabase Cloud auth | In/Out | JWT | user/session/roles/entitlements | `useLiveAccess` + worker gates | Implemented; dual-backend parity **UNVERIFIED** |
| SBBL self-host auth -> self-hosted Supabase | In/Out | JWT HS256 self-host key | anon/service role/user claims | self-host stack and scripts | Config + scripts present; runtime integration **UNVERIFIED** |
| Telemetry: stream start/heartbeat/errors | Outbound | worker/API calls + DB events | playback session + telemetry events | OmniCognition / OmniBoard dashboards | Event taxonomy + routing to OmniHub **UNVERIFIED** |
| Broadcast state visibility -> dashboard | Cross-system | realtime/pub-sub + outbox | games/overlay/config state | OmniBoard FSM / dashboard | Workflow exists conceptually; canonical FSM transitions **UNVERIFIED** |

Auth token flow notes:
1. Client obtains Supabase JWT from active backend.
2. Worker/API endpoints should validate JWT and role claims.
3. Server-side privileged operations use service-role key.
4. Cross-system HMAC should protect server-to-server ingestion.
5. Dual issuer validation path (cloud + self-hosted) is required for tomorrow’s event and currently **UNVERIFIED** end-to-end in one runnable contract suite.

Schema mismatches / assumptions flagged:
- `collection_id` sometimes doubles as stream URL carrier in migration-return payloads; this is semantically ambiguous vs. dedicated `stream_url` / `playback_asset_id` fields.
- Missing single source-of-truth integration schema doc for packet and telemetry contracts.

---

# Step 4 — Production Test Plan

| Test ID | Category | Verify | Pass Criteria | Failure Behavior Expected | Tool/Method |
|---|---|---|---|---|---|
| INT-001 | INT | OmniPort ingress reachability from SBBL worker | 200/202 from ingress endpoint with valid packet | 4xx/5xx + structured error and no ingest side effects | Vitest integration + signed HTTP fixture |
| INT-002 | INT | HMAC signature validation parity | Valid signature accepted; tampered payload rejected with 401/403 | Reject + audit log marker | Vitest + canonical signature vectors |
| INT-003 | INT | ingress_buffer -> claim -> process lifecycle | row transitions pending->processing->done with correlation integrity | stuck/retry with error_reason set | Supabase test client + SQL assertions |
| INT-004 | INT | event_outbox enqueue + claim round-trip | event appears and is claimable once with lock semantics | duplicate claim prevented; retry state set | Supabase test client |
| TEL-001 | TEL | Playback start telemetry emission | event emitted with trace_id/correlation_id | missing event increments alert metric | Vitest + mocked sink |
| TEL-002 | TEL | Heartbeat telemetry continuity | heartbeat cadence within tolerance | breaker engages after threshold failures | Vitest timers + worker mock |
| TEL-003 | TEL | OmniCognition ingestion of SBBL telemetry | ingest API stores normalized event schema | reject invalid schema with reason code | Integration test hitting ingest endpoint |
| BCAST-001 | BCAST | Admin vs non-admin stream URL resolution | admin receives config path; non-admin never sees raw upstream URL | non-admin leak causes test fail hard | Playwright + API assertions |
| BCAST-002 | BCAST | `useLiveAccess` gate matrix | player/paid_fan/subscribed/entitled pass; anonymous blocked | incorrect grant/deny per role matrix | Vitest hook tests |
| BCAST-003 | BCAST | WHEP vs blob URL correctness | WHEP URL routes to WhepPlayer; fallback URL types correctly normalized | player error + typed reason surfaced | Vitest component + Playwright runtime |
| PPV-001 | PPV | Pre-payment access blocked | no entitlement => paywall | unauthorized access blocked + no session creation | Playwright + worker API checks |
| PPV-002 | PPV | Post-payment entitlement unlock | Stripe event creates entitlement and access grants | delay/replay handled idempotently | Integration test + Stripe webhook fixture |
| PPV-003 | PPV | Replay embargo enforcement | expired entitlement denies playback | denial reason explicit | DB + API integration |
| AUTH-001 | AUTH | JWT validation (Supabase Cloud issuer) | valid cloud JWT accepted all protected endpoints | 401 on invalid/expired | Vitest integration |
| AUTH-002 | AUTH | JWT validation (self-hosted issuer) | valid self-host token accepted in configured environment | issuer mismatch rejected cleanly | Vitest integration + selfhost fixtures |
| AUTH-003 | AUTH | Role claim enforcement | super_admin privileged ops only; others denied | 403 + audit event | Playwright/API integration |
| LOAD-001 | LOAD | 20,000 concurrent viewer connect/read | p95 latency/error rate within SLO; no auth leak | elevated 5xx/timeout triggers gate fail | k6 distributed scenario |
| STRESS-001 | STRESS | circuit-breaker failover under worker degradation | KV-backed failover preserves active-active symmetry and recovers | asymmetry alarm + degraded mode logged | k6 chaos + worker fault injection |
| REG-001 | REG | RC-1 regression closure | reproducer no longer fails | old bug signature appears => hard fail | Vitest/Playwright reproducer |
| REG-002 | REG | RC-2 regression closure | reproducer no longer fails | old bug signature appears => hard fail | Vitest/Playwright reproducer |
| REG-003 | REG | RC-3 regression closure | no-URL scenario returns explicit named error UX | blank player / silent fail => hard fail | Playwright + component tests |
| E2E-001 | E2E | Full broadcast lifecycle cross-boundary | start->viewer gate->playback->telemetry->dashboard all succeed | any broken hop aborts and captures artifacts | Playwright + Supabase verify + telemetry sink checks |

COVERAGE GAP flags:
- LOAD: distributed infra requirements for 20k may exceed local runner resources.
- STRESS: requires chaos hooks and KV failover toggles not fully documented.
- REG RC-1/RC-2: canonical repro steps not centrally documented.

---

# Step 5 — Codex Implementation Prompt (Raw)

```text
You are implementing a production-grade integration validation suite across two repositories already cloned locally:
- /workspace/APEX-OmniHub (OmniHub/orchestration/integration target)
- /workspace/sbbl-hq (broadcast frontend/worker/payment source)

Mission: fully implement and run the test plan below with NO TODOs, NO placeholders, NO deferred logic.

Context facts (authoritative for this task):
1) OmniHub contains API surfaces in api/omniconnect and api/omnibridge, orchestrator security middleware in orchestrator/security/request_signing.py, and observability in orchestrator/observability/omnitrace.py.
2) OmniHub CI includes Sonar and coverage gates; orchestrator coverage fail-under is 55; infra JS coverage thresholds are lines 85/functions 85/branches 70/statements 85.
3) SBBL-HQ uses Vite+React+TS, Cloudflare Worker routes, Supabase migrations, and Stripe webhook handling.
4) SBBL live access logic is centered on src/hooks/useLiveAccess.ts using rpc('get_active_broadcast') and role/entitlement checks.
5) Playback path and RC-3 behavior are in src/components/LiveStreamPlayer.tsx and src/components/WhepPlayer.tsx.
6) Supabase schema includes ingress_buffer and event_outbox with claim/requeue functions and RLS policies.
7) Dual auth context exists: Supabase Cloud and self-hosted Supabase configurations.

Required test toolchain:
- Unit + integration: Vitest
- E2E: Playwright
- Load/stress: k6
- DB-layer verification: Supabase test client (service role in isolated test env)

Implement the following tests exactly:
INT-001..004, TEL-001..003, BCAST-001..003, PPV-001..003, AUTH-001..003, LOAD-001, STRESS-001, REG-001..003, E2E-001.

For each test implement:
- deterministic fixtures
- positive and negative assertions
- structured error outputs
- artifact capture on failure (logs, payloads, screenshots for Playwright)

Hard ABORT conditions:
- If any INT-* test fails: abort remaining categories and output report.
- If any AUTH-* test fails: abort LOAD/STRESS and output report.

Execution order:
1) INT
2) AUTH
3) TEL
4) BCAST
5) PPV
6) REG
7) E2E
8) LOAD
9) STRESS

Output requirements after execution:
- Print structured JSON summary to stdout with this exact schema:
{
  "timestamp": "ISO-8601",
  "repos": ["/workspace/APEX-OmniHub", "/workspace/sbbl-hq"],
  "results": [
    {
      "test_id": "INT-001",
      "category": "INT",
      "status": "PASS|FAIL|SKIP",
      "duration_ms": 0,
      "evidence": ["path/or/log/ref"],
      "failure_behavior_observed": "string|null"
    }
  ],
  "aborted": false,
  "abort_reason": null,
  "coverage": {
    "vitest": {"lines": 0, "functions": 0, "branches": 0, "statements": 0},
    "playwright_e2e_count": 0,
    "k6_scenarios": ["LOAD-001", "STRESS-001"]
  },
  "broadcast_readiness_verdict": {
    "status": "PASS|FAIL",
    "critical_failures": ["list test IDs that failed in INT/AUTH/BCAST/REG or unverifiable tests"]
  }
}

Verdict rules:
- PASS only if all INT, AUTH, BCAST, REG, and E2E pass and LOAD/STRESS meet SLO thresholds.
- If any INT/AUTH/BCAST/REG test fails OR is unverifiable => FAIL.

Now implement tests directly in-repo, run them, and emit the JSON summary.
```
