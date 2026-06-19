# APEX Agent — Production Restoration Evidence (2026-06-19)

**Verdict:** restored to LIVE / demo-ready, verified end-to-end via `https://apexomnihub.icu/api/mcp/invoke`.
**Tag:** `agent-production-restored-2026-06-19`

## Fix commits (already on `main`)
`60b080c` `e28b1da` `4c8d100` Temporal API-key auth · `5c8969d` slowapi dep · `be04b92` semantic-cache gate ·
`c058afff` register completion activity · `b10aaa72` policy-loader resilience ·
`4e92b8a` `310221c` `a7ecf50` `6eaff80` respond_to_user · `49a8393f` omni_policies provision ·
`f03b423` `74dfce5` operations doc.

## Smoke results (live, authenticated)
| traceId | terminal | note |
|---|---|---|
| `61ce8dce` | completed | first full end-to-end success |
| `861d9f0c` | completed | first real LLM reply |
| `da6e7fe5` | completed | verified WITH omni_policies enforcing |
| `512eb247` | failed (diagnostic) | exposed missing omni_policies table |

Sample reply (`da6e7fe5`): "APEX-OmniHub is an AI-powered task planning and execution system that
orchestrates multi-step workflows using various tools and services, and yes, the agent is currently
online and ready to assist you."

## Verified
SSE `queued -> running -> completed`, `200 text/event-stream`, no 429/500/timeout/system-error.
agent_runs: completed->agent_response+end_time; failed->error_message+end_time; metadata.source="omniport_gateway".
Governance: 7 omni_policies active (deny destructive/secret, defer PII/deletes, allow rest).

## Migration history baseline — 2026-06-19
Production schema objects existed while migration history was empty/untracked
(`supabase_migrations.schema_migrations` = 0 applied, despite every migration's objects
being live). All **89** migrations were **baselined as applied without re-running SQL** and
**without touching any data**, aligning `schema_migrations` with the live schema.
`omni_policies` confirmed tracked and live with 7 policies. Repo now holds 90 migration
files (89 baselined + `20260619211500_omni_policies.sql`, same-day provision).

**DB count verification:** unavailable in this Claude Code session (no DB connection string;
`supabase_migrations` not exposed via PostgREST). Baseline recorded from restoration
session evidence; repo migration-file count (90) verified locally.

**Future rule:** never blindly run the full migration stack against production; use
migration repair/baseline on history drift (mark applied, do not re-run SQL); only apply
new additive/idempotent migrations; before any `supabase db push` verify both live objects
and migration-history tracking. Never `supabase db reset` or disable RLS against production.
