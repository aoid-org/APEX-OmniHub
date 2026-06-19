# APEX Agent — Operations & Anti-Drift Reference

**Status:** LIVE / demo-ready · **Last verified end-to-end:** 2026-06-19
**Canonical source of truth.** If reality and this document disagree, fix one of them — do not let them drift. Every value here was verified against the running production system.

> This file lives in the repo on purpose. Update it in the **same PR** that changes any service, env var, table, or start command.

---

## 0. TL;DR — what "working" looks like

A user prompt in OmniSlate must produce: `POST /api/mcp/invoke` → `200 text/event-stream` → SSE `queued → running → completed` within 90s → an `agent_runs` row in a terminal state → a human-readable answer in the UI. No `429`, no `500`, no `timeout`, no `[System Error]…Guardian audit logged`.

Verified test: prompt *"In one sentence, what is APEX-OmniHub and is the agent online?"* → `completed` with a real LLM sentence as `reply`.

---

## 1. Architecture (request path)

```
OmniSlate UI (Cloudflare Pages)
  │  POST /api/mcp/invoke  (Bearer = Supabase user JWT)
  ▼
Cloudflare Pages Function  functions/api/mcp/invoke.ts   ── "OmniPort gateway"
  │  • inserts agent_runs(status=running)   • streams SSE   • polls agent_runs for terminal
  │  POST {SUPABASE_URL}/functions/v1/apex-agent
  ▼
Supabase Edge Function  supabase/functions/apex-agent/index.ts
  │  • Upstash rate limit   • Guardian   • HMAC-sign (ORCHESTRATOR_SHARED_SECRET)
  │  POST {ORCHESTRATOR_URL}/api/v1/goals
  ▼
Render Web Service  apex-orchestrator-api   (orchestrator/server.py · `python main.py api`)
  │  • verify HMAC   • start_workflow on Temporal Cloud
  ▼
Temporal Cloud   ns apex-omnihub-temporal.i7ero · ca-central-1 · queue apex-orchestrator
  ▼
Render Background Worker  apex-orchestrator-worker  (orchestrator/main.py · `python main.py worker`)
  │  • runs AgentWorkflow + activities   • writes terminal state via update_agent_run_completion
  ▼
Supabase agent_runs (status=completed/failed, agent_response, end_time)
  ▲
Gateway poll reads terminal row → SSE completed/failed → UI renders reply
```

---

## 2. Service inventory (source of truth)

| Service | Host | ID / URL | Start command | Builds from |
|---|---|---|---|---|
| UI + Gateway | Cloudflare Pages | `https://apexomnihub.icu` | — (Pages build) | `main` |
| Edge `apex-agent` | Supabase | project `rtopreovkywofgwgmozi` | — (Deno) | `supabase functions deploy` |
| Orchestrator **API** | Render Web Service | `apex-orchestrator-api` · `srv-d8qpsi7avr4c73dmb4ig` · `https://apex-orchestrator-api.onrender.com` | `python main.py api` | `main` (auto-deploy) |
| Orchestrator **Worker** | Render Background Worker | `apex-orchestrator-worker` | `python main.py worker` | `main` (auto-deploy) |
| Workflow engine | Temporal Cloud | ns `apex-omnihub-temporal.i7ero` · `ca-central-1.aws.api.temporal.io:7233` | — | — |
| Rate limit + cache | Upstash Redis | `peaceful-chipmunk-151408.upstash.io` | — | — |

**Render settings for BOTH orchestrator services:** Root Directory `orchestrator` · Runtime Docker · Dockerfile Path `./Dockerfile` · Branch `main` · Region Ohio.
Instance: API = Starter OK · Worker = Starter OK **only with `SEMANTIC_CACHE_ENABLED=false`** (else needs ≥2 GB).

---

## 3. Environment contract (the #1 drift source — keep exact)

### 3.1 Supabase Edge `apex-agent` secrets
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (omit either → **429 every request**, fail-closed) · `ORCHESTRATOR_URL` (base, no trailing slash) · `ORCHESTRATOR_SHARED_SECRET` (must equal the orchestrator's) · `OMNI_GUARDIAN_ENABLED` · `GROQ_API_KEY` · `ANTHROPIC_API_KEY`.

### 3.2 Render — **both** orchestrator services (identical set)
| Var | Value / source | Notes |
|---|---|---|
| `TEMPORAL_HOST` | `ca-central-1.aws.api.temporal.io:7233` | **API-key endpoint**, not the `.tmprl.cloud` mTLS one |
| `TEMPORAL_NAMESPACE` | `apex-omnihub-temporal.i7ero` | |
| `TEMPORAL_TASK_QUEUE` | `apex-orchestrator` | |
| `TEMPORAL_API_KEY` | Temporal Cloud → API Keys | ≤90-day expiry — rotate before it lapses |
| `SUPABASE_URL` | project URL | required always |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key | required always |
| `SUPABASE_DB_URL` | Settings → Database → Connection string (URI) | **required always** — missing = pydantic crash |
| `REDIS_URL` | `rediss://default:<pw>@peaceful-chipmunk-151408.upstash.io:6379` | |
| `REDIS_PASSWORD` | the token between `default:` and `@` in `REDIS_URL` | required in prod |
| `REDIS_SSL` | `true` | |
| `ANTHROPIC_API_KEY` | planner key | required in prod |
| `ORCHESTRATOR_SHARED_SECRET` | same value as edge secret | |
| `ORCHESTRATOR_REQUIRE_SIGNATURE` | `true` | config refuses to boot if `false` in prod |
| `ENVIRONMENT` | `production` | |
| `SEMANTIC_CACHE_ENABLED` | `false` on 512 MB worker | `true`/unset needs ≥2 GB (PyTorch model) |
| `API_HOST` / `API_PORT` | `0.0.0.0` / `10000` | **API service only** |

Config validator: `orchestrator/config.py` hard-requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` always; `REDIS_PASSWORD`, `ANTHROPIC_API_KEY`, `ORCHESTRATOR_REQUIRE_SIGNATURE!=false` in production.

---

## 4. Required database objects

| Object | Used by | If missing |
|---|---|---|
| `agent_runs` (migration `20251221000001_omnilink_ops_pack.sql`) | gateway insert/poll, worker write-back | whole pipeline breaks |
| `omni_policies` (**not currently provisioned**) | OmniPolicy `evaluate_policy` | loader degrades to no-policies (default ALLOW) — see §7 note |
| `idempotency_ledger`, `pilot_sessions` | activity idempotency / BYOM | activity-level degradation |

**Note:** `omni_policies` does **not** exist today; the loader is hardened to tolerate that. A separate `agent_policies` table exists but has a *different* schema and is unrelated to OmniPolicy. To enforce real allow/deny policies later, create + populate `omni_policies` with columns `name, version, priority, match(jsonb), decision, lane, reason, enabled`.

---

## 5. Deploy procedures

| Target | How |
|---|---|
| Gateway + UI | push `main` → Cloudflare Pages auto-build |
| Edge `apex-agent` | secrets apply at runtime (no redeploy); code: `supabase functions deploy apex-agent --project-ref rtopreovkywofgwgmozi` |
| Orchestrator API / Worker | push to `main` under `orchestrator/` → Render auto-deploys; or service → Manual Deploy → Deploy latest commit; env change → Save Changes redeploys |

---

## 6. Smoke test (run after any deploy)

```
# component pings
curl -s -o/dev/null -w "%{http_code}\n" https://apex-orchestrator-api.onrender.com/health      # 200
curl -s -o/dev/null -w "%{http_code}\n" -X POST https://apexomnihub.icu/api/mcp/invoke \
     -H "Content-Type: application/json" -d '{"prompt":"x"}'                                      # 401

# full authenticated end-to-end
bun run ./scripts/test-gateway.ts     # .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_USER_EMAIL, PASSWORD
```
Worker healthy logs: `✓ Connected to Temporal` → `✅ Worker started - polling for tasks...` (and **no** `Instance restarted` loop).

---

## 7. Incident playbook — symptom → cause → fix

| Symptom (SSE / UI) | Cause | Fix |
|---|---|---|
| `failed: upstream_error_429` | edge Upstash unset/partial → fail-closed | set `UPSTASH_REDIS_REST_URL`+`TOKEN` on edge |
| `failed: upstream_error_500` | `ORCHESTRATOR_URL` unset OR orchestrator unreachable | confirm API `/health`=200 + the secret |
| `502` from orchestrator URL | Render service suspended/spun-down/crashed | Render Resume / Manual Deploy; read logs |
| boot `ModuleNotFoundError` | dep imported but not in `pyproject.toml` `[project.dependencies]` | add it, push (deps install from **pyproject**, not requirements.txt) |
| boot `pydantic ValidationError` | required env var missing | add per §3.2 |
| boot fails on Temporal connect | cert vs API-key mismatch | use `TEMPORAL_API_KEY` + `…api.temporal.io:7233` |
| stuck `running`; worker `Instance restarted` loop | worker OOM (512 MB + embedding model) | `SEMANTIC_CACHE_ENABLED=false` or ≥2 GB |
| `failed: Activity task failed`, log `update_agent_run_completion … not registered` | completion activity not registered on worker | ensure it's in `main.py` activities list |
| `failed: Activity task failed`, log `Could not find the table 'public.omni_policies'` | policy table missing crashed `evaluate_policy` | loader now degrades to no-policies (`b10aaa72`); or provision `omni_policies` |
| `completed` but reply is a generic template | conversational answer not surfaced | planner must use `respond_to_user`; reply bubbles via `_handle_success` (`6eaff80`) |

---

## 8. Drift-prevention checklist (read before any change)

1. **Dependencies:** the orchestrator Docker image installs from **`pyproject.toml`** (`pip install -e ".[dev]"`). Anything imported by `server.py`/`main.py`/activities must be in `[project.dependencies]`, not only `requirements.txt`.
2. **Env vars:** change one → update §3 here, and set it on **both** Render services (they share the same set).
3. **DB tables:** any code that `db.select(table=…)` must point at a table that exists; loaders that gate execution must degrade gracefully if absent.
4. **Temporal auth:** API-key auth uses the regional `…api.temporal.io:7233` endpoint + `TEMPORAL_API_KEY`. The `…tmprl.cloud` endpoint is mTLS-only.
5. **Worker memory:** keep `SEMANTIC_CACHE_ENABLED=false` while on Starter.
6. **Branch:** `main` is the deploy branch for Cloudflare + both Render services. Pull `main` before local work so you don't overwrite production fixes.
7. **Secrets:** never commit them; rotate the GitHub PAT (it currently sits in the git remote URL), Upstash password, and Temporal key on schedule.
8. **After every deploy:** run §6 smoke.

---

## 9. Change history — 2026-06-19 restoration (dead → demo-ready)

| Commit(s) | Change | Why |
|---|---|---|
| `60b080c` `e28b1da` `4c8d100` | Temporal Cloud **API-key auth** (config.py/main.py/server.py) | code only supported mTLS; account uses API keys |
| `5c8969d` | declare `slowapi` in `pyproject.toml` | API import crashed (dep only in requirements.txt) |
| `be04b92` | gate semantic cache behind `SEMANTIC_CACHE_ENABLED` | let worker run in 512 MB (no OOM, no upgrade) |
| `c058afff` | register `update_agent_run_completion` + `mint_pilot_session` on worker | runs finished but couldn't record → stuck `running` |
| `b10aaa72` | OmniPolicy loader degrades to no-policies when table absent | missing `omni_policies` crashed every multi-step prompt |
| `4e92b8a` `310221c` `a7ecf50` `6eaff80` | `respond_to_user` conversational tool (activity, contract, registration, reply-bubbling) | agent could only act, not answer questions |
| *(staged, review)* | gateway persists terminal `agent_runs` state on upstream failure (`invoke.ts`) + regression test | stop orphan `running` rows |

**Root-cause chain that was resolved:** Upstash archived (429) → orchestrator Render service down (500/502) → Temporal cert-vs-API-key gap → missing `slowapi` → missing env (`SUPABASE_DB_URL`, Redis) → worker OOM → unregistered completion activity → missing `omni_policies` table → no conversational capability.
