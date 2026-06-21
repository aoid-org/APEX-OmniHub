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
| `CORS_ALLOWED_ORIGINS` | `https://apexomnihub.icu,https://www.apexomnihub.icu` (comma-sep, no spaces) | **API only** — browser origins allowed to call the API cross-origin |

Config validator: `orchestrator/config.py` hard-requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` always; `REDIS_PASSWORD`, `ANTHROPIC_API_KEY`, `ORCHESTRATOR_REQUIRE_SIGNATURE!=false` in production.

**CORS:** `orchestrator/server.py` reads `CORS_ALLOWED_ORIGINS` (default `https://apexomnihub.icu,https://www.apexomnihub.icu` if unset); now **set explicitly** on `apex-orchestrator-api` to pin the allowlist. `allow_credentials=true`; methods `GET,POST,PUT,DELETE,OPTIONS`. The production site calls the orchestrator cross-origin, so add any new front-end origin here and redeploy the service.

### 3.3 Front-end (UI) build-time env
`VITE_ORCHESTRATOR_URL` (= `https://apex-orchestrator-api.onrender.com`) is **inlined by Vite at build time** for the OmniBoard wizard. Direct `wrangler pages deploy` uploads run no Cloudflare build, so the CF Pages dashboard var is ignored — the value is wired into the GitHub Actions build (`release.yml`, `deploy-production-cf-direct.yml`) as `${{ vars.VITE_ORCHESTRATOR_URL || 'https://apex-orchestrator-api.onrender.com' }}`. Unset at build time → empty string → wizard shows "contact your admin". Changing it requires a **UI rebuild + redeploy**.

---

## 4. Required database objects

| Object | Used by | If missing |
|---|---|---|
| `agent_runs` (migration `20251221000001_omnilink_ops_pack.sql`) | gateway insert/poll, worker write-back | whole pipeline breaks |
| `omni_policies` (**provisioned 2026-06-19**, migration `20260619211500_omni_policies.sql`) | OmniPolicy `evaluate_policy` | 7 tailored policies active; loader still degrades to ALLOW if ever unreachable |
| `idempotency_ledger`, `pilot_sessions` | activity idempotency / BYOM | activity-level degradation |

**Note:** `omni_policies` was provisioned 2026-06-19 (migration `20260619211500_omni_policies.sql`) with a tailored APEX policy set (block destructive/secret ops, defer PII/financial + deletions, allow reads/conversation/normal writes). The loader remains hardened to tolerate the table being absent/unreachable (degrades to default ALLOW). A separate `agent_policies` table exists with a *different* schema and is unrelated to OmniPolicy. To change rules, edit the migration and re-apply (the seed uses `ON CONFLICT (name) DO UPDATE`); changes take effect within the loader's 60s cache TTL.

**Active policy set (priority asc = evaluated first; first match wins; no match = ALLOW):**

| Priority | Name | Match | Decision |
|---|---|---|---|
| 10 | deny_delete_protected_tables | `delete_record` on system/financial tables | DENY |
| 15 | deny_write_governance_tables | writes to `omni_policies`/`agent_policies`/audit | DENY |
| 20 | deny_secret_or_credential_data | `data_class` = secret/credential/token/… | DENY |
| 30 | defer_pii_financial_health_data | `data_class` = pii/financial/health/… | DEFER (MAN) |
| 40 | defer_record_deletion | any other `delete_record` | DEFER (MAN) |
| 60 | allow_read_and_conversational | `respond_to_user`/`search_database`/`search_youtube` | ALLOW |
| 70 | allow_system_internal | lifecycle/system activities | ALLOW |

Normal `create_record` / `send_email` / `call_webhook` have no policy → default ALLOW → MAN-mode risk_triage classifies/audits them (so everyday automation stays unthrottled).

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
| `60b080c` `e28b1da` `4c8d100` | Temporal Cloud **API-key auth** in `config.py`/`main.py`/`server.py` | code only supported mTLS cert; the account uses API keys |
| `5c8969d` | Declare `slowapi` in `pyproject.toml` | API server import crashed (dep was only in `requirements.txt`) |
| `be04b92` | Gate semantic cache behind `SEMANTIC_CACHE_ENABLED` | let the worker run in 512 MB without OOM (no extra cost) |
| `c058afff` | Register `update_agent_run_completion` on the worker | completion activity wasn't registered → runs stuck `running` |
| `b10aaa72` | Policy-loader resilience (degrade to ALLOW if `omni_policies` unreachable) | a missing policy table must not crash `evaluate_policy` |
| `4e92b8a` `310221c` `a7ecf50` `6eaff80` | Add `respond_to_user` conversational tool + surface its reply | agent can answer user-facing prompts, not only external tools |
| `49a8393f` | Provision `omni_policies` (7 tailored policies) | governance source-of-truth for the agent |
| `f03b423` `74dfce5` | Operations doc | anti-drift source of truth |

---

## 9.1 Change history — 2026-06-20 OmniDash widget rescue (PR #1441)

| Commit(s) | Change | Why |
|---|---|---|
| `84a4c627` | **`omnilink-port/module-state` Links resolver** no longer reads the `integrations` table; returns an honest **empty link-context state** (`items: []`, actions `add-link`/`send-to-omnislate`, no `test-all`) | Links collect URL/reference context for OmniSlate/agent context — they are **not** app integrations, and must not hydrate from the integrations table |

**Operational contract note (edge fn `omnilink-port`):** the `links` branch of
`module-state` is now a **read-free, no-op resolver** — it queries **no table**
and creates **no migration**. A real link-context persistence table is
intentionally **deferred (gated on JR approval)**; until then Links are staged
client-side only. App integrations remain owned exclusively by the OmniBoard
wizard surface. No env var, secret, start command, or deployed-service topology
changed in this PR.

---

## 9.2 Release cut — 2026-06-21 (apex-omnihub 1.7.1 → 1.8.0)

`package.json` / `package-lock.json` version bumped **1.7.1 → 1.8.0** (minor) via
`changeset version`, consuming the changesets for the unreleased work since
v1.7.1 (APEX Agent LIVE restoration + drift governance; OmniDash widget rescue).
This is the `chore: version packages` release-cut commit that `release.yml`
`release_signal` detects to set `release_cut=true`.

**Operational impact:** version-string bump only. **No dependency, env var,
secret, DB table/migration, start command, or deployed-service topology change.**
This note exists to satisfy the Ops Doc Drift Guard, which (correctly) treats any
`package.json`/`package-lock.json` change as a critical-path edit; the guard
cannot distinguish a SemVer-only bump from a dependency change, so the release
cut is recorded here rather than weakening the guard.

---

## 9.3 Terraform release-promotion fix — 2026-06-21 (HCP org + token)

The `release.yml` atomic routing-flip path (Terraform Plan/Apply) failed because:

1. **HCP Terraform org mismatch.** `terraform/environments/production/main.tf`
   declared `organization = "omnihub"`, which does not exist. The live HCP
   Terraform org is **`APEX-OmniHub`** (single org, verified in the dashboard).
   Fixed to `APEX-OmniHub`; the `omnihub-production` workspace auto-creates on
   first `terraform init`.
2. **Token secret rename.** The workflow referenced `secrets.TF_TOKEN`, which
   **did not exist** (empty value → `unauthorized`). The Terraform credential is
   now the **`TF_PROD_TOKEN`** secret, set at **both repo-level and the
   `production-shadow` environment** (the Plan step runs in the `release` job,
   which has no `environment:`, so it can only read a repo-level secret; the
   Apply step runs in `production-shadow`). CI exposes it to the Terraform CLI as
   `TF_TOKEN_app_terraform_io` / `cli_config_credentials_token`.

**Operational contract change:** the required release secret is now
**`TF_PROD_TOKEN`** (not `TF_TOKEN`). `scripts/ci/shadow-certification-preflight.mjs`
B-3 check now validates `TF_PROD_TOKEN`. The **staging** path
(`.github/workflows/cd-staging.yml`) still uses a **separate** `TF_API_TOKEN`
secret and a separate workspace; it is intentionally not pointed at the
production token (environment separation) and is skipped when its secret is unset.

---

## 9.4 Release cut — 2026-06-21 (apex-omnihub 1.8.0 → 1.8.1)

`package.json` / `package-lock.json` version bumped **1.8.0 → 1.8.1** (patch) via
`changeset version`, consuming a changeset for the release-promotion infra fix
(§9.3: HCP Terraform org `APEX-OmniHub` + `TF_PROD_TOKEN`). This is the
`chore: version packages` release-cut commit that `release.yml` `release_signal`
detects to set `release_cut=true` — re-arming the certification path that
previously failed at Terraform Plan, now with the fix present.

**Operational impact:** version-string bump only. **No dependency, env var,
secret, DB table/migration, start command, or deployed-service topology change**
beyond the §9.3 release-pipeline secret/org correction already documented above.
This note satisfies the Ops Doc Drift Guard, which treats `package.json` changes
as critical-path edits.

---

## 9.5 Terraform module bundling fix — 2026-06-21 (HCP remote plan: `../../modules` not uploaded)

**Root cause:** `terraform/environments/production/main.tf` referenced shared modules via
`../../modules/cloudflare` and `../../modules/upstash`. HCP Terraform's remote plan executor
only receives files within the working directory (`terraform/environments/production/`);
relative paths escaping the upload root (`../../`) are never included in the configuration
archive. The remote runner's `terraform init` therefore fails with
`lstat ../../modules: no such file or directory`.

**Fix:**
- Copied `terraform/modules/cloudflare/` → `terraform/environments/production/cloudflare/`
- Copied `terraform/modules/upstash/` → `terraform/environments/production/upstash/`
- Updated module sources in `main.tf` to `./cloudflare` and `./upstash` (self-relative, within upload root)
- Canonical shared modules in `terraform/modules/` retained for staging and future environments

**Operational impact:** Terraform plan and apply paths unblocked. No infrastructure state,
deployed topology, env vars, secrets, or DB objects changed. Staging (`cd-staging.yml`)
continues to use `../../modules/` (local-backend compatible; no HCP Terraform remote runs).

---

## 9.6 Migration idempotency fix — 2026-06-21 (pg_cron receipts rollback `db push` failure)

**Root cause:** The "Deploy Supabase Edge Functions" CI step failed in
`supabase db push --include-all` with
`ERROR: could not find valid entry for job 'clean-receipts' (SQLSTATE XX000)`.
Migration `20260226000001_rollback.sql` called `cron.unschedule('clean-receipts')`
unconditionally. `pg_cron`'s `unschedule(name)` raises `XX000` when the named job
does not exist, so the file was **not** idempotent despite its comment. On the
remote DB that job had already been removed (by `20260226000004`), so every push
aborted. A second latent bug: `20260226000001_rollback_receipt_cleanup.sql` was an
empty (0-byte) file sharing the **same** version `20260226000001`, which would have
caused a `schema_migrations` PRIMARY KEY (version) collision even after the first
bug was fixed.

**Fix:**
- Guarded the unschedule in `20260226000001_rollback.sql` on both the `cron` schema
  and the `clean-receipts` job existing (mirrors the correct pattern already in
  `20260226000004_rollback_receipt_cleanup.sql`), making it truly idempotent.
- Removed the empty duplicate-version file `20260226000001_rollback_receipt_cleanup.sql`
  (the real receipt-cleanup rollback already exists as `20260226000004`).
- Applied + recorded migration `20260226000001` on the production database via the
  Supabase Management API query endpoint. Both statements are no-ops against the
  current schema (the job and index are already absent), so **no data, indexes, or
  cron jobs were altered**. `supabase db push --include-all` now reports nothing pending.

**Operational impact:** None to runtime contracts — no services, env vars, tables,
or start commands changed. This corrects an existing migration's idempotency only.
Follows §10 rule 3 (only additive/idempotent migrations applied) and rule 4 (verified
live objects + history before the apply). RFC:
`memory/omni-recall/rfc/RFC_2026_06_21_PGCRON_ROLLBACK_IDEMPOTENCY.md`.

---

## 10. Migration history baseline — 2026-06-19

Production Supabase held **live schema objects** (every table/object the migration
stack would create already existed), but its **migration history was empty/untracked** —
`supabase_migrations.schema_migrations` showed **0 applied migrations**. Blindly running
the full migration stack against that database would have been dangerous (re-creating or
mutating live objects, risking data).

**Correct action taken:** all **89** migrations were **baselined / repaired as applied
without re-running their SQL** and **without touching any data**. This aligned
`supabase_migrations.schema_migrations` with the already-live schema. `omni_policies` was
separately confirmed tracked and live with **7 policies**. (The repo now carries 90
migration files: the 89 baselined plus `20260619211500_omni_policies.sql`, provisioned the
same day.)

**DB count verification:** direct query of `supabase_migrations.schema_migrations`
(`select count(*) …`) is unavailable in this Claude Code session — no DB connection string
is present and that schema is not exposed via PostgREST. Baseline recorded from the
restoration session evidence; repo migration-file count (90) verified locally.

**Future rule (do not violate):**

1. **Never** blindly run the full migration stack against production.
2. When history drift is detected, use migration **repair/baseline** — mark existing
   migrations as applied; do not re-run their SQL.
3. Going forward, only apply **new additive/idempotent** migrations.
4. **Before any `supabase db push`,** verify BOTH that live objects exist AND that
   migration-history tracking matches the live schema.

> **NEVER** run `supabase db reset`, force-run the migration stack, or disable RLS against
> production. See §8 Drift-prevention checklist.