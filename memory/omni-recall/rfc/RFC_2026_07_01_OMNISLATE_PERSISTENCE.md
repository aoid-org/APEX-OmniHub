---
rfc: RFC-2026-07-01-omnislate-persistence
status: proposed
author: PRCC-001 execution (Claude Cowork)
date: 2026-07-01
supersedes: none
pr: apexbusiness-systems/APEX-OmniHub#1554
depends_on: apexbusiness-systems/APEX-OmniHub#1552
---

# RFC — OmniSlate chat persistence (PRCC-001 WP-2a)

## Problem
The OmniSlate agent chat held messages only in React `useState`
(`OmniDashShell.tsx` → `OmniSlateWidget`). Every page reload erased the
conversation. For a product positioned as a "Universal Sync Orchestrator" this
is the single most damaging trust break surfaced by the 2026-07-01 production
user-shoes audit (defect #2): the orchestrator could not sync its own primary
surface across a refresh.

## Decision
Persist OmniSlate messages per-user in a new, additive Supabase table and
hydrate on mount.

### Data model
`public.omnislate_messages`
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null check (role in ('user','assistant'))`
- `content text not null` (non-empty)
- `created_at timestamptz not null default now()`
- index `(user_id, created_at)`

### Security (RLS)
- `SELECT` / `INSERT` (`WITH CHECK auth.uid() = user_id`) / `DELETE` restricted
  to the owning user; `service_role` full access.
- No cross-tenant read path. Mirrors the in-production `tenant_entitlements`
  policy pattern (migration `20260623010000`).

### `ON DELETE CASCADE` justification
Chat is user-owned data with no cross-entity fan-out; deleting the auth user
should remove their conversation (GDPR data-minimisation). Allowlisted in the
additive-migration gate on the column line.

### Client behaviour
`OmniSlateWidget` hydrates from `omnislate_messages` on mount, persists both
turns after each successful reply (best-effort, non-blocking — a persist failure
never affects the live conversation), and deletes the user's rows when the chat
is cleared. Demo mode remains fully ephemeral (no hydrate / no persist).

## Alternatives considered
- **`localStorage`** — rejected: not cross-device, not governed, invisible to
  audit; contradicts the platform's server-of-record posture.
- **Reuse `agent_sessions`** — rejected: that table stores session *status*
  only (no message rows); overloading it would blur its contract.
- **One row per session with a JSONB message array** — rejected: append-per-row
  is simpler to RLS, index, and paginate, and avoids read-modify-write races.

## Blast radius / rollback
Additive only (`CREATE TABLE IF NOT EXISTS`, new index, new policies); no
existing object altered. Rollback = drop the single new migration; the widget
degrades to prior ephemeral behaviour (load returns nothing, persists are
best-effort no-ops). No impact to edge functions, secrets, or orchestrator.

## Validation
- Migration parses clean under libpg_query and executes in a rolled-back
  transaction dry-run.
- Passes additive-migration gate (CASCADE allowlisted) and ops-doc-drift guard
  (§9.27).
- Frontend build is authoritative in CI (local build blocked by
  platform-mismatched node_modules in the execution sandbox).

## Follow-ups (out of scope here)
- WP-2b provider-connection persistence (credential capture — needs owner
  decision on Vault / BYOM proxy / owner-entered keys).
- WP-2c/2d ecosystem-app + KPI persistence to existing tables.
- Realtime channel repoint for the OmniTrace feed (separate SoT decision).
