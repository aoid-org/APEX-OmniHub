---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# RFC: Skill Entitlement Database-Level Enforcement (TOCTOU Race Closure)

Status: Review
Owner: APEX Platform Engineering
Date: 2026-06-10
Related Tickets: PR #1375 (branch claude/friendly-goodall-6bb4uc)
Affected Domains: Supabase migrations, Supabase Edge Functions, Skill Forge monetization gate

---

> **Update 2026-06-22 — free cap raised 3 → 5.** The BASIC free cap is now **5**
> active generated skills (the 6th generation is paywalled with HTTP 402), set by
> `supabase/migrations/20260622000000_skill_entitlement_free_cap_5.sql`. That
> migration `CREATE OR REPLACE`s both `check_skill_entitlement` and
> `enforce_skill_entitlement` with `max_limit := 5`, preserving the atomic
> advisory-lock enforcement, the `SECURITY DEFINER`/`search_path` contract, and
> the trigger EXECUTE lockdown described below. The TOCTOU analysis is unchanged;
> only the cap value moved. The "Problem"/"Current Pain" narrative below is the
> historical record of the original cap-3 race that motivated the trigger.

---

## Problem

The Skill Forge monetization gate enforced the 3-skill BASIC cap only in the edge function: a read (`check_skill_entitlement` RPC) followed by a separate insert into `user_generated_skills`. Concurrent requests racing between the check and the insert could each pass the gate and exceed the cap — a classic time-of-check-to-time-of-use (TOCTOU) violation with direct revenue impact on the Pilot Trap conversion model.

## Exact User

Free-tier (BASIC) APEX OmniHub users forging skills through the SkillForge wizard, and revenue/security reviewers responsible for proving the entitlement cap cannot be bypassed.

## Workflow

A user submits the 3-step SkillForge wizard; the `generate-business-skills` edge function authenticates, checks entitlement, generates the skill via the Anthropic API, and inserts into `user_generated_skills`.

## Current Pain

Reviewers could not prove the 3-skill cap held under concurrency. Two simultaneous forge requests from a user with 2 active skills could both observe `current=2 < 3` and both insert, yielding 4 active skills on the free tier.

## Current Workaround

None. The application-level check was the only enforcement; correctness depended on requests not racing.

## Proposed Change

Migration `20260610000000_skill_entitlement_db_enforcement.sql` adds a `BEFORE INSERT OR UPDATE OF is_active` trigger (`trg_enforce_skill_entitlement`) on `public.user_generated_skills`. The trigger function (`SECURITY DEFINER`, `search_path = public`) takes `pg_advisory_xact_lock` keyed on the user id to serialize per-user active-skill writes, re-counts active skills inside the same transaction as the write, and raises `LIMIT_REACHED: ...` when the tier cap (BASIC=5 as of 2026-06-22, PRO=999999) is exceeded. The edge function maps this exception to the existing HTTP 402 `LIMIT_REACHED` contract, so the client-facing behavior is unchanged.

## Business Capability

This supports Monetization Integrity (the Pilot Trap), Tenant Fairness, and Auditability.

## Ownership Boundary

Platform Engineering owns the entitlement trigger. The edge function remains the optimistic first gate; the database trigger is the authoritative enforcement. No client, edge function, or LLM output can bypass it — the cap holds for any write path into `user_generated_skills`.

## Data Flow

Forge input flows from the wizard to `generate-business-skills`, through the JWT auth gate and the optimistic `check_skill_entitlement` RPC, to the Anthropic generation call, then to the insert. The insert passes through `trg_enforce_skill_entitlement`, which acquires the per-user advisory lock, recounts active skills, and either admits the row or raises `LIMIT_REACHED`, which the edge function returns as HTTP 402.

## Contracts

`enforce_skill_entitlement()` is a trigger function: `SECURITY DEFINER`, `SET search_path = public`, `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated` (CANONICAL_TRUTH fact 8). Inactive rows (`is_active IS DISTINCT FROM true`) bypass the count. The exception message is prefixed `LIMIT_REACHED:` — the edge function's 402 mapping depends on that prefix.

## Failure Modes

Cap exceeded: the transaction aborts with `LIMIT_REACHED`, no row is written, and the user receives the standard 402 upgrade prompt. Missing `user_entitlements` record: tier defaults to BASIC (cap 5 as of 2026-06-22), matching the RPC's behavior. Advisory lock contention: concurrent requests for the same user serialize; throughput for distinct users is unaffected because locks are keyed per user id.

## Observability

Trigger rejections surface as insert errors in the edge function logs with the `LIMIT_REACHED` prefix. Existing Supabase logging and the 402 response contract are preserved; no new telemetry surface is introduced.

## Rollback Strategy

The migration is additive (trigger + function; the single REVOKE carries an `additive-allow` annotation). Rollback is `DROP TRIGGER trg_enforce_skill_entitlement ON public.user_generated_skills` and `DROP FUNCTION public.enforce_skill_entitlement()`, which restores the prior application-only enforcement without data changes.

## Architecture Review Checklist

- [x] No god object introduced
- [x] Domain boundary preserved
- [x] Cross-domain database writes avoided
- [x] Contracts documented
- [x] Rollback path defined
- [x] Observability defined
- [x] Failure modes defined
- [x] Security impact reviewed
- [x] Performance impact reviewed
- [x] Scope boundaries explicit
- [x] User workflow improvement clear

## Approval

Product Owner: Pending / 2026-06-10
Architecture Reviewer: Pending / 2026-06-10
Security Reviewer: Pending / 2026-06-10
Operations Reviewer: Pending / 2026-06-10
