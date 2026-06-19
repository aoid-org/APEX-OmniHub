<!-- OFFICIAL operational source of truth. See also docs/APEX_AGENT_OPERATIONS.md (anti-drift reference). -->

# APEX Agent — Operations Runbook

**Owner:** APEX Business Systems Ltd · **Last updated:** 2026-06-19
**Scope:** End-to-end operation of the production APEX Agent (OmniSlate → gateway → edge → orchestrator → Temporal → worker → DB → UI).

> This runbook is the single source of truth for keeping APEX Agent online. If the agent is down, start at **§7 Incident Response**.

---

## 1. Architecture at a glance

```
┌────────────┐   POST /api/mcp/invoke   ┌──────────────────────────┐
│ OmniSlate  │ ───────────────────────▶ │ Cloudflare Pages Function │  functions/api/mcp/invoke.ts
│ UI (CF)    │ ◀─────── SSE ─────────── │  "OmniPort gateway"       │
└────────────┘                          └────────────┬─────────────┘
                          insert agent_runs(status=running)         │ POST {SUPABASE_URL}/functions/v1/apex-agent
                                                       ▼            │   (Bearer user JWT)
                                            ┌──────────────────────▼─────────┐
                                            │ Supabase Edge: apex-agent       │ supabase/functions/apex-agent/index.ts
                                            │  • Upstash rate limit           │
                                            │  • Guardian check               │
                                            │  • HMAC-sign (SHARED_SECRET)     │
                                            └──────────────┬──────────────────┘
                                       POST {ORCHESTRATOR_URL}/api/v1/goals    │
                                                          ▼
                                       ┌──────────────────────────────────────┐
                                       │ Render Web Service: apex-orchestrator-api │ orchestrator/server.py (python main.py api)
                                       │  • verifies HMAC signature             │
                                       │  • starts Temporal workflow            │
                                       └──────────────┬─────────────────────────┘
                                          start_workflow │ (Temporal Cloud, API key)
                                                         ▼
                                       ┌──────────────────────────────────────┐
                                       │ Temporal Cloud  (ca-central-1)         │ namespace apex-omnihub-temporal.i7ero
                                       │  task queue: apex-orchestrator         │
                                       └──────────────┬─────────────────────────┘
                                            polls/executes │
                                                           ▼
                                       ┌──────────────────────────────────────┐
                                       │ Render Background Worker:               │ orchestrator/main.py worker
                                       │ apex-orchestrator-worker                │  • runs AgentWorkflow + activities
                                       │  • writes terminal state to agent_runs  │  • update_agent_run_completion
                                       └──────────────┬─────────────────────────┘
                                          UPDATE agent_runs(status=completed/failed, agent_response, end_time)
                                                       ▼
                                       Gateway poll sees terminal row → SSE `completed`/`failed` → UI renders answer
```

**Success contract:** UI submit → `POST /api/mcp/invoke` returns `200 text/event-stream` → SSE `queued → running → completed` within 90s → `agent_runs` row terminal & schema-correct → no `[System Error]…Guardian audit logged`.

---

## 2. Components & hosting

| Component | Host | Identifier / URL | Source |
|---|---|---|---|
| OmniSlate UI + Gateway | Cloudflare Pages | `https://apexomnihub.icu` | `functions/api/mcp/invoke.ts`, `OmniDashShell.tsx`, `OmniSlatePane.tsx` |
| Edge function (apex-agent) | Supabase | project `rtopreovkywofgwgmozi` | `supabase/functions/apex-agent/index.ts` |
| Database (`agent_runs`) | Supabase Postgres | migration `20251221000001_omnilink_ops_pack.sql` | — |
| Rate limiter + cache backend | Upstash Redis | `peaceful-chipmunk-151408.upstash.io` | `supabase/functions/_shared/rate-limit.ts` |
| Workflow engine | Temporal Cloud | ns `apex-omnihub-temporal.i7ero`, region `ca-central-1`, endpoint `ca-central-1.aws.api.temporal.io:7233` | — |
| Orchestrator API | Render Web Service | `apex-orchestrator-api` · `srv-d8qpsi7avr4c73dmb4ig` · `https://apex-orchestrator-api.onrender.com` | `orchestrator/server.py` |
| Orchestrator Worker | Render Background Worker | `apex-orchestrator-worker` | `orchestrator/main.py worker` |
| Custom API domain (optional) | DNS → Render | `api.apexomnihub.icu` | — |

---

## 3. Environment variables

### 3.1 Supabase Edge function (`apex-agent`) — Dashboard → Settings → Edge Functions → Secrets
| Var | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiter (fail-closed if absent → **429 on every request**) |
| `ORCHESTRATOR_URL` | Base URL of the orchestrator API (no trailing slash). Edge calls `${ORCHESTRATOR_URL}/api/v1/goals` |
| `ORCHESTRATOR_SHARED_SECRET` | HMAC secret; **must match the orchestrator's value** |
| `OMNI_GUARDIAN_ENABLED` | Guardian toggle (default on) |
| `GROQ_API_KEY`, `ANTHROPIC_API_KEY` | LLM keys (guardian / planning paths) |

### 3.2 Render — **both** `apex-orchestrator-api` and `apex-orchestrator-worker`
| Var | Value / source | Required |
|---|---|---|
| `TEMPORAL_HOST` | `ca-central-1.aws.api.temporal.io:7233` | yes |
| `TEMPORAL_NAMESPACE` | `apex-omnihub-temporal.i7ero` | yes |
| `TEMPORAL_TASK_QUEUE` | `apex-orchestrator` | yes |
| `TEMPORAL_API_KEY` | Temporal Cloud API key (Settings → API Keys) | yes |
| `SUPABASE_URL` | project URL | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key | yes |
| `SUPABASE_DB_URL` | Postgres URI (Settings → Database → Connection string) | yes |
| `REDIS_URL` | `rediss://default:<pass>@<host>:6379` (Upstash) | yes (prod) |
| `REDIS_PASSWORD` | the token between `default:` and `@` in `REDIS_URL` | yes (prod) |
| `REDIS_SSL` | `true` | yes |
| `ANTHROPIC_API_KEY` | planner key | yes (prod) |
| `ORCHESTRATOR_SHARED_SECRET` | same value as the edge secret | yes |
| `ORCHESTRATOR_REQUIRE_SIGNATURE` | `true` (config refuses to start if `false` in prod) | yes |
| `ENVIRONMENT` | `production` | yes |
| `SEMANTIC_CACHE_ENABLED` | `false` on a 512 MB worker to avoid the embedding-model OOM; `true` (or unset) when ≥2 GB | optional |
| `API_HOST` / `API_PORT` | `0.0.0.0` / `10000` — **API service only** | API only |

> Config validator (`orchestrator/config.py`) **hard-requires** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` always; and `REDIS_PASSWORD` + `ANTHROPIC_API_KEY` + `ORCHESTRATOR_REQUIRE_SIGNATURE!=false` in production. A missing one = instant `pydantic ValidationError` crash on boot.

---

## 4. Deploy / redeploy

| Service | How |
|---|---|
| Gateway + UI (Cloudflare Pages) | Push to `main` → Pages auto-builds. |
| Edge `apex-agent` | Secrets are picked up at runtime (no redeploy). Code: `supabase functions deploy apex-agent --project-ref rtopreovkywofgwgmozi`. |
| Orchestrator API / Worker (Render) | Auto-deploy on push to `main` affecting `orchestrator/`. Manual: service → **Manual Deploy → Deploy latest commit**. Env change → **Save Changes** triggers redeploy. |

**Start commands (Docker Command override):** API = `python main.py api`; Worker = `python main.py worker`. Root Directory = `orchestrator`, Dockerfile Path = `./Dockerfile`.

---

## 5. Health checks & smoke test

**Component pings (no auth):**
```
curl -s -o /dev/null -w "%{http_code}\n" https://apex-orchestrator-api.onrender.com/health      # expect 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://apexomnihub.icu/api/mcp/invoke \
     -H "Content-Type: application/json" -d '{"prompt":"x"}'                                       # expect 401 (auth guard alive)
```

**Full end-to-end smoke (authenticated):**
```
bun run ./scripts/test-gateway.ts      # needs .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_USER_EMAIL, PASSWORD
```
Pass = SSE reaches `completed` with a non-empty `reply`. `timeout`, `failed`, `agent_run_insert_failed`, `agent_run_poll_failed`, or the OmniSlate system-error string = fail.

**DB telemetry check:** the `agent_runs` row for the traceId should reach `status=completed` (or `failed`), with `agent_response` (completed) / `error_message` (failed) and `end_time` populated, `metadata.source="omniport_gateway"`.

---

## 6. Worker capacity & cost

- The worker's only heavy dependency is the **semantic-cache embedding model** (sentence-transformers + PyTorch). On a 512 MB Starter instance it **OOMs and crash-loops** → workflows never execute → runs stuck at `running`.
- **No-cost fix (stay on Starter):** set `SEMANTIC_CACHE_ENABLED=false` on the worker. This skips the model load (only a planning-latency optimization is lost; correctness unaffected — `check_semantic_cache` returns a clean cache miss).
- **When funded:** Standard (2 GB) and `SEMANTIC_CACHE_ENABLED=true` re-enables plan caching.
- Symptoms of OOM in worker logs: `Loading SentenceTransformer model` immediately followed by `Instance … restarted`, and never reaching `✅ Worker started - polling for tasks...`.

---

## 7. Incident response — "the agent isn't working"

Work the chain **front to back**; each symptom maps to one layer.

| Symptom (UI / SSE) | Layer | Likely cause | Fix |
|---|---|---|---|
| `401 unauthorized` from gateway | Auth | not signed in / expired JWT | re-auth in UI |
| SSE `failed: upstream_error_429` | Edge rate limiter | Upstash unset/partial → **fail-closed** | set `UPSTASH_REDIS_REST_URL`+`TOKEN` on edge |
| SSE `failed: upstream_error_500` | Edge→orchestrator | `ORCHESTRATOR_URL` unset **or** orchestrator unreachable (threw) | verify orchestrator `/health`=200; confirm `ORCHESTRATOR_URL` |
| `502` from orchestrator URL | Render API | service suspended / spun down / crashed | Render → Resume / Manual Deploy; check logs |
| API boot crash `ModuleNotFoundError` | Render API | dep imported but not in `pyproject.toml` | add to `[project.dependencies]`, push |
| Boot crash `pydantic ValidationError` | Render API/Worker | required env var missing | add it (see §3.2) |
| Boot crash on Temporal connect | Temporal auth | cert vs API-key mismatch | use `TEMPORAL_API_KEY` (code supports it); set endpoint `…api.temporal.io:7233` |
| SSE reaches `running`, never terminal; `agent_runs` stuck `running` | Worker | worker not polling / OOM crash-loop | §6 — set `SEMANTIC_CACHE_ENABLED=false` or raise RAM; confirm `polling for tasks` |
| SSE `failed`; `agent_runs` has `error_message` | Workflow | an activity failed (e.g. bad LLM key) | read worker logs / `_handle_failure`; fix the activity input/key |
| UI shows `[System Error]…Guardian audit logged` | Frontend/SSE | gateway path broken upstream | resolve the upstream row above; this string only renders on total gateway failure |

**Golden signals to check, in order:**
1. `apex-orchestrator-api` **Live** + `/health` 200.
2. `apex-orchestrator-worker` logs show `✅ Worker started - polling for tasks...` and **no restart loop**.
3. Temporal Cloud → namespace **Overview** shows recent Actions (workflows running).
4. `agent_runs` rows draining to `completed`.

---

## 8. Logs & monitoring

| Where | What to look for |
|---|---|
| Cloudflare Pages → Functions logs | `agent_run_insert_failed`, `agent_run_poll_failed`, `upstream_error_*`, `internal_gateway_error` |
| Supabase → Edge Functions → `apex-agent` logs | `rate_limit_exceeded`, `unauthorized`, `request_blocked` (guardian), `ORCHESTRATOR_URL not configured` |
| Render → `apex-orchestrator-api` logs | `Uvicorn running`, request errors, Temporal connect errors |
| Render → `apex-orchestrator-worker` logs | `Connected to Temporal`, `polling for tasks`, activity errors, OOM `Instance restarted` |
| Render → Worker `metrics` | Prometheus on port 9090 |
| Temporal Cloud → namespace | Actions chart, Workflows list (Running/Failed/Completed) |
| Supabase → Table editor / SQL | `agent_runs` row states |

---

## 9. Secrets & rotation

- **Never** put the service-role key or `TEMPORAL_API_KEY` in client/edge-exposed config — orchestrator (server-side) only.
- `ORCHESTRATOR_SHARED_SECRET`: rotate by setting a new value on **both** the edge and the orchestrator simultaneously.
- **GitHub PAT** is embedded in the repo's git remote URL — rotate it (GitHub → Settings → Developer settings → Tokens) and re-set the remote.
- **Upstash Redis password** passed through chat during setup — rotate in Upstash when convenient; update `REDIS_URL`/`REDIS_PASSWORD` on both Render services.
- **Temporal API key** expires (≤90 days) — calendar a rotation; regenerate in Temporal Cloud, update `TEMPORAL_API_KEY` on both Render services.

---

## 10. Change log (this restoration — 2026-06-19)

| Commit | Change | Why |
|---|---|---|
| `60b080c`/`e28b1da`/`4c8d100` | Temporal Cloud **API-key auth** in `config.py`/`main.py`/`server.py` | code only supported mTLS cert; account uses API keys |
| `5c8969d` | Declare `slowapi` in `pyproject.toml` | API server import crashed (dep only in requirements.txt) |
| `be04b92` | Gate semantic cache behind `SEMANTIC_CACHE_ENABLED` | let the worker run in 512 MB without OOM (no extra cost) |
| *(staged, not deployed)* | Gateway persists terminal `agent_runs` state on upstream failure (`invoke.ts`) + regression test | stop orphan `running` rows; ship via normal review |

**Root-cause chain resolved today:** Upstash archived (429) → orchestrator Render service down (500/502) → Temporal cert-vs-API-key gap → missing `slowapi` dep → missing env (`SUPABASE_DB_URL`, Redis) → worker OOM on 512 MB.

---

## 11. Migration history baseline — 2026-06-19

Production Supabase had **live schema objects** while its **migration history was
empty/untracked**: `supabase_migrations.schema_migrations` showed **0 applied migrations**
even though the objects from every migration already existed in the live database. Blindly
running all migrations against production would have been dangerous.

**Action taken:** all **89** migrations were **baselined as applied without re-running
SQL** and **without touching any data**. This aligned
`supabase_migrations.schema_migrations` with the live schema. `omni_policies` was confirmed
tracked and live with **7 policies**. (The repo now holds 90 migration files — the 89
baselined plus `20260619211500_omni_policies.sql`, provisioned the same day.)

**DB count verification:** unavailable in this Claude Code session (no DB connection string;
`supabase_migrations` is not exposed via PostgREST). Baseline recorded from restoration
session evidence; repo migration-file count (90) verified locally.

**Future rule — do not violate:**

- **Never** blindly run the full migration stack against production.
- Use migration **repair/baseline** when history drift is detected (mark applied; do not
  re-run SQL).
- Only apply **new additive/idempotent** migrations going forward.
- **Before any `supabase db push`,** verify BOTH live objects AND migration-history
  tracking. Never `supabase db reset` or disable RLS against production.
