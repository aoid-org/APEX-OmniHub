> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

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
| Edge `omnilink-port` | Supabase | project `rtopreovkywofgwgmozi` | — (Deno) | `supabase functions deploy omnilink-port --project-ref rtopreovkywofgwgmozi` |
| Edge `create-billing-portal` | Supabase | project `rtopreovkywofgwgmozi` | — (Deno) | `supabase functions deploy create-billing-portal --project-ref rtopreovkywofgwgmozi` |
| Edge `create-checkout` | Supabase | project `rtopreovkywofgwgmozi` | — (Deno) | `supabase functions deploy create-checkout --project-ref rtopreovkywofgwgmozi` |
| Edge `stripe-webhook` | Supabase | project `rtopreovkywofgwgmozi` | — (Deno) | `supabase functions deploy stripe-webhook --project-ref rtopreovkywofgwgmozi` |
| Edge `identity-webauthn` | Supabase | project `rtopreovkywofgwgmozi` | — (Deno) | `supabase functions deploy identity-webauthn --project-ref rtopreovkywofgwgmozi` |
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

### 3.4 Supabase Edge `generate-business-skills` (SkillForge) provider secrets
The SkillForge generation flow routes through `_shared/llm.ts` (Groq + Anthropic only). The provider is resolved by `resolveSkillProvider()` in `supabase/functions/generate-business-skills/skill-provider.ts`:
- `GROQ_API_KEY` — enables Groq (preferred, cheaper). Optional model override `SKILL_FORGE_GROQ_MODEL` (else the `_shared/llm.ts` default `GROQ_DEFAULT_MODEL` / `llama-3.1-8b-instant`).
- `ANTHROPIC_API_KEY` — Anthropic fallback. Optional override `SKILL_FORGE_ANTHROPIC_MODEL`.
- `SKILL_FORGE_PROVIDER` (optional) — force `groq` or `anthropic`; unset = prefer Groq when its key exists, else Anthropic.
- Neither key set → the SkillForge flow returns **503** (no skill generated). Key values are never logged.

Deploy: `supabase functions deploy generate-business-skills --project-ref rtopreovkywofgwgmozi`.

---

## 4. Required database objects

| Object | Used by | If missing |
|---|---|---|
| `agent_runs` (migration `20251221000001_omnilink_ops_pack.sql`) | gateway insert/poll, worker write-back | whole pipeline breaks |
| `omnimedia_assets` + private `omnimedia-assets` storage bucket (migration `20260628000000_omnimedia_pipeline.sql`, **applied to `rtopreovkywofgwgmozi` 2026-06-28**) | OmniMedia upload-fed catalog/gallery/playback; fed by Files. RLS owner-scoped (`owner_user_id = auth.uid()`); bucket private, 200 MB, media MIME allowlist | OmniMedia catalog/ingest/playback breaks |
| `omni_policies` (**provisioned 2026-06-19**, migration `20260619211500_omni_policies.sql`) | OmniPolicy `evaluate_policy` | 7 tailored policies active; loader still degrades to ALLOW if ever unreachable |
| `idempotency_ledger`, `pilot_sessions` | activity idempotency / BYOM | activity-level degradation |
| `user_generated_skills` + `check_skill_entitlement()` / `enforce_skill_entitlement` trigger (migrations `20260214000001`, `20260610000000`; free cap raised 3→5 by `20260622000000_skill_entitlement_free_cap_5.sql`) | SkillForge generation + paywall (BASIC = 5 active skills, 6th = 402) | SkillForge create + paywall breaks |

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
| Edge `omnilink-port` | code deploy: `supabase functions deploy omnilink-port --project-ref rtopreovkywofgwgmozi`; production deploy workflow publishes it before live OmniBoard route smoke |
| Edge `create-billing-portal` | code deploy: `supabase functions deploy create-billing-portal --project-ref rtopreovkywofgwgmozi`; requires `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` at runtime |
| Edge `create-checkout` | code deploy: `supabase functions deploy create-checkout --project-ref rtopreovkywofgwgmozi`; requires `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` at runtime |
| Edge `stripe-webhook` | code deploy: `supabase functions deploy stripe-webhook --project-ref rtopreovkywofgwgmozi`; requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` at runtime |
| Orchestrator API / Worker | push to `main` under `orchestrator/` → Render auto-deploys; or service → Manual Deploy → Deploy latest commit; env change → Save Changes redeploys |

---

## 6. Smoke test (run after any deploy)

```
# component pings
curl -s -o/dev/null -w "%{http_code}\n" https://apex-orchestrator-api.onrender.com/health      # 200
curl -s -o/dev/null -w "%{http_code}\n" -X POST https://apexomnihub.icu/api/mcp/invoke \
     -H "Content-Type: application/json" -d '{"prompt":"x"}'                                      # 401
curl -s -o/dev/null -w "%{http_code}\n" -X POST \
     https://rtopreovkywofgwgmozi.supabase.co/functions/v1/omnilink-port/omniboard-start \
     -H "Origin: https://apexomnihub.icu" -H "Content-Type: application/json" -d '{}'                  # 401/403/503, never 404

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

### Frontend i18n release gate

The root `npm run i18n:check` command validates OmniHub Site/OmniDash locale resources and hardcoded UI leakage before release. Any change to locale resources, language-switcher behavior, or i18n check scripts must run this command and keep all supported locale JSON files in parity with `en-US`.

Required before merge:

- `npm run i18n:check`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Playwright language-switcher coverage for public pages and OmniDash surfaces where available.

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
## 9.7 BYOM / Connect AI — login auth + proxy inference fix — 2026-06-21 (PR #1449)

**Scope:** `supabase/functions/byom-login`, `supabase/functions/byom-proxy`,
`packages/schema/byom/registry.ts`, and migration idempotency/forward-fixes. No cloud
mutation; all DB validation was against local Docker Supabase only.

**Operational contract changes:**

- `byom-login` now uses a **dedicated auth client** for `signInWithPassword`; the
  service-role client is used **only** for privileged DB writes (`provider_connections`,
  `omnihub_model_registry`, `audit_logs`). RLS unchanged — `provider_connections` has no
  INSERT policy by design (writes are service-role only).
- Provider credential is stored as a PostgreSQL **bytea hex literal** (`\x...`), never as
  plaintext or JSON-array text. Only a 4-char key hint is human-visible.
- Audit insert carries `tenant_id` inside `audit_logs.metadata` (canonical `audit_logs`
  has **no** `tenant_id` column). Event type: `byom.login`.
- `byom-login` writes `tool_use_permissions: ['none']` (valid enum) and `allowed_models`
  may be the wildcard `'*'` for self-service connections.
- `byom-proxy` accepts wildcard `allowed_models = '*'` in addition to explicit model lists.
- `pii_policy` enum extended with `'passthrough'` in the schema registry.

**Migrations:** apply-time guards added to existing migrations (UUID-policy skip,
pg_policies / information_schema existence guards, dollar-quote fixes) so a clean apply
succeeds; two **forward-fix** migrations added (`20260621000000` new-user subscription
status cast text->enum; `20260621000001` admin role sync `app_role` enum cast — fixes
"operator does not exist: app_role = text" that broke new-user creation, incl.
`<fingerprint>@byom.local` users). Long-standing `ON DELETE CASCADE` (auth-owner FKs) and
scheduled-cleanup `DELETE FROM` inside function/cron bodies are annotated with
`-- additive-allow:` reasons (gate-sanctioned, not a bypass).

**Env / start command:** unchanged. No new secrets. Disposable provider test keys must be
revoked after validation.

**Validation:** backend/edge path proven on local Docker Supabase; UI-render (Phase B)
pending — see `docs/byom-validation-continuation.md`.

---

## 9.7 WebAuthn ES256 signature verification + OmniTrace `audit_logs` read-contract — 2026-06-21 (PR #1456)

Two engineering gaps closed in branch `claude/modest-maxwell-oqflsj`.

### identity-webauthn edge function

| Commit | Change | Why |
|---|---|---|
| `605cc98` | `supabase/functions/identity-webauthn/` — full challenge/register/assert cycle with ES256 ECDSA/P-256 signature verification | Assertion now cryptographically verifies `authenticatorData ‖ SHA-256(clientDataJSON)` against the stored public key before trusting the sign counter. Sign-counter monotonicity rejects replay/cloned credentials. |

**New service entry:** `identity-webauthn` Supabase edge function (see §2 Service Inventory above). Deploy command: `supabase functions deploy identity-webauthn --project-ref rtopreovkywofgwgmozi`.

**Secrets required:** same Supabase project env as `apex-agent` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Upstash rate-limit keys (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) must be set on the function — rate limit is fail-closed (rejects if Redis is unreachable).

**Stored data:** only public-key metadata (raw uncompressed P-256 point, credential id, sign counter, timestamps) in `device_registry.device_info.webauthn`. No private keys, no biometric templates.

**Audit receipts:** writes to `audit_logs` (`identity.webauthn.registered`, `identity.webauthn.asserted`, `identity.webauthn.assertion_rejected`) — this is a new write path on the existing `audit_logs` table.

**Certification status:** `REQUIRES_OWNER_VALIDATION` — software path complete and tested; real-device FaceID/TouchID validation and edge function deployment remain owner-controlled.

### OmniTrace `audit_logs` read-contract migration

| Commit | Change | Why |
|---|---|---|
| `61b859b` | `supabase/migrations/20260621000002_omnitrace_audit_read_contract.sql` | Idempotent guard: `CREATE TABLE IF NOT EXISTS audit_logs`, additive `ADD COLUMN IF NOT EXISTS` for all OmniTrace columns, `ENABLE ROW LEVEL SECURITY`, idempotent `DROP POLICY IF EXISTS` / `CREATE POLICY` for `actor_id = auth.uid()`, and `CREATE INDEX IF NOT EXISTS` for `actor_id`, `created_at DESC`, and `(resource_type, resource_id)`. |

**New DB object entry:** `audit_logs` (see §4 Required Database Objects above). Migration is additive and idempotent — safe on fresh DB, partial DB, or already-provisioned production DB. No destructive rewrite; existing write paths (`apex-agent`, `byom-login`, service-role inserts) unchanged.

**Apply:** `supabase db push --include-all` (owner-controlled; not applied to production by this PR).

**Certification status:** `CERTIFIED_FUNCTIONING` (code-certified) — migration + RLS + tests verified in-repo; production DB apply is owner action.

**Env / start command:** no changes. No new secrets. No new services.

**RFC:** `memory/omni-recall/rfc/RFC_2026_06_21_WEBAUTHN_OMNITRACE_READ_CONTRACT.md`.

## 9.8 Orchestrator dependency security lock refresh — 2026-06-22

`orchestrator/uv.lock` was refreshed to resolve the remaining Python dependency
security alert for `pydantic-settings` by moving the resolved version from
`2.14.1` to `2.14.2`. The same lock refresh kept `aiohttp` on patched `3.14.1`
for the reported `aiohttp <=3.14.0` advisories and synchronized lock metadata
for the already-declared `slowapi>=0.1.9` manifest dependency.

**Operational impact:** no service topology, env var, secret, DB table/migration,
start command, or public runtime contract changed. Render still builds the
orchestrator from `orchestrator/pyproject.toml` plus `orchestrator/uv.lock`, and
the API/worker start commands remain `python main.py api` and
`python main.py worker`.

**Validation:** `uv lock --check`, an import/version smoke check, `pip-audit`
against the orchestrator virtualenv, and `uv run pytest tests/test_models.py -q`
passed during remediation.

---

## 9.9 OmniDash OMNIDASH EXECUTION CONTRACT v1.1 — gates 1–15 (PR #1476) — 2026-06-23

UI-only dashboard hardening pass. No deployed-service topology, env var, secret,
DB table/migration, or start command changed.

**Changes in scope:**
- OmniDash shell: drag/drop/pin/minimize/restore modal system (gates 1–4)
- GlobalMediaDock + OmniMediaLaunchWidget with Zustand store (`omniMediaStore`) for real video playback (gate 4)
- GlassCard orange border/glow on all widget cards (gate 5); light-mode border visibility fix
- OmniSentryWidget placement below OmniTrace in right panel (gate 6)
- Billing usage bar + meaningful action handlers (gate 7)
- Files module with working file picker + honest staging CTA (gate 8)
- Workflows SVG pipeline canvas (gate 9)
- Automations module icon-contexted rows (gate 10)
- Audits module static category baseline to prevent blank tiles (gate 11)
- OmniBoard routed through Supabase Edge Functions; CSP tightened (gate 12)
- Settings panel: labeled descriptions, live theme control (Light/Dark/System), Guardian Mode honest "Setup Required" state (gate 13)
- Zero fake/simulated security labels confirmed in production UI (gate 14)
- OmniTraceFeed migrated to Supabase singleton — removed per-render `createClient` (gate 15)
- CI: `.github/workflows/ci-runtime-gates.yml` and `.github/workflows/production-readiness.yml` updated for E2E gate coverage; no start command or env contract changes
- E2E test `omniskills-modal-gate1.spec.ts`: hardened against missing `SUPABASE_URL` by falling back to the same `placeholder.supabase.co` URL the app singleton uses when unconfigured

**Operational impact:** None to deployed services, infrastructure, or runtime contracts.
No new secrets, services, or DB objects required.

---

## 9.10 PR #1477 — OmniSentry + OmniSkills Rebrand + Billing Hardening — 2026-06-23

### 9.10.1 `supabase/functions/create-checkout/index.ts` — Fail-Closed Billing Guard

**Operational contract change:** The `create-checkout` edge function now requires
`STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID_PRO` to be set as Supabase edge function
secrets before it will process checkout requests.

**Behaviour when secrets are missing:**
- Returns `HTTP 503` with JSON body `{"error":"BILLING_NOT_CONFIGURED","message":"Billing is not configured. Contact support at billing@apexbusiness.systems."}`
- The Stripe client is instantiated **only inside** the guard block — no empty-key client is ever created
- Previously, a fake price ID fallback (`price_123456789`) could silently create
  invalid Stripe sessions; this is now removed

**Required secrets (set via Supabase secrets, not `.env`):**
| Secret | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys → Secret key (`sk_live_...`) |
| `STRIPE_PRICE_ID_PRO` | Stripe Dashboard → Product catalog → Pro price ID (`price_...`) — $99 CAD/mo |
| `STRIPE_PRICE_ID_BUS` | Stripe Dashboard → Product catalog → Business price ID (`price_...`) — $299 CAD/mo, prod_UkuVFjyDtN35cw, includes PhysiOmni |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → signing secret (`whsec_...`) |
| `RESEND_API_KEY` | Resend Dashboard → API Keys (`re_...`) |

**Set via CLI:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_PRICE_ID_PRO=price_... STRIPE_PRICE_ID_BUS=price_... \
  STRIPE_WEBHOOK_SECRET=whsec_... RESEND_API_KEY=re_... \
  --project-ref rtopreovkywofgwgmozi
```

**Set via Dashboard:** https://supabase.com/dashboard/project/rtopreovkywofgwgmozi/settings/functions

**No new env vars are exposed to the frontend.** The frontend triggers the Edge
Function via Supabase RPC and redirects to Stripe-hosted checkout — no
`STRIPE_PUBLISHABLE_KEY` is needed in the Vite app.

---

### 9.10.2 `package.json` — New CI Script: `check:omniskills-rebrand`

A new CI validation script was added to enforce the SkillForge → OmniSkills
rebrand across all source files:

```json
"check:omniskills-rebrand": "node scripts/ci/check-omniskills-rebrand.mjs"
```

**Purpose:** Detects any remaining references to the deprecated `SkillForge` brand
name in source/docs files and fails CI if found. This is a linting/governance check
— it does not affect deployed services, start commands, or runtime contracts.

**Script location:** `scripts/ci/check-omniskills-rebrand.mjs`

**Operational impact:** None to deployed services, infrastructure, secrets, or
runtime contracts. This script runs only in CI.

---

## 9.11 CI repair + demo.html CLS fix — 2026-06-23 (PR #1478)

### 9.11.1 `.github/workflows/deploy-web3-functions.yml` — Migration History Repair

**Root cause:** Migration version `20260623074530` was applied directly to the
remote Supabase database (outside the local migrations directory — not tracked
as a local file). This caused `supabase db push --include-all` to abort with:

```
Remote migration versions not found in local migrations directory.
supabase migration repair --status reverted 20260623074530
```

**Fix:** Added `supabase migration repair --status reverted 20260623074530` to
the **Repair Migration History** step, following the same idiomatic `|| echo`
fallback pattern already used for `20260109` and `20260226000001` in that step.

**Pre-verified before merge:**
- `supabase migration repair --status reverted 20260623074530` → confirmed
  `Repaired migration history: [20260623074530] => reverted` locally.
- `supabase db push --include-all --dry-run` → 3 clean pending migrations
  (`20260226000001_rollback.sql`, `20260621000000_omnitrace_audit_read_contract.sql`,
  `20260623000000_add_business_subscription_tier.sql`), exit 0.

**Operational impact:** CI-only fix. No deployed services, start commands, env
vars, secrets, or DB schema/data changed. This restores the Deploy Supabase
Edge Functions workflow to a passing state.

### 9.11.2 `apps/omnihub-site/` — CLS 0.264 → 0 on demo.html

**Root cause:** `DemoVideoPlayer` lacked intrinsic `width`/`height` HTML
attributes, so the browser could not reserve layout space for the video
container before JavaScript hydrated. Combined with a late-loading Inter font
(no preload) and missing `color-scheme` anti-FOUC declaration, the page
accumulated CLS 0.264 — failing Core Web Vitals (threshold 0.1).

**Changes (UI-only, no runtime contract change):**

| File | Change |
|------|--------|
| `apps/omnihub-site/src/components/DemoVideoPlayer.tsx` | Added `width={1280} height={720}` intrinsic props |
| `apps/omnihub-site/src/styles/components.css` | Added `contain: layout style paint` + `min-height: 405px` on `.demo-video-container` |
| `apps/omnihub-site/demo.html` | Added Inter font `<link rel="preload">` + anti-FOUC `color-scheme` script |

**Operational impact:** None. Frontend-only changes. No services, env vars,
secrets, DB tables/migrations, or start commands changed.


## 9.12 OmniBoard connect proxy — omnilink-port → orchestrator FSM (2026-06-23)

### supabase/functions/omnilink-port/index.ts — new routes `omniboard-start`, `omniboard-next`

OmniBoardWizard (`apps/omnihub-site/dashboard/components/OmniBoardWizard.tsx`) calls
`omnilink-port/omniboard-start` and `omnilink-port/omniboard-next`. These routes did not
exist, so the function returned `404 not_found`, which supabase-js surfaces as
"Edge Function returned a non-2xx status code".

This proxy bridges those routes to the orchestrator FSM
(`orchestrator/omniboard/router.py`: `POST /omniboard/start`, `POST /omniboard/{session_id}/next`):

- `handleOmniBoardStart` — validates the user JWT (`createAnonClient(authHeader).auth.getUser()`),
  then `POST ${ORCHESTRATOR_URL}/omniboard/start?tenant_id=<auth.uid>&trace_id=<uuid>`
  (orchestrator takes these as query params). `tenant_id` is bound to the authenticated user.
- `handleOmniBoardNext` — validates JWT, requires `session_id` in the body, forwards the
  `FSMEvent` shape `{ event_type, payload }` to `${ORCHESTRATOR_URL}/omniboard/{session_id}/next`.

`/omniboard/*` is NOT in the orchestrator signed-path set (`orchestrator/security/request_signing.py`
`_SIGNED_PATHS = {/api/v1/goals, /api/v1/intents}`), so no HMAC is required. Failures map to
honest taxonomy: 401 unauthorized, 503 `connect_unavailable` (no `ORCHESTRATOR_URL`),
502 `connect_unavailable` (orchestrator non-2xx / unreachable) — never a leaked transport string.

### Required configuration (owner action)
- Set `ORCHESTRATOR_URL=https://apex-orchestrator-api.onrender.com` as a secret on the
  `omnilink-port` edge function.
- `UPSTASH_REDIS_URL` must be live on the orchestrator (FSM session store).

### Verification gate
- `deno check supabase/functions/omnilink-port/index.ts` (could not run in the agent sandbox — no deno binary).
- Staging e2e: wizard `start` → `next` turns → `COMPLETION` with a Connection Spec.

---

## 9.13 Audit readiness closure — 2026-06-23 (PR #1483)

### 9.13.1 `public.tenant_entitlements` — OmniConnect tenant feature contract

**New DB object entry:** `tenant_entitlements`.

| Object | Runtime owner | Operational purpose |
|---|---|---|
| `public.tenant_entitlements` | OmniConnect `EntitlementsService` | Tenant/user/app/feature access grants for connector features |

**Schema contract:** `id`, `tenant_id`, `user_id`, `app_id`, `feature_key`,
`is_active`, `created_at`, `updated_at`.

**Access contract:** RLS enabled. Authenticated users may select only their own
rows; `service_role` has explicit SELECT/INSERT/UPDATE/DELETE for server-side
grant/revoke flows. No anon grant is added.

**Operational behavior:** grants are upserted on
`(tenant_id, user_id, app_id, feature_key)` and revokes are soft revokes
(`is_active = false`). Missing Supabase credentials, missing rows, or query
errors remain fail-closed. The `auth.users` foreign key uses `ON DELETE RESTRICT`
so entitlement rows are not silently purged by user deletion.

**Apply guidance:** this is a new additive/idempotent migration. Apply through
the standard Supabase migration path only; do not run a full reset or disable
RLS. If production history drift appears, follow §10 migration repair/baseline
rules before applying.

### 9.13.2 `production-readiness.yml` — isolated site SSG smoke gate

**Workflow contract:** the `Smoke Tests` job now installs root dependencies,
installs the isolated `apps/omnihub-site` dependencies, then runs
`bun run build:ssg` with `working-directory: apps/omnihub-site` before the root
production bundle build.

**Runtime expectation:** the gate runs on Node 24 and Bun, matching the existing
production-readiness runner setup. The site SSG launcher preserves the current
React Router v7 stack by patching `vite-react-ssg`'s removed
`react-router-dom/server.js` import to the supported `react-router` server API
before invoking the SSG CLI.

**Operational impact:** CI-only deployment safety improvement. No Cloudflare
Pages project name, start command, runtime secret, or production URL changes.

---

## 9.14 Post-merge security + CI remediation — 2026-06-24 (PR #1484)

Resolves 8 open `aiohttp` Dependabot alerts and completes post-CI hardening.
RFC: `memory/omni-recall/rfc/RFC_2026_06_24_POST_MERGE_SECURITY_CI.md`.

**Dependency lock changes (deployed-runtime critical path):**
- `orchestrator/requirements.lock`: `aiohttp` `3.13.3 → 3.14.1` (patched floor).
  This was the only repo artifact still on a vulnerable aiohttp; `uv.lock` and
  `local-agents/requirements.txt` were already on `3.14.1`. All 8 alerts map to
  advisories affecting aiohttp `3.14.0`, all fixed in `3.14.1` (verified via
  OSV.dev + PyPI; the live Dependabot API was policy-denied this session).
- `orchestrator/uv.lock`: confirmed `aiohttp 3.14.1`; only a lock-format
  `revision 2 → 3` bump (no resolved package versions changed).
- `package.json`: replaced Bun-unsupported nested `protobufjs` overrides with a
  flat `"protobufjs": "^7.6.4"`; the dependency tree now unifies on `7.6.4`.

**Operational impact:** no service topology, env var, secret, DB table/migration,
start command, or public runtime contract changed. Render still builds the
orchestrator from `orchestrator/pyproject.toml` plus `orchestrator/uv.lock`, and
the API/worker start commands remain `python main.py api` and
`python main.py worker`. The workflow edits only pin the Bun toolchain
(`bun-version: latest → 1.3.14`, `packageManager: bun@1.3.14`) and add
regression-guard steps to `security-regression-guard.yml`; no job topology,
secret, or deploy target changed.

**Migration change:** removed the duplicate
`supabase/migrations/20260621000000_omnitrace_audit_read_contract.sql`
(byte-identical to the canonical `20260621000002_omnitrace_audit_read_contract.sql`,
which is unchanged). No DB object contract changed; the canonical OmniTrace
read-contract migration remains the source of truth. Apply guidance per §10.

**New guards:** `scripts/ci/check-python-dependency-security.py`,
`scripts/ci/check-supabase-migration-versions.mjs`, and pre-commit hooks under
`.githooks/pre-commit.d/`, wired into `security-regression-guard.yml`.

**Validation:** Python security guard, migration-version guard,
`bun install --frozen-lockfile`, `uv lock --check`, and
`pytest tests/omniboard -q` (38 passed) all passed during remediation.

---

## 9.15 Release version bump 1.8.1 → 1.8.2 + SBOM attach-only gate — 2026-06-24 (PR #1487)

Two critical-path edits, recorded here to satisfy the Ops Doc Drift Guard
(which treats `package.json` and `.github/workflows/compliance.yml` as
operational source-of-truth).

**`package.json` version bump 1.8.1 → 1.8.2 (SemVer string only).** Aligns the
declared version with the already-written `1.8.2` CHANGELOG section. **No
dependency, env var, secret, DB table/migration, start command, or deployed
service topology change** — version-string bump only. The release cut itself
remains **manual / owner-driven** (`changeset version` → `chore: version
packages`); CI validates, the owner certifies.

**`compliance.yml` `sbom-gate` → SBOM step is now attach-only.** Previously the
step used `softprops/action-gh-release`, which *creates a missing tag by
default*; a `main` push carrying a new `package.json` version with no matching
tag would therefore have auto-created the tag, bypassing the manual cut. The
step is now preceded by a `git ls-remote --tags` existence check and gated on
`steps.tagcheck.outputs.exists == 'true'`, so the action runs **only when
`v<version>` already exists** — it can attach SBOM evidence but can never create
a tag. When the tag is absent it logs a notice and skips.

**Operational contract change:** none to deployed services. The behavioral
change is to the **release pipeline**: CI no longer materializes release tags as
a side effect of SBOM attachment. Release authority is the owner. **Law: CI
validates. Owner certifies.**

---

## 9.16 CI gate optimization — deduplication + dead-gate removal (2026-06-24, PR #1487)

Owner-approved, deductive optimization of the CI surface (~37 PR checks → ~18–20)
with **identical real coverage**: every unique security/correctness/governance
gate still runs exactly once. The waste removed was duplication and structurally
dead (no-op) gates, not governance. Applied incrementally, tier by tier, with a
CI re-run between tiers. **No deployed service, env var, DB table/migration, or
start command changed** — these are CI-pipeline topology edits only.

**Tier A (this section's first landing) — delete provably-dead gates:**
- Removed `.github/workflows/dependency-review.yml`: the GitHub-native dependency
  review requires GitHub Advanced Security, which is not enabled, so the job only
  printed a notice and always passed. Dependency-vuln coverage remains via
  osv-scanner (`apex-governance`), npm audit (`security-regression-guard`), and
  Dependabot.
- Removed the `sast` (CodeQL) job from `apex-governance.yml`: CodeQL upload also
  requires GHAS (disabled) → job always skipped/green, and it was already excluded
  from the `governance-gate` aggregation. SAST coverage remains via SonarCloud
  (`ci-runtime-gates`), ESLint security rules, and osv-scanner. Dropped from
  `governance-gate` `needs`/echo accordingly.
- Removed the `verify-secrets-manager` job from `secret-scanning.yml`: a warn-only
  regex grep that never failed the build, fully dominated by the blocking
  TruffleHog (verified-only) + gitleaks scanners in the same workflow.

**OmniLink (bundled in Tier A):** `apps/omnihub-site/.env.example` and root
`.env.example` documented `VITE_DASHBOARD_URL` as an external host
(`app.apexomnihub.icu` / absolute `apexomnihub.icu/omnidash`). Changed both to the
same-origin relative `/omnidash`, matching the code default in
`apps/omnihub-site/src/pages/Login.tsx` and `.../components/Layout.tsx`
(`VITE_DASHBOARD_URL ?? '/omnidash'`). This guarantees the OmniLink Capacitor
native shell deep-links into the internal authenticated `/omnidash` shell rather
than an external host. (`capacitor.config.ts` has no `server.url`, so the native
shell already loads the local `dist/` bundle — no live redirect existed; this
removes the copy-paste hazard.)

**Tier B — scanner + build/test deduplication:**
- `secret-scanning.yml` is now secrets-only. Its `scan-dependencies` job (Snyk
  informational + npm audit) was removed; dependency auditing is owned solely by
  `security-regression-guard.yml`'s `dependency-audit` job (the single canonical
  `npm audit --omit=dev --audit-level=high` gate plus the Python lockfile /
  security-floor checks). The `report` job's `needs` was trimmed accordingly.
- `security-regression-guard.yml`'s `code-quality` job (tsc + tests + build) was
  removed — it exactly duplicated `ci-runtime-gates.yml`'s `build-and-test`
  (TypeScript type check, unit tests, production build). Build/test/typecheck now
  live in CI Runtime Gates only.
- `production-readiness.yml` was **retired**. Its unique checks were folded into
  `ci-runtime-gates.yml`'s `build-and-test`: documentation drift (`docs:check`),
  Cloudflare Pages `_redirects` existence, the "no TS suppression in config files"
  guardrail, `security-posture-check.sh`, and the `apps/omnihub-site` SSG bundle
  build (`bun run build:ssg`). Its TruffleHog + npm-audit steps were duplicates
  (already covered by secret-scanning + security-regression-guard) and were dropped.

**Tier C — `ops-doc-guard` SemVer exemption:**
- `scripts/ci/check-ops-doc-drift.mjs` now exempts a **version-only** change to
  `package.json` / `package-lock.json` (an owner release cut) from the ops-doc
  drift requirement. The diff is inspected; if the only added/removed lines are
  `"version": "…"` lines, the manifest is not treated as a runtime-contract change.
  Any non-version change to those manifests still requires an ops-doc update.

**Mobile split (`mobile-build-verify.yml`):** Android (Gradle `assembleDebug`)
still verifies on every PR/push; iOS (`xcodebuild`) now verifies **nightly only**
(`schedule: 0 5 * * *`) or on demand (`workflow_dispatch`), to conserve scarce
macOS runner minutes. On PRs the `iOS Build (Simulator)` job is skipped (reports
`skipped`, which branch protection treats as passing); the real verdict is the
`Mobile Build Gate` job. OmniLink behaviour is unchanged.

**Lighthouse split (`lighthouse.yml`):** On PR/push, `.lighthouserc.json` makes
**accessibility + best-practices blocking** (`error`) and does not assert
performance/SEO. Nightly (`schedule: 0 6 * * *`) runs `.lighthouserc.nightly.json`
— the full audit incl. performance + SEO — fully **advisory** (`warn`), reporting
regressions without blocking.

**Compliance consolidation (`compliance.yml`):** four single-step micro-jobs
(`legal-drift-gate`, `retention-evidence-gate`, `claims-proof-gate`,
`rls-posture-gate`) were merged into one `Compliance Gates` job (four runner
spin-ups → one). The deactivated (`if: false`) `Generate Readiness Report` job was
deleted. `sbom-gate`, `sonarcloud-gate`, and `ruff-gate` are unchanged.
`security-guards.yml` was retired — its "Block DEV BYPASS" grep was folded into
`security-regression-guard.yml`'s `Security Invariant Checks` job.

### 9.16.1 Branch-protection required-check changes (ACTION REQUIRED on merge)

These status-check **contexts no longer report** once this PR merges. Remove them
from `main` branch protection → "Require status checks to pass before merging",
or the branch will block on checks that never arrive:

| Removed context | Was defined in | Coverage now provided by |
| --- | --- | --- |
| `Quality Gates` | production-readiness.yml | `build-and-test` (CI Runtime Gates) |
| `Security Gates` | production-readiness.yml | `Scan for Exposed Secrets` + `Dependency Security Audit` |
| `Smoke Tests` | production-readiness.yml | `build-and-test` (Playwright E2E) |
| `Production Readiness Summary` | production-readiness.yml | — (aggregator; no longer needed) |
| `Code Quality Gates` | security-regression-guard.yml | `build-and-test` (CI Runtime Gates) |
| `Scan Dependencies for Vulnerabilities` | secret-scanning.yml | `Dependency Security Audit` |
| `guardrails` | security-guards.yml | `Security Invariant Checks` (DEV BYPASS folded in) |
| `legal-drift-gate` | compliance.yml | `Compliance Gates` |
| `retention-evidence-gate` | compliance.yml | `Compliance Gates` |
| `claims-proof-gate` | compliance.yml | `Compliance Gates` |
| `rls-posture-gate` | compliance.yml | `Compliance Gates` |
| `Generate Readiness Report` | compliance.yml | — (was deactivated `if: false`) |

**Add** to required checks (new consolidated context): `Compliance Gates`.

**Adjust:** if `iOS Build (Simulator)` was a required check, require
`Mobile Build Gate` instead — `iOS Build (Simulator)` now only runs nightly and
will report `skipped` on PRs.

**Unchanged / still required** (no action): `Architectural Boundary Enforcement`,
`Terraform Expression Drift Gate`, `build-and-test`, `Security Invariant Checks`,
`Dependency Security Audit`, `Scan for Exposed Secrets`, `Verify No .env Files`,
`Security Report`, `Build Web Assets`, `Android Build (Debug)`, `Mobile Build Gate`,
`Lighthouse Audit`, `sbom-gate`, `sonarcloud-gate`, `ruff-gate`, and the
`apex-governance` contexts.


---

## 9.16 Edge Function canonical response envelope � 2026-06-24 (PR #1488)

The module-state route in omnilink-port, and the core endpoints in pex-agent, create-checkout, and platform-health, now return a standardized JSON envelope ({ ok: true, data: ... } or { ok: false, error: ... }) via _shared/response.ts.

## 9.17 Production action surfaces + deployed smoke ordering (2026-06-26)

### Supabase Edge Functions

- `omnilink-port` owns OmniBoard app-integration proxy routes: `omniboard-start` and `omniboard-next`. The health response includes `omnilink_enabled`; missing `ORCHESTRATOR_URL`, upstream 4xx/5xx, and timeout/unreachable cases return typed JSON failures rather than raw 404/dead-route behavior.
- `create-billing-portal` owns authenticated Stripe billing portal session creation. It requires `Authorization`, validates the Supabase user through the anon client, reads the user's `subscriptions.stripe_customer_id` server-side, and returns only `{ url }` for a Stripe-hosted portal session.

### Deploy ordering

The governed production Cloudflare Pages workflow (`deploy-production-cf-direct.yml`) now installs the Supabase CLI and deploys `omnilink-port` plus `create-billing-portal` before running `scripts/ci/verify-deployed-bundle.mjs`. This ordering is required because the deployed smoke test asserts that the production OmniBoard Edge route is reachable and not a stale 404.

The Supabase Edge deployment workflow (`deploy-web3-functions.yml`) also publishes `omnilink-port` and `create-billing-portal` when Edge Function paths change.

### Smoke behavior

`verify-deployed-bundle.mjs` validates the deployed bundle Supabase host/key, manifest, service worker, built JS service-worker registration, and OmniBoard Edge route. The OmniBoard route check accepts authenticated/expected service responses (`401`, `403`, `503`, or `2xx`) but fails on `404` or missing CORS. The script falls back to `curl` when Node `fetch` is blocked by proxy-only egress so local/container validation does not create a false network failure.

**Operational impact:** deployed-service contract changed for `omnilink-port` and a new `create-billing-portal` Edge Function was added. Required deployment secrets for the governed direct production workflow now include `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` in addition to the existing Cloudflare and Vite Supabase build secrets.

---

## 9.18 CI hardening — Playwright version output quoting fix (2026-06-26)

**Changed files:** `.github/workflows/integration.yml`, `.github/workflows/ci-runtime-gates.yml`

**Root cause:** The `Get Playwright version` step in both workflows used bare shell variable expansion without quoting the `echo` value written to `$GITHUB_OUTPUT`. On runners where the Playwright version string contained unexpected characters or where the shell expanded the variable before redirection, this could produce a malformed output line, causing the downstream `playwright-cache` cache-key step to use an empty or corrupt version string and guarantee a cache miss every run.

**Fix — `integration.yml`:**

```yaml
- name: Get Playwright version
  id: playwright-version
  run: |
    version=$(node -p "require('./integration-harness/node_modules/@playwright/test/package.json').version")
    echo "version=${version}" >> "$GITHUB_OUTPUT"
```

**Fix — `ci-runtime-gates.yml`:**

```yaml
- name: Get Playwright version
  id: playwright-version
  run: |
    version=$(node -p "require('@playwright/test/package.json').version")
    echo "version=${version}" >> "$GITHUB_OUTPUT"
```

The key change in both cases is wrapping `"$GITHUB_OUTPUT"` in double quotes, which is the POSIX-compliant form and prevents word-splitting/glob-expansion on the redirection target. The `version=…` value is already safely captured via command substitution.

**Operational impact:** CI-only fix. No deployed services, start commands, env vars, secrets, DB tables/migrations, or runtime contracts changed. No Playwright browser version or harness behaviour changed — only the reliability of the cache-key derivation step. This note exists solely to satisfy the ops-doc drift guard, which (correctly) treats any `.github/workflows/` change as a critical-path edit.

## 9.19 Release remediation gates — env fail-closed, dependency branch-only automation, and validation matrix (2026-06-26)

**Changed files:** `.github/workflows/cd-staging.yml`, `.github/workflows/ci-runtime-gates.yml`, `.github/workflows/dependency-consolidation.yml`, `.github/workflows/lighthouse.yml`, `.github/workflows/mobile-build-verify.yml`, `package.json`, `scripts/ci/verify-ci-integrity.mjs`, `scripts/ci/verify-release-validation-matrix.mjs`, and `docs/release/release-validation-matrix.json`.

### Environment contract: no release-sensitive placeholder Supabase fallbacks

Release-sensitive workflows now fail closed when required Supabase build-time secrets are missing instead of silently substituting placeholder/mock values:

- `ci-runtime-gates.yml` production bundle and E2E env now require `E2E_SUPABASE_URL` and `E2E_SUPABASE_ANON_KEY` with no `ci-placeholder.supabase.co` fallback.
- `cd-staging.yml` Terraform plan now consumes staging/Cloudflare/Upstash/Sentry/Datadog secrets directly and no longer supplies `mock-*` or `https://mock.supabase.co` values when `HAS_TF_SECRETS == true`.
- `lighthouse.yml` and `mobile-build-verify.yml` now build with real `VITE_SUPABASE_*` secrets only; missing secrets should fail the build guard rather than produce release evidence against placeholder config.

**Operational impact:** CI/staging/mobile/lighthouse paths are stricter. A missing required secret is now a configuration failure, not a green build with inert placeholder Supabase values. This intentionally protects release evidence from proving only local buildability.

### Dependency automation contract: branch update only

`dependency-consolidation.yml` no longer calls `github.rest.pulls.merge`. It only updates dependency PR branches and records that required checks plus branch protection remain authoritative for merge decisions.

**Operational impact:** dependency consolidation can no longer bypass failing checks by merging directly. Dependency PR merge remains a branch-protection/owner-controlled action.

### New release validation matrix command

`package.json` adds:

```bash
npm run release:validation-matrix
```

This runs `scripts/ci/verify-release-validation-matrix.mjs`, which verifies the repo-level remediation invariants:

- non-OAuth OmniDash launches must remain `LOCAL_LAUNCHED` and must carry `local-launch-only` / `requiresBackendConfirmation` metadata;
- dependency consolidation must not include direct `pulls.merge` or force-merge language;
- release/staging workflow paths must not reintroduce `ci-placeholder` / `mock` Supabase fallbacks;
- live-only items in `docs/release/release-validation-matrix.json` must stay `BLOCKED` or `REQUIRES_MANUAL_VALIDATION` until real owner/live evidence exists.

**Operational impact:** this is a CI/release evidence guard. It does not deploy services or mutate external infrastructure. It prevents future audit evidence from claiming live verification from repo-only checks.

### CI integrity scanner extension

`verify:ci-integrity` now also rejects release-sensitive placeholder config and unsafe workflow merge patterns (`pulls.merge`, `force-merge`, `mustBeGreen: false`) unless an audited `ci-integrity-allow:` exception is present.

**Operational impact:** future workflow edits that weaken release evidence or branch-protection assumptions fail in CI before merge.

---

## 9.20 Production validation harness — non-destructive live evidence gates (2026-06-26)

**Changed files:** `package.json`, `playwright.production-safe.config.ts`, `tests/e2e-playwright/production-safe.spec.ts`, `scripts/ci/perf-k6-smoke.mjs`, `scripts/ci/verify-release-validation-matrix.mjs`, `docs/release/release-validation-matrix.json`, and `docs/release/production-validation-harness.md`.

### New commands

```bash
APEX_PROD_URL=https://apexomnihub.icu npm run test:e2e:production-safe
npm run perf:k6:smoke
npm run release:validation-matrix
```

### Operational contract

The production-safe Playwright suite is read-only by default. It captures sanitized desktop/mobile route evidence for `/`, `/login`, `/request-access`, `/demo`, and `/omnidash` under `artifacts/production-validation/`. It must not be used to claim backend persistence, authentication success, Request Access storage, or OmniDash connector persistence unless a separate backend/read-back proof exists.

`perf:k6:smoke` is a real k6 execution wrapper with explicit thresholds (`http_req_failed < 1%`, `p95 < 1000ms`, `p99 < 2000ms`, checks pass rate `> 99%`). If k6 is missing, the script writes a blocked summary and exits non-zero; this is intentionally not a pass.

`release:validation-matrix` now validates the detailed item-level production validation matrix. The matrix preserves the NO-GO boundary for full production certification until live Cloudflare provenance, authenticated flows, Supabase/RLS, BYOM, billing, mobile/device, performance, and branch-protection evidence is retained.

**Operational impact:** additive release-validation harness only. No deployed services, DB tables/migrations, start commands, runtime app behavior, secrets, or production write paths are changed. The new commands are evidence gates and must be treated as certification inputs, not certification by themselves.

---

## 9.21 OmniSkin Engine (OSE v1.0) — OSE Guard CI gate (2026-06-28, CCEX-OSE-001)

> **⚠️ Production-reach correction (PR #1525, 2026-06-30):** this contract governs
> `apps/omnihub-site/dashboard/omniSkin.css` being imported by
> `apps/omnihub-site/src/main.tsx` — but that file is **not** the Vite production
> entry. Per `index.html` (`<script type="module" src="/src/main.tsx">`), the real
> production entry is the **root** `src/main.tsx`, which never imports
> `omniSkin.css`. PR #1525 found this the hard way: rail-width/pad-x tokens added
> to `omniSkin.css` resolved to nothing at runtime in a live authenticated test.
> **Any CSS rule that must reach the production bundle belongs in a stylesheet the
> root `src/main.tsx` actually imports** (currently `apps/omnihub-site/src/styles/
> {globals,theme,components,omnidash-layout}.css`) — not in `omniSkin.css`. The OSE
> Guard below still runs and is harmless (it's a JSX-style/token-hygiene lint on
> dashboard source, independent of bundle reach), but do not treat "OSE Guard
> passed" as proof a CSS rule is live in production.

**Changed files:** `package.json`, `.github/workflows/apex-governance.yml`, `scripts/ci/check-omni-skin.mjs` (new), `apps/omnihub-site/dashboard/omniSkinTokens.ts` (new), `apps/omnihub-site/dashboard/omniSkin.css` (new).

### New CI Script: `check:omni-skin`

```json
"check:omni-skin": "node scripts/ci/check-omni-skin.mjs"
```

**Purpose:** Enforces the OmniDash token/CSS contract introduced by the APEX OmniSkin
Engine (token forge `omniSkinTokens.ts` + static CSS `omniSkin.css`, see
`memory/omni-recall/design-token-reconciliation.md`). Fails CI if: a JSX `<style>` tag
is reintroduced into `apps/omnihub-site/dashboard/`; the invalid CSS `var()`+hex-alpha
pattern (e.g. `` ${T.x}22 ``, which silently drops the declaration) reappears in
dashboard module files or `OmniDashShell.tsx`; `var(--od-*)` reappears in the
Shell/token-forge files this contract owns; `omniSkin.css` is not imported exactly once
in `apps/omnihub-site/src/main.tsx`; or the `src/components/dashboard/` ghost path
gains an unexpected file. This is a linting/governance check — it does not affect
deployed services, start commands, or runtime contracts.

**Script location:** `scripts/ci/check-omni-skin.mjs`

### `.github/workflows/apex-governance.yml` — new `ose-token-contract` job

A new job runs `npm run check:omni-skin` (checkout → `actions/setup-node` → `npm ci --ignore-scripts` → guard) and was added to `governance-gate`'s `needs:` aggregation, so a failing OSE Guard now blocks the required governance gate.

**Operational impact:** None to deployed services, infrastructure, secrets, env vars, database, or runtime contracts. This is a CI-only static-analysis gate over `apps/omnihub-site/dashboard/` source files.

## 9.11 OmniMedia — image support + Files-fed mini gallery + upload caps (PR #1516) — 2026-06-29

**Migration:** `supabase/migrations/20260629120000_omnimedia_images_and_caps.sql`
(additive, idempotent). Applied to `rtopreovkywofgwgmozi`:

- `omnimedia_assets.kind` CHECK constraint widened from `('video','audio')` to
  `('video','audio','image')`.
- `omnimedia-assets` storage bucket: `allowed_mime_types` extended with
  `image/jpeg,image/png,image/webp,image/gif,image/avif`; per-file
  `file_size_limit` tightened to **25 MB** (matches the per-user total cap).

**Edge function `omnilink-port` (`omnimedia.ts`):** `omnimedia-ingest-from-upload`
now accepts `kind=image` and enforces two **server-side** upload caps (cannot be
bypassed by the client), scoped per-user by RLS:

- **5 uploads / rolling 24h** → `429 daily_limit`.
- **25 MB cumulative** across a user's uploaded assets → `429 storage_cap`.

Deploy command (unchanged): `supabase functions deploy omnilink-port --project-ref rtopreovkywofgwgmozi`.

**Pipeline:** Files already routes media uploads to the `omnimedia-assets` bucket
and calls `omnimedia-ingest-from-upload` via `getPlayableMediaKind`; adding image
MIME types to that map means images flow through the same Files→OmniMedia pipeline
automatically and surface in the right-rail mini gallery.

**Failure modes:** image ingest 400 (`invalid_request`) if the function is older
than this change; `429` on cap breach with honest user copy (no raw backend text).

---

## 9.22 OmniDash P1 regression repair — observability footer-only, System Health restored (2026-06-29)

Owner P1 layout-regression repair that **supersedes the PR #1516 layout decision**.
The #1516 guard wrongly protected the mistake (it required `SystemHealthRow` to be
*absent* and treated `SidebarKpiBar` as the System Health replacement). The guard
and tests were **replaced** (not weakened) to encode the correct owner contract.

Corrected canonical invariants (CI-enforced — `npm run check:omnidash`):

- **System Health retained.** `SystemHealthRow` (`data-testid="rt_analytics"`) is
  restored as a real surface in the right rail and the mobile/tablet Insights
  drawer. It is **not** removed as a substitute for `SidebarKpiBar`; both coexist
  (KPIs in the left sidebar footer, System Health in the rail).
- **Observability is footer-only.** The M-03 observability toggle/panels are
  removed from the main canvas. New `FooterObservabilityRow`
  (`apps/omnihub-site/dashboard/components/FooterObservabilityRow.tsx`,
  `data-testid="footer-observability"`) renders inside the static
  `.omni-footer-bar` — **fixed, clipped (`overflow:hidden`), immovable** (never a
  `DraggableWidget`) — fed by **real** shell state (system health, events tracked,
  Guardian loops, open incidents/queue, live/demo/sync). No decorative-only data.
- **Rail + KPI width parity.** Left/right rails share one width token
  (`--omni-rail-width`); `SystemHealthRow` is a full-rail-width sibling.
- **OmniSlate accessibility.** Prompt input (`omnislate-prompt-input`) + submit
  (`submit-prompt`) stay visible/focusable/usable; the input row is `flexShrink:0`
  so the message canvas absorbs height and the input is never compressed/clipped.
- **Glass/tile generation (root cause of "collapse into plain words").** The
  production entry is the ROOT app (`src/main.tsx`); `tailwind.config.ts` content
  globs previously scanned `apps/omnihub-site/src/**` but **not**
  `apps/omnihub-site/dashboard/**`, so dashboard-only Tailwind utilities (e.g.
  OmniMedia gallery tiles `bg-muted/5`, `border-border/20`) were never generated
  and the right-rail/OmniMedia surfaces rendered as unstyled plain text. Fixed by
  adding `./apps/omnihub-site/dashboard/**/*.{ts,tsx}` to the content globs; guarded
  by a new `check:omnidash` invariant.

**Files:** `apps/omnihub-site/dashboard/OmniDashShell.tsx`,
`apps/omnihub-site/dashboard/components/FooterObservabilityRow.tsx` (new),
`tailwind.config.ts`, `scripts/ci/check-omnidash-integrity.mjs`, plus realigned
tests under `tests/omnidash/` and `tests/e2e-playwright/`.

**No service/schema change** — pure shell layout, CSS-token, and build-config repair
(no migration/RFC required).

---

## 9.23 Billing — `create-checkout` / `stripe-webhook` wired into production deploy, auth fix ported (2026-06-30)

**Root cause:** every row in production `subscriptions` had `stripe_customer_id =
NULL`, so `create-billing-portal` correctly returned `BILLING_CUSTOMER_NOT_FOUND`
for 100% of users regardless of its own auth logic. `create-checkout` (mints/looks
up the Stripe customer and starts Checkout) and `stripe-webhook`
(`checkout.session.completed` → `activate_client_subscription` RPC, which persists
`stripe_customer_id`) were present in source but **absent from every deploy
workflow** — neither function had ever reached production.

**Deploy ordering (`.github/workflows/deploy-production-cf-direct.yml`):** the
"Deploy OmniBoard and Billing Edge Functions" step now also deploys
`create-checkout` and `stripe-webhook`, in addition to the existing
`omnilink-port` and `create-billing-portal`, before the deployed-bundle smoke
test runs.

**Auth fix ported to `create-checkout` (`supabase/functions/create-checkout/index.ts`):**
applied the same fix already live in `create-billing-portal` — `client.auth.getUser()`
(no-arg) does not validate the global `Authorization` header on this supabase-js
version and rejects valid users; the bearer token is now passed explicitly as
`client.auth.getUser(token)`.

**Operational impact:** two previously-undeployed Edge Functions
(`create-checkout`, `stripe-webhook`) are now part of the governed production
deploy. Both already existed in the Supabase secrets/service inventory tables in
§2 and §5 (updated above) — no new secrets are required, only the missing
`supabase functions deploy` calls.

---

## 9.24 Orchestrator — OmniBoard Redis env-var hardened to fail closed (2026-06-30)

**Root cause:** `orchestrator/omniboard/router.py` and `service.py` read
`os.environ["UPSTASH_REDIS_URL"]` as a hard dict subscript. A missing env var
throws an unhandled `KeyError`; Starlette's default handler surfaces this as a
plaintext `"Internal Server Error"` 500 with no error code — the exact opaque
failure observed live when the Render service wasn't yet configured.

**Fix:** New `orchestrator/omniboard/_redis.py` module with a single
`get_omniboard_redis()` helper that uses `os.environ.get(...)` and raises
`HTTPException(503, {"code": "omniboard_redis_unconfigured", ...})` if the
var is absent. Applied to all 8 call sites (3 in `router.py`, 5 in
`service.py`); unused `import redis.asyncio` and `import os` removed from
the affected scopes. Test patches in
`tests/omniboard/test_router_contract.py` updated from
`omniboard.router.redis.from_url` → `omniboard.router.get_omniboard_redis`.

**Operational impact:** Render service must have `UPSTASH_REDIS_URL` set
(raw `rediss://` connection string, **not** the REST-style
`UPSTASH_REDIS_REST_URL`). With it set, OmniBoard FSM sessions now persist
correctly. Without it, routes return a typed JSON 503 instead of an opaque
plaintext crash.

**Out of scope / known follow-up (not fixed in this change):** `activate-client/index.ts`
(the free/BASIC-tier activation path) uses the same no-arg `client.auth.getUser()`
pattern; left unmodified here because it doesn't touch a Stripe customer ID and
is outside the Billing/Stripe-checkout surface this change targets. Also,
`orchestrator/omniboard/router.py` and `service.py` read `os.environ["UPSTASH_REDIS_URL"]`
as a hard subscript — if that var is unset on the Render service, `/omniboard/start`
throws an unhandled `KeyError` (Starlette default plaintext 500). This is a Render
service env-var/runtime issue outside this repo's deploy pipeline, not yet fixed.

---

## 9.25 A.R.I.S.E. Phase 0 Structural Observatory — 2026-07-01 (PR #1540)

**Scope:** `apps/apex-arise/`, `.github/workflows/arise.yml`, root `package.json` scripts.

### What A.R.I.S.E. Phase 0 is

A.R.I.S.E. (Adaptive Repo Intelligence for Structural Evolution) Phase 0 is a
**shadow-mode, measurement-only** structural quality observatory. It runs five
static-analysis signals (acyclicity, modularity, redundancy, control-flow depth,
and file-size equality) across six scan targets, computes a geometric-mean
composite score, and writes a dated markdown snapshot.

**Phase 0 never modifies code, never fails the build, and never opens PRs.**
All CI steps use `continue-on-error: true`. The scan exits 0 regardless of findings.

### Deployed runtime contracts affected

None. A.R.I.S.E. Phase 0 touches no deployed service, no environment variable, no
database table or migration, no start command, and no Cloudflare/Render/Supabase
configuration. It is a CI observability tool only.

### Workflow: `.github/workflows/arise.yml`

The workflow is split into two jobs so a write-scoped token is never present
while third-party scan tooling (madge, dependency-cruiser, jscpd, ts-morph)
executes:

| Job | Trigger | Permissions | What it does |
|---|---|---|---|
| `structural-observatory` | push/PR to `main`/`master`; `workflow_dispatch` | `contents: read` | Installs deps, runs `arise:scan`, uploads the dated snapshot as a build artifact (`arise-structural-baseline`, 90-day retention). |
| `publish-snapshot` | push to `main`/`master` only (never on `pull_request`) | `contents: write` | Downloads the artifact and, if it differs from what's committed, commits and pushes it back with `[skip ci]`. |

| Property | Value |
|---|---|
| Runner | `ubuntu-22.04` |
| Job timeout | 25 minutes (scan), 5 minutes (publish) |
| Build status | **always exits 0** (`continue-on-error: true` on both jobs and all steps) |
| Required check? | **No** — informational only; never blocks merge |
| Artifact committed | `memory/omni-recall/docs/CURRENT_ARISE_STRUCTURAL_BASELINE_YYYY_MM_DD.md`, committed by `publish-snapshot` on every push to `main`/`master` |

Before this two-job split, the scan ran and wrote the snapshot to the
ephemeral runner filesystem only — nothing committed it back, so the "dated
snapshot" never accumulated history beyond whatever was checked in manually.
`publish-snapshot` is what makes this an ongoing observatory rather than a
one-time baseline.

### Root `package.json` scripts

Two convenience scripts were added to the root workspace:

```json
"arise:scan":    "cd apps/apex-arise && bun run arise:scan"
"arise:install": "cd apps/apex-arise && bun install"
```

These are **developer convenience shortcuts only** — they are not used in any
deployed build pipeline. Invoking them requires Bun to be installed locally.

### Coverage integration

`apps/apex-arise` runs its own Vitest test suite with `@vitest/coverage-v8` and
outputs an LCOV report to `apps/apex-arise/coverage/lcov.info`. The
`ci-runtime-gates.yml` workflow generates this report before the SonarCloud scan
via the `Run A.R.I.S.E. coverage` step (`continue-on-error: true`). Sonar ingests
it from `sonar-project.properties`:

```
sonar.javascript.lcov.reportPaths=coverage/lcov.info,apps/apex-arise/coverage/lcov.info
```

This ensures Sonar's "Coverage on New Code" gate has real data for `apps/apex-arise/src/**`.

### Operator runbook

**Run Phase 0 locally:**
```bash
cd apps/apex-arise
bun install          # first time only — installs madge, depcruiser, jscpd, ts-morph
bun run arise:scan   # writes snapshot to memory/omni-recall/docs/
```

**Run tests with coverage:**
```bash
cd apps/apex-arise
bun run test:coverage  # generates apps/apex-arise/coverage/lcov.info
```

**Interpret the snapshot:** find the dated file in `memory/omni-recall/docs/CURRENT_ARISE_STRUCTURAL_BASELINE_YYYY_MM_DD.md`. Composite score is geometric mean of five signals; any 0-scoring signal collapses the composite to 0.

**Degraded runs:** if any signal collector fails (binary not found, JSON parse error, etc.), the snapshot records a `FAILED` row for that signal and the composite is `N/A — degraded run`. The workflow still exits 0. Check the CI log for `[arise] signal "…" failed:` messages.

### Phase 1 gating

Phase 0 establishes the measurement baseline. Phase 1a (first improvement targets) must not be implemented without:
- At least one full Phase 0 snapshot on the main branch showing stable signals.
- Explicit APEX leadership approval of the Phase 1a scope.
- A separate PR with full ops-doc and test coverage for any new automation logic.

Phase 1 work in this PR is strictly forbidden. No autonomous code changes, no PR creation, no build-breaking logic.

### Policy document

`policy/arise-policy.yaml` declares Phase 0 scope, permitted file writes
(`memory/omni-recall/docs/`), and hard-blocked paths (Supabase functions,
migrations, `memory/omni-recall/wiki/_core_directives/`, production OmniDash shell).

## 9.26 A.R.I.S.E. Phase 1a Diagnosis Engine — 2026-07-01 (PR #1544)

**Scope:** `apps/apex-arise/src/diagnosis/`, `apps/apex-arise/tests/diagnosis.test.ts`, root `package.json` scripts.

### What Phase 1a is

Phase 1a is a **read-only diagnosis engine** layered on top of the Phase 0
signal collectors. It re-invokes the same five Phase 0 signals, ranks them
worst-first, extracts the named hotspot artifact (specific file + metric) for
the equality and depth signals, and writes a dated markdown diagnosis report
to `memory/omni-recall/docs/CURRENT_ARISE_DIAGNOSIS_REPORT_YYYY_MM_DD.md`.

**Phase 1a never modifies code, never opens PRs, and never proposes fixes.**
It only names artifacts and states their metric — no remediation logic exists
in this layer. Like Phase 0, it always exits 0, degrading to a "Degraded Run"
report section rather than failing the build if a signal collector errors.

### Deployed runtime contracts affected

None. Phase 1a touches no deployed service, no environment variable, no
database table or migration, and no start command. It is a local/CI-optional
diagnosis tool that reuses Phase 0's existing collectors and aggregate logic
without modifying them.

### Root `package.json` scripts

One additional convenience script was added to the root workspace:

```json
"arise:diagnose": "cd apps/apex-arise && bun run src/diagnosis/index.ts"
```

This is a **developer convenience shortcut only** — it is not invoked from any
CI workflow or deployed build pipeline. Invoking it requires Bun to be
installed locally (see the Phase 0 operator runbook above for `bun install`).

### Operator runbook

**Run Phase 1a locally (after a Phase 0 install):**
```bash
cd apps/apex-arise
bun run src/diagnosis/index.ts   # writes report to memory/omni-recall/docs/
```

**Interpret the report:** find the dated file at
`memory/omni-recall/docs/CURRENT_ARISE_DIAGNOSIS_REPORT_YYYY_MM_DD.md`. Signals
are ranked worst-first (rank 1 = lowest score); any signal scoring below 0.5 is
flagged `HOTSPOT`. The report's "Priority Targets for Phase 1b" table lists the
top two hotspots for scoping purposes only — Phase 1a proposes no fixes.

## 9.27 A.R.I.S.E. Phase 1b WP-0/WP-1 — diagnosis CI wiring + policy contract for Phase 1 (2026-07-01)

**Scope:** `.github/workflows/arise.yml`, `policy/arise-policy.yaml`,
`apps/apex-arise/tests/policy.test.ts`. No new dependencies, no new CI
secrets, no autonomy change (`autonomy: none` unchanged).

### WP-0 — `diagnosis-observatory` CI job

`arise.yml` gains a `diagnosis-observatory` job, structurally identical to
`structural-observatory`: read-only `contents: read` token, runs
`arise:diagnose`, uploads the dated diagnosis report as a build artifact
(`arise-diagnosis-report`, 90-day retention), `continue-on-error: true` at
job and step level. It never gets a write-scoped token.

`publish-snapshot` now depends on both observatory jobs and downloads both
artifacts independently (each download step is `continue-on-error: true`,
so a missing artifact from one job never blocks publishing the other). The
commit step uses `shopt -s nullglob` to build the list of files that
actually exist on disk before running `git status`/`git add`, so a missing
snapshot or report is a clean no-op rather than a failed `git add` on a
non-matching pathspec. Same bot identity, same push-to-`main`/`master`-only
gate, same `git pull --rebase` → `git push` sequence as Phase 0.

`policy/arise-policy.yaml`'s `writes_permitted` gained one entry,
`memory/omni-recall/docs/CURRENT_ARISE_DIAGNOSIS_REPORT_*.md`, closing the
gap where Phase 1a was writing a path its own policy file didn't declare.

### WP-1 — policy contract for Phase 1 (self-edit hazard fix)

`policy/arise-policy.yaml`:
- **`policy/arise-policy.yaml` moved from `writes_permitted` to
  `hard_blocked_always`.** No automated process this repo builds —
  including the Phase 1b propose engine — may ever hold write access to
  its own permission envelope. Only a human, via a normal reviewed PR,
  edits this file from here forward. `apps/apex-arise/tests/policy.test.ts`
  is the permanent regression guard for this invariant.
- Added a `tier_1_propose` block (`max_lines_changed: 150`,
  `max_files_changed: 5`, `output: pull_request_only`, `auto_merge: false`,
  `merge_requires: human_review`, `gated_by: policy/rsi-policy.yaml`) —
  values carried forward from RFC-004 §7.2, not renegotiated here.
- `hard_blocked_always` is now the Tier 2 list: diagnosis + PR-comment
  only, never a patch attempt, no exceptions.
- `phase: 0` → `phase: 1`. `mode` (`shadow-observation-only`) and
  `autonomy` (`none`) are unchanged — Phase 1b is PR-only, human-merge-
  required, not autonomous merge.

**This PR does not build the propose engine itself (WP-2).** That is
gated on explicit owner sign-off of the Pre-Flight Gate (dependency
sign-off, `ANTHROPIC_API_KEY` secret presence, Tier 1 envelope
confirmation, pilot target approval) per the Phase 1b execution contract.

## 9.28 A.R.I.S.E. Phase 1b WP-2 — Propose Engine (2026-07-01)

**Scope:** `apps/apex-arise/src/propose/`, `apps/apex-arise/tests/propose/`,
`.github/workflows/arise-propose.yml`, root `package.json` scripts
(`arise:propose`, `arise:open-pr`). Pre-Flight Gate cleared by owner: Phase 0
dependency sign-off approved, `ANTHROPIC_API_KEY` confirmed present as a repo
secret, Tier 1 envelope confirmed as specified, pilot target = redundancy
findings. Zero new entries in `apps/apex-arise/package.json`
`devDependencies` — `@ai-sdk/anthropic`, `ai`, and `zod` are resolved from
the root `node_modules` via Bun's ancestor lookup (verified empirically),
not added as a new dependency anywhere.

### What Phase 1b is

A bounded, PR-only, human-merge-required patch proposal pipeline. Given the
redundancy signal's largest concrete duplicate block (re-detected via
`jscpd` with `--absolute`, since the diagnosis report only carries the
aggregate percentage, not clone locations — `src/propose/target.ts`), it
asks a Claude model for a minimal diff that removes the duplication
(`src/propose/model.ts`), validates it against `policy/arise-policy.yaml`'s
`tier_1_propose`/`hard_blocked_always` (`src/propose/envelope.ts` — the
single source of truth for "is this patch allowed," zero I/O, fully pure),
verifies it in an isolated `git worktree` by running the repo's own
`typecheck`/`lint`/`test` (`src/propose/sandbox.ts`, node_modules symlinked
from the main checkout rather than reinstalled), and — only if every gate
passes — opens a PR from a separate, minimally-privileged CI job
(`src/propose/pr.ts`, `src/propose/open-pr-cli.ts`). Every outcome, including
every rejection, is logged to a dated report
(`memory/omni-recall/docs/CURRENT_ARISE_PROPOSE_REPORT_<date>.md`,
`src/propose/reporter.ts`) — never a silent no-op.

### Model call fail-closed contract

`src/propose/model.ts` mirrors `tools/rsi/model_gateway.py`'s shape: 30s
timeout (`AbortSignal.timeout`), strict schema validation on the response via
a Zod schema passed to `generateObject` (`proposed_diff`, `confidence`,
`rationale`, `files_touched`), and every error path (missing credential,
timeout, auth failure, endpoint error, malformed response) returns a typed
`{ available: false, error: <code> }` instead of throwing past the
function's own boundary.

### CI wiring: `.github/workflows/arise-propose.yml`

Deliberately a separate workflow file from `arise.yml`, keeping the
always-safe observatory workflow untouched by a heavier, credentialed job.

| Job | Trigger | Permissions | What it does |
|---|---|---|---|
| `propose` | `workflow_dispatch` only | `contents: read` | Installs deps (root `npm ci` for `ai`/`@ai-sdk/anthropic`/`zod`, then `apps/apex-arise` `bun install`), runs `arise:propose`, uploads the propose report and — if produced — the validated candidate diff as artifacts. Never holds write access. |
| `open-pr` | `needs: propose`, `if: needs.propose.outputs.patch_ready == 'true'` | `contents: write`, `pull-requests: write` | Downloads the candidate diff artifact, runs `arise:open-pr` to create the branch, commit, push, and open the PR via the GitHub REST API. Never runs the model call or the sandbox. |

No push, pull_request, or schedule trigger exists on this workflow — human
`workflow_dispatch` only, per the execution contract's Day-1 gating.

### Package boundary note (monorepo, no workspaces)

`apps/apex-arise` has no `workspaces` entry linking it to the root
`package.json`; it is verified empirically that Bun's module resolution
still walks up ancestor `node_modules` directories, so `import { ... } from
"ai"` resolves against the root install without adding a redundant
dependency entry to `apps/apex-arise/package.json`. This is why the
`propose` CI job runs a root `npm ci --ignore-scripts` step before `bun run
arise:propose` — omit it and the import fails to resolve in a clean
checkout. The `open-pr` job does not need this step: `pr.ts` and
`open-pr-cli.ts` depend only on Node built-ins and local modules.

### Definition of Done status

- [x] `bun run typecheck && bun run lint && bun run test` green inside
  `apps/apex-arise`; `src/propose/**` coverage 98.62% statements / 99.51%
  lines (190 tests total across the package)
- [x] Zero new entries in `apps/apex-arise/package.json` `devDependencies`
- [x] `arise-propose.yml`: `workflow_dispatch`-only trigger confirmed
- [ ] One manual `workflow_dispatch` run against the real redundancy pilot
  target — intentionally **not** run as part of this change; opening a real
  PR (or spending real model credit) is a separate, explicit action for the
  owner to trigger or authorize, not something to do unprompted from a
  code-authoring session.

---

## 9.29 Automations — real create/execute path wired; Audits export wired (2026-07-01)

**Root cause:** two real, already-built backend paths were unreachable from
the UI, for the same class of reason:

- `omnilink-port`'s `resolveAutomations()` (Automations module-state) never
  included `execute-automation` in its returned `actions` list, even though
  `AutomationsModule.tsx`'s `handleAction` and the `execute-automation` edge
  function were both fully implemented — the button simply never rendered.
- `AuditsModule.tsx` had no `onAction` handler at all, so `export-audit`
  always fell through to the generic "not connected" capability message even
  though `exportAuditLogCSV()` already existed and worked (it just pointed at
  the wrong table).

**Fix:**
- `supabase/functions/omnilink-port/index.ts`, `resolveAutomations()`: added
  `'execute-automation'` to the `actions` array, and added a `detail` string
  (`Trigger: <trigger_type> | Action: <action_type>`) to each mapped item so
  real automation rows display the same way demo rows do.
- `AutomationsModule.tsx`: added a real inline "Create Automation" form
  (name, trigger label, action-type-specific config for
  webhook/notification/send_email/create_record) that inserts directly into
  the `automations` table via the authenticated client (RLS-scoped to
  `user_id = auth.uid()`), then refetches.
- `dashboard/utils/exportAuditLog.ts`: `exportAuditLogCSV()` now queries
  `audit_logs` (matching what `resolveAudits()` and the panel display)
  instead of the unrelated `omnitrace_events` table, and returns a typed
  `{ ok, message }` result instead of silently no-op'ing. `AuditsModule.tsx`
  wires `export-audit` to it.

**Operational impact:** no new service, environment variable, database
table, or start command — both changes reuse existing tables
(`automations`, `audit_logs`) and the existing `execute-automation` edge
function. `omnilink-port` was redeployed (`supabase functions deploy
omnilink-port`) to ship the actions-list change; no secrets changed.

**Verified live** against the deployed function and the real Supabase
project: inserted a real `automations` row, confirmed it appeared via
`module-state` with `execute-automation` now available, executed it through
`execute-automation` and got a genuine success result, then deleted the
test row. Confirmed the audit export query returns real `audit_logs` rows
for an authenticated test account.

**Out of scope (not fixed in this change):** "Run Compliance Check" in
Audits still has no backend (no rules engine, no compliance table) —
correctly left as an honest "not connected" state pending a scoping
decision, not swapped for a fake pass/fail. Automations execution remains
user-initiated (click Execute) — no autonomous/event-driven triggers exist
yet.

---

## 9.30 Workflows — real create/execute path wired; `workflows`/`workflow_runs` tables recovered in production (2026-07-01)

**Root cause (frontend):** `WorkflowsModule.tsx` had no `onAction` handler at
all — same class of gap as §9.29's Automations/Audits fix. `create_workflow`
and `trigger_run` were already present in `resolveWorkflows()`'s live
`actions` list, but always fell through to the generic "not connected"
capability message.

**Root cause (backend — new finding this pass):** `execute-workflow` did not
exist as a standalone edge function (only the generic Temporal-oriented
`trigger-workflow` did, and the orchestrator has **zero** `module.*` intents
registered — only `system.health_check`/`echo`/`list_intents` — so routing
`trigger_run` through it would have produced a genuine "Intent not
registered" error every time). More significantly: **the `workflows` and
`workflow_runs` tables did not exist anywhere in the production Postgres
catalog**, despite `supabase_migrations.schema_migrations` recording BOTH
`20260220000003_workflow_studio` and a second, schema-conflicting migration
`20260223061443_init_omnidash_workflows` as already applied. Confirmed via
direct `pg_tables` query (Management API `/database/query`) — the tables
were marked-applied but never actually materialized; `resolveWorkflows()`
had therefore always failed live (`Promise.allSettled` rejection → `State:
'Error'`) regardless of any frontend wiring.

**Fix:**
- New `supabase/functions/_shared/action-executor.ts` — extracted the four
  action executors (`send_email` via Resend, `create_record` with a table
  allowlist, `webhook` with SSRF protection, `notification`) out of
  `execute-automation/index.ts` into a shared module. `execute-automation`
  now imports `executeAction(...)` instead of duplicating ~250 lines;
  behavior is unchanged (verified — see below).
- New `supabase/functions/execute-workflow/index.ts` — runs a saved
  workflow's `definition.steps` (array of `{ action_type, config }`, each
  shaped exactly like an Automation action) through the same shared
  executor, fail-fast on the first failing step, and persists a real
  `workflow_runs` row (`status`, `logs`, `error_message`). No Temporal/
  orchestrator involvement — stays entirely within Supabase edge functions,
  same trust boundary as `execute-automation`. Registered in
  `supabase/config.toml` (`verify_jwt = true`) and rate-limited
  (`executeWorkflow: 20/min`, added to `_shared/rate-limit.ts`).
- `supabase/functions/omnilink-port/index.ts`, `resolveWorkflows()`: now
  selects `definition` too and adds a real `detail` string (`"<N> steps |
  Last: <status>"`) so real workflow rows display correctly instead of the
  frontend's default-4-steps fallback.
- `WorkflowsModule.tsx`: added a real inline "Create Workflow" form
  (multi-step builder, up to 10 steps, same four action types as
  Automations) that inserts into `workflows` via the authenticated client,
  and wired `trigger_run` to invoke `execute-workflow` for a selected real
  (UUID) workflow row.
- **Applied the missing `workflows`/`workflow_runs` DDL directly** (exact
  `CREATE TABLE IF NOT EXISTS` / `ENABLE ROW LEVEL SECURITY` / `CREATE
  POLICY` statements from `20260220000003_workflow_studio.sql`, idempotent,
  purely additive) via the Management API against the live project, since
  the migration was already marked applied and re-running it through the
  normal migration pipeline would have been a no-op. Verified both tables
  and all 7 RLS policies (4 on `workflows`, 3 on `workflow_runs`) now exist
  via direct `pg_tables`/`pg_policies` queries.

**Operational impact:** two new deployed functions
(`execute-workflow`, and the refactored `execute-automation`) plus the
already-deployed `omnilink-port` update. `execute-workflow` was deployed
manually via `supabase functions deploy execute-workflow` — like
`execute-automation`, it is **not yet** in
`.github/workflows/deploy-production-cf-direct.yml`'s explicit deploy list,
so a future CI-driven redeploy of `omnilink-port`/Cloudflare will not
automatically pick up further `execute-workflow` changes. This existing gap
(pre-dating this change, shared with `execute-automation`) is flagged here,
not fixed — expanding that workflow's scope was judged out of bounds for
this pass.

**Verified live** against the deployed functions and the real Supabase
project: confirmed `execute-automation` behavior is unchanged after the
shared-executor refactor (created + executed + deleted a real automation,
identical result shape to before); created a real 2-step workflow
(notification × 2), confirmed it appeared via `module-state` with
`trigger_run` available and a real `"2 steps"` detail string, triggered it
and got both steps' real results back, confirmed the persisted
`workflow_runs` row matched; separately created and triggered a workflow
with a webhook step pointed at a loopback address to prove the **honest
failure path** — SSRF protection correctly blocked it and the run recorded
`status: "failed"` with a real error message, not a faked success. All test
rows deleted after verification.

**Out of scope (not fixed in this change):** registering real Temporal
intents in the orchestrator for `module.workflows.*` — deliberately not
pursued this pass in favor of the edge-function step-executor approach
(see decision record: user chose "new step-executor edge function" over
"register a real Temporal intent" when presented with both options).
`WorkflowsModule.tsx` still renders its SVG pipeline visualization *and*
`ModuleShell`'s default clickable item-selection list for the same items
(pre-existing double-rendering, now load-bearing since selection is needed
for `trigger_run` — not fixed, out of scope for this pass).

---

## 9.31 Migration-tracking drift audit — 9 more silently-missing tables recovered (2026-07-01)

**Context:** §9.30 found `workflows`/`workflow_runs` marked "applied" in
`supabase_migrations.schema_migrations` while genuinely absent from the live
Postgres catalog. That looked like it could be an isolated incident, so this
pass audited for the same pattern more broadly before assuming it was.

**Method:** diffed every `CREATE TABLE` statement across all ~98 committed
migration files against the live project's `pg_tables` (Management API
`/database/query`, read-only). 24 tables came back as "referenced in a
migration, absent live." Cross-referenced each against non-migration code
(`grep` across `apps/`, `supabase/functions/`, `orchestrator/`, `src/`) to
separate **load-bearing** gaps (a real resolver/edge function queries the
table right now) from **dormant** ones (defined in a migration, never
queried by any live code path — abandoned/not-yet-built features, not
active bugs).

**Load-bearing gaps found and fixed (9 tables, 2 migrations, both already
recorded as "applied"):**
- `20260312090000_omnidash_runtime_tables.sql` → `user_dashboard_layouts`,
  `user_ops_controls`, `omnihub_analytics`, `omnitrace_events`,
  `security_audit_log`, `agent_sessions`, `telemetry_audit_log`. Notably
  `user_ops_controls` is very likely the real root cause of the earlier-
  catalogued UI-014 "(Simulated)" metrics bleed — `OmniDashShell.tsx`'s
  `ops.demo` (`DEFAULT_OPS_STATE`, defaults `true`) had nowhere to persist a
  per-user override without this table exising, so every session silently
  fell back to the simulated default. Not independently re-verified in this
  pass (out of scope — flagging for the next OmniDash session to confirm).
  `omnitrace_events` explains the "OMNITRACE — LIVE — No events yet" seen in
  this session's very first screenshot: confirmed live before/after —
  `module-state` for `omnitrace` went from a query failure to a genuine
  `State: "Online"`, 0 items (empty because no events exist yet, not because
  the query is broken).
- `20260125000000_omnitrace_replay.sql` → `omni_runs`, `omni_run_events`
  (plus 3 idempotent `SECURITY DEFINER` helper functions, `search_path`
  pinned). Backs the dedicated `supabase/functions/omni-runs/index.ts` edge
  function.

Applied both migrations' exact DDL directly (idempotent
`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` /
`CREATE OR REPLACE FUNCTION`, same rationale as §9.30 — already marked
applied, so the normal migration pipeline would no-op on them). Verified
all 9 tables and their RLS policies exist via direct `pg_tables`/
`pg_policies` queries.

**Confirmed dormant, NOT fixed (no live code references anywhere —
correctly left alone rather than resurrecting speculatively):**
`security_incidents`, `leads`, `lead_events`, `apex_compensation_catalog`,
`apex_idempotency_ledger`, `apex_performance_budgets`,
`apex_policy_decisions`, `circuit_breaker_state`, `enterprise_tenants`,
`physical_devices`, `tenant_embedding_budget`, `tenant_memberships`.
`agent_events`/`agent_memories` are referenced only from the orphaned root
`src/` shim tree (`src/hooks/useOmniStream.ts` — see tree_law in
`omnidev-apex-pro-v2`), not from `apps/omnihub-site`, so also left alone.
`security_incidents` is the one worth flagging specifically: its own
migration's header cites PIPEDA 24-month breach-retention requirements, so
its absence is a compliance-relevant gap, not just an unused feature — but
since zero code anywhere writes to or reads from it, recreating the table
alone wouldn't make anything real. Needs a real writer wired up first, not
just the schema.

**Out of scope:** the remaining ~74 migrations that did *not* show up in
this diff were not individually re-verified row-by-row against
`schema_migrations` beyond the table-existence check — this audit proves
table-level drift, not full column/constraint/function-level drift for
every migration.

---

## 9.32 Workflows — real pg_cron autonomous scheduling (2026-07-01)

**Context:** §9.30 shipped manual-only workflow execution (click "Trigger
Run") and explicitly deferred autonomous/event-driven triggers pending a
scoping decision between (a) a new edge-function step-executor or (b)
registering real Temporal intents in the orchestrator. This pass confirmed
`pg_cron` (1.6.4) and `pg_net` (0.19.5) are both enabled on the production
project, making a third option — real cron-driven scheduling entirely
within Supabase, no orchestrator involvement — concretely available, so it
was built.

**Design:** `workflows.schedule` (previously an unused free-text column)
now accepts one of `'every_5_min' | 'hourly' | 'daily'` (CHECK constraint
`workflows_schedule_preset_check`, NULL/manual unaffected). A pg_cron job
(`workflow-scheduler`, `*/5 * * * *`) calls
`public.dispatch_scheduled_workflows()`, a `SECURITY DEFINER` function
that finds active, scheduled, due workflows (due = no run yet, or last
`workflow_runs.created_at` older than the preset's interval) and fires an
async `net.http_post` to `execute-workflow` per workflow — the same edge
function the manual button already calls.

**Auth for the system caller:** `execute-workflow` previously only accepted
a user JWT. It now also accepts `X-Cron-Secret` matching `CRON_SHARED_SECRET`
(a new Function secret) as an alternate path — `verify_jwt` flipped to
`false` in `supabase/config.toml` for this function (platform-level JWT
enforcement would otherwise reject the cron caller before that check ever
runs; same pattern `omnilink-port` already uses). On the cron path the
function looks up the workflow **by id only** (no user to scope by yet)
and then uses that row's own `user_id` for every subsequent operation — the
scheduler can only ever act as the workflow's actual owner, never as an
arbitrary user. The secret itself lives in Supabase Vault
(`vault.decrypted_secrets`, name `cron_shared_secret`) rather than in the
migration file or `cron.job` body in plaintext, and mirrors the same value
set as the `CRON_SHARED_SECRET` Function secret.

**Frontend:** `WorkflowsModule`'s create form gets a schedule dropdown
(Manual / Every 5 minutes / Hourly / Daily); `resolveWorkflows()` now
selects and displays `schedule` in each row's detail line.

**Operational impact:** one new Function secret (`CRON_SHARED_SECRET`), one
new Vault secret (`cron_shared_secret`, same value), one new pg_cron job
(`workflow-scheduler`, id 2). `execute-workflow`'s `verify_jwt` changed
`true` → `false`. Redeployed `execute-workflow` and `omnilink-port`.

**Verified live, full chain, no shortcuts:** created a real workflow with
`schedule: 'every_5_min'`, called `dispatch_scheduled_workflows()` directly
(rather than waiting for the real 5-minute tick), confirmed via
`net._http_response` that the async POST reached `execute-workflow` and
returned `200`, confirmed a genuine `workflow_runs` row was created with
`status: "success"` and real step output — the cron path authenticated with
only the shared secret, no JWT, and correctly resolved to the workflow's
actual owner. Test workflow deleted afterward so the live recurring cron
job has nothing scheduled to keep re-triggering.

**Out of scope:** only 3 fixed intervals are supported, not arbitrary cron
expressions per workflow — a genuinely flexible per-workflow schedule
(e.g. "every Tuesday at 3pm") would need either a real cron-expression
evaluator in SQL or one `cron.schedule()` call per workflow (dynamic job
management), neither of which was necessary to prove real autonomous
execution works end-to-end.

---

## 9.33 CSP inline-script violation (UI-019/E16) — root-caused to Rocket Loader, IaC fix committed (2026-07-01)

**Root cause, confirmed:** the zone's `script-src 'self' https://static.cloudflareinsights.com
https://cdnjs.cloudflare.com` CSP (no `'unsafe-inline'`, no nonce) already
allowlists `static.cloudflareinsights.com` by host — a normal `<script
src="https://static.cloudflareinsights.com/beacon.min.js">` tag (the
standard Cloudflare Web Analytics snippet) would pass that check without
any violation. The observed failure is specifically an **inline** script
with no `src`, which only one Cloudflare feature injects at the edge:
**Rocket Loader**, which rewrites every `<script>` tag on the page
(including ones that already have a `src`) into its own inline bootstrap
loader. That injected script has no nonce/hash this CSP can recognize, so
the browser correctly blocks it — a documented, known Cloudflare/CSP
incompatibility, not an application bug. (This also explains the
`beforeinstallprompt` banner-suppression side effect logged alongside it —
Rocket Loader's rewrite interferes with the PWA install-prompt script's
normal execution timing.)

**Why this wasn't fixed directly:** disabling Rocket Loader requires a
Cloudflare zone-settings write, and this sandbox has no
`CLOUDFLARE_API_TOKEN` (confirmed absent from the environment — only
`CLOUDFLARE_ACCOUNT_ID` exists, as a Supabase secret name, not a usable
credential here).

**Fix committed as infrastructure-as-code instead:** `terraform/modules/cloudflare/main.tf`
gains `resource "cloudflare_zone_settings_override" "omnihub"` setting only
`rocket_loader = "off"` — every other zone setting is left untouched
(Terraform's `cloudflare_zone_settings_override` only manages settings
explicitly listed in its `settings` block). This is not applied
immediately: `terraform/environments/production`'s `terraform apply` only
runs from `.github/workflows/release.yml`, gated behind an actual release
cut (`ENABLE_SHADOW_DEPLOYMENT`/`ENABLE_ATOMIC_ROUTING_FLIP`) — owner-driven,
same as every other release in this repo. It will take effect on the next
release cut without further action, or an owner can `terraform apply`
`terraform/environments/production` manually sooner.

**Verification performed:** confirmed no `cloudflare_zone_settings_override`
resource existed anywhere in the Terraform tree before this change (so
Rocket Loader was never Terraform-managed — likely toggled on directly in
the dashboard at some point). Confirmed `terraform validate`-equivalent
sanity via the existing `tests/infrastructure/production-domain-alignment.test.ts`
suite (still passes — it doesn't cover this specific resource, but confirms
no syntax-level regression to the Terraform tree this test does parse).
No live `terraform plan`/`apply` was run — no Terraform CLI available in
this sandbox and no Cloudflare credentials to authenticate a plan against
the real zone even if there were.

**Out of scope:** actually running `terraform apply` (owner-gated, requires
`TF_TOKEN_app_terraform_io` / a real release cut) — not something to do
unprompted from a code-authoring session, consistent with how every other
production-release action in this repo is handled.
