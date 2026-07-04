---
version: 1.0.0
last_audited: 2026-07-01
status: verified
---

# RFC: Real Autonomous Workflow Execution via pg_cron (not Temporal)

Status: Approved
Owner: APEX Platform
Date: 2026-07-01
Related Tickets: /pull/1549
Affected Domains: Workflows, Edge Functions, Database

---

## 1. Problem

`WorkflowsModule`'s "Trigger Run" button was wired to real, user-initiated
execution earlier in the same PR (`execute-workflow` edge function), but
execution was manual-only — nothing fired automatically. The `workflows`
table already has an unused `schedule TEXT` column dating back to its
original migration, implying autonomous scheduling was always intended but
never built.

## 2. Exact User

Any authenticated OmniDash user who creates a workflow and wants it to run
on its own (e.g. a recurring notification, a periodic webhook ping) instead
of remembering to click Trigger Run.

## 3. Workflow

Create a workflow → optionally pick a schedule (Every 5 minutes / Hourly /
Daily) instead of "Manual only" → it runs itself going forward, same steps
and same executor as a manual run.

## 4. Current Pain

Zero autonomous execution existed. The only prior candidate path
(`trigger-workflow` → orchestrator `module.workflows.trigger_run` intent)
was checked and found dead: **no `module.*` intent is registered anywhere
in the orchestrator's `intent_registry.py`** (only `system.health_check`,
`system.echo`, `system.list_intents`). Routing scheduled execution through
that path today would produce a real "Intent not registered" error on every
attempt.

## 5. Current Workaround

None — user has to remember to click Trigger Run every time.

## 6. Proposed Change

Two real options were identified and presented to the user for a decision
(not silently picked):

1. **New step-executor edge function** (chosen) — extend the already-proven
   `execute-automation` pattern; a workflow's steps are the exact same
   `{action_type, config}` shape as an automation action, run in sequence.
   Entirely within Supabase edge functions + `pg_cron`/`pg_net`, both
   confirmed enabled on the production project. No orchestrator involvement.
2. **Register a real Temporal intent** — bigger, touches the Python/Temporal
   codebase and a separate Render deploy target.

User selected option 1 explicitly ("OPTION 1").

**Implementation:**
- `workflows.schedule` constrained to `'every_5_min' | 'hourly' | 'daily'`
  (CHECK constraint, NULL/manual unaffected) —
  `supabase/migrations/20260701200000_workflow_scheduler.sql`.
- `public.dispatch_scheduled_workflows()` (`SECURITY DEFINER`, `search_path`
  pinned): runs every 5 minutes via `cron.schedule('workflow-scheduler',
  '*/5 * * * *', ...)`, finds active/scheduled/due workflows (due = no run
  yet, or last run older than the preset's interval), fires an async
  `net.http_post` to `execute-workflow` per workflow. As of
  `supabase/migrations/20260704230000_workflow_scheduler_vault_project_url.sql`,
  the Edge Function base URL is read from the per-environment Vault secret
  `project_url` instead of being hardcoded in migration SQL.
- `execute-workflow` gains a second auth path: `X-Cron-Secret` header
  matching `CRON_SHARED_SECRET` (a Function secret), used instead of a user
  JWT. The workflow is looked up **by id only** on that path (no user to
  scope by yet), then its own row `user_id` is used for every subsequent
  operation.

## 7. Business Capability

Workflows / Automation.

## 8. Ownership Boundary

Owned by the Workflows domain (`supabase/functions/execute-workflow`,
`omnilink-port`'s `resolveWorkflows`, `WorkflowsModule.tsx`). Calls the
shared `_shared/action-executor.ts` (owned jointly with Automations —
already shared before this change). Does not call the orchestrator, does
not call Temporal, does not touch any other domain's tables.

## 9. Data Flow

`pg_cron` (every 5 min, in-database, no external caller) → SQL function
queries `workflows`/`workflow_runs` (read-only for the "is it due" check)
→ `net.http_post` (async, fire-and-forget from the SQL function's
perspective) → `execute-workflow` edge function → shared executor runs each
step for real (webhook / notification / send_email / create_record,
identical to a manual run) → writes a real `workflow_runs` row
(`status`, `logs`, `error_message`).

## 10. Contracts

- New DB constraint: `workflows_schedule_preset_check`.
- New DB function: `public.dispatch_scheduled_workflows()`.
- New cron job: `workflow-scheduler` (`cron.job`, id 2).
- New Function secret: `CRON_SHARED_SECRET`.
- New Vault secret: `cron_shared_secret` (same value, read by the SQL
  function so the plaintext secret is never embedded in the committed
  migration file or visible in `cron.job`'s stored command text).
- New Vault secret: `project_url` (per-environment Supabase project URL used
  as the base for `execute-workflow`; required to avoid staging/recovery cron
  dispatching to the production project URL).
- Changed: `execute-workflow`'s `supabase/config.toml` entry,
  `verify_jwt: true → false` (own internal auth now handles both callers —
  same pattern `omnilink-port` already uses).

## 11. Failure Modes

- **Vault secret missing/misconfigured:** `dispatch_scheduled_workflows()`
  raises a `WARNING` and returns without calling anything when either
  `project_url` or `cron_shared_secret` is missing — fails closed, no requests
  sent, visible in Postgres logs.
- **`execute-workflow` unreachable/erroring:** `net.http_post` is
  fire-and-forget; failures are visible in `net._http_response` (used
  during verification) but the cron job itself never fails or blocks on
  them — one workflow's failure can't stall the scheduler.
- **A step fails mid-run:** identical to the manual path — fail-fast,
  `workflow_runs.status = 'failed'`, real `error_message`, earlier steps'
  results preserved in `logs`. Verified live with a deliberately
  SSRF-blocked webhook step.
- **Cron secret leaked:** blast radius is bounded — it only allows
  triggering *existing* workflow rows by id (each already scoped to its
  owner's `user_id` inside the row), not arbitrary DB access. This is why a
  narrow shared secret was used instead of passing the service-role key
  through as a bearer token.

## 12. Observability

`cron.job_run_details` (pg_cron's own run history), `net._http_response`
(pg_net's response log, used directly during verification), and
`workflow_runs` rows themselves are the audit trail — every scheduled
execution leaves the same real row a manual run would.

## 13. Rollback Strategy

`SELECT cron.unschedule('workflow-scheduler');` stops all future scheduled
firing immediately (no in-flight state to worry about — `net.http_post` is
async and per-invocation). Setting `execute-workflow`'s `verify_jwt` back to
`true` in `config.toml` and redeploying would also close the cron path
entirely (the shared-secret branch would then be unreachable at the
platform level). No data migration needed to roll back — `schedule` simply
stops being read if the cron job is unscheduled.

## 14. Security Impact

New system-to-system trust boundary (pg_cron → edge function). Mitigated
by: shared secret (not the service-role key) scoped to only this one
capability; secret stored in Vault, not in committed source or plaintext
`cron.job` command text; cron-authenticated calls are hard-scoped to the
target workflow's own owner, never an arbitrary or attacker-supplied
user id (the row's `user_id` is read from the DB, not accepted as a
request parameter on the cron path).

## 15. Scalability Impact

Bounded by design: fixed 3 presets (not arbitrary per-workflow cron
expressions), one poll every 5 minutes, `MAX_STEPS = 10` per workflow
(pre-existing limit, unchanged). No unbounded fan-out — the dispatcher
loops over a `WHERE`-filtered set of due workflows per tick, not the full
table.

## 16. AI Impact

None directly — this is user-configured scheduling of user-authored
workflow steps, not an AI decision-making path.

## 17. IN SCOPE

- Three fixed schedule presets, real end-to-end execution, real failure
  handling, frontend schedule picker.

## 18. OUT OF SCOPE

- Arbitrary per-workflow cron expressions (would need either a SQL
  cron-expression evaluator or one dynamic `cron.schedule()` call per
  workflow).
- Registering real Temporal intents in the orchestrator (the alternative
  option the user did not choose).

## 19. Success Metrics

A scheduled workflow executes without any user interaction and produces
the same real, verifiable result a manual "Trigger Run" click would.
Verified live this pass (see PR #1549 description / §9.32 in
`docs/APEX_AGENT_OPERATIONS.md`).

## 20. Architecture Review Checklist

- [x] No god object introduced
- [x] Domain boundary preserved (Workflows domain only; shared executor
      already shared with Automations before this change)
- [x] Cross-domain database writes avoided
- [x] Contracts documented (§10)
- [x] Rollback path defined (§13)
- [x] Observability defined (§12)
- [x] Failure modes defined (§11)
- [x] Security impact reviewed (§14)
- [x] Performance impact reviewed (§15)
- [x] Scope boundaries explicit (§17/§18)
- [x] User workflow improvement clear (§3)

## 21. Approval

Architecture Reviewer: APEX Platform / 2026-07-01
Operations Reviewer: APEX Platform / 2026-07-01
