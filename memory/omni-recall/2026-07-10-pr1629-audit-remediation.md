# Canonical State Record - 2026-07-10 (PR #1629)

Authoritative snapshot of repo state after the P0/P1 audit remediation. Code is
the source of truth; where prior docs disagree, this record supersedes them.

## 1. Remediated surfaces (now canonical behavior)

| Surface | File | Canonical behavior after PR #1629 |
|---|---|---|
| Scheduler dispatch | `supabase/migrations/20260710123000_workflow_scheduler_revoke_public_execute.sql` | `public.dispatch_scheduled_workflows()` (SECURITY DEFINER) has `EXECUTE` revoked from `PUBLIC`/`anon`/`authenticated`. Only pg_cron (job owner) invokes it. |
| Notification action | `supabase/functions/_shared/action-executor.ts` | `executeNotification` is NOT a working delivery path. It throws `NOT_IMPLEMENTED` and must never return `sent:true` without a durable receipt. Re-enable only by routing through `send-push-notification`. |
| Module state badge | `apps/omnihub-site/src/hooks/useOmniModuleState.ts` | Backend envelopes with `ok:false` or `State/state` in {Error, Unavailable, NoSubscription} map to `stateKind:'unavailable'`, never `'live'`. |
| Audits Zero-Trust | `apps/omnihub-site/dashboard/components/modules/AuditsModule.tsx` | The Zero-Trust compliance line does NOT pass from `import.meta.env.PROD`. It reports `pass:false` with 'requires server-side attestation'. |

## 2. Verified code-vs-doc drift (code is authoritative)

- **Package manager: Bun, not npm.** `package.json` declares `"packageManager": "bun@1.3.14"`. Any doc asserting "npm is authoritative" is stale.
- **Links persists to Supabase.** `LinksModule.tsx` calls `supabase.from('omnilink_links').insert(...)`. Links is NOT local-only; update any doc that says so.

## 3. UNVERIFIED this pass (do not treat as canonical until checked)

- SkillForge skill cap (3 vs 5) and provider preference (Anthropic vs Groq): the audit
  reports 5-skill cap + Groq, but `skill-provider.ts` / `CANONICAL_TRUTH.md` were not
  located/read in this pass. Required evidence: read the actual SkillForge provider
  module before editing canon.

## 4. Outstanding follow-ups (not yet code-fixed)

- P1 media/file quota broker (server-issued upload reservation before storage write).
- P1 make deployed-Edge-Function verification + authenticated backend E2E blocking release gates.
- P1 canonical Edge Function deployment manifest (replace hand-maintained deploy lists).
- P2 full `CANONICAL_TRUTH.md` reconciliation (SkillForge cap, provider, Links, Bun/npm).
- Dependency: `ws` advisory (small-fragments OOM) - bump `ws` >= 8.21.0 / 7.5.11 / 6.2.4 / 5.2.5.

## 5. Provenance

PR #1629, branch `fix/audit-p0p1-honesty-remediation-20260710`. Branch was built via
the GitHub data API from `main` because the local mounted repo had a locked/corrupted
`.git` index and truncated working-tree copies. CI on the PR is the authoritative
compile/gate check.
