---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Runtime Remediation Call Graph

- Baseline commit: `bfd5f0c044778d5f788bc319b99084bd660ff736`
- Inventory date: 2026-05-08 UTC

## Files inspected

- `apps/omnihub-site/src/hooks/useOmniModuleState.ts`
- `apps/omnihub-site/dashboard/components/modules/ModuleShell.tsx`
- `supabase/functions/trigger-workflow/index.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/event-ingress-adapter.ts`
- `supabase/functions/generate-business-skills/index.ts`
- `supabase/functions/_shared/rate-limit.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/execute-automation/index.ts`
- `supabase/functions/_shared/ssrf-protection.ts`
- `src/core/orchestrator/Veritas.ts`
- `src/core/orchestrator/ApexOrchestrator.ts`
- `src/armageddon/types.ts`
- `src/armageddon/workflows/level7.ts`
- `src/armageddon/activities/level7.ts`
- `src/scripts/certify-armageddon.ts`
- `.github/workflows/ci-runtime-gates.yml`
- `package.json`

## A1/A2 before call graph

```text
Browser ModuleShell/useOmniModuleState.triggerModuleAction
  -> supabase.functions.invoke('trigger-workflow', {
       module_key, action_id, selected_items, user_id
     })
  -> trigger-workflow withHttp(requireOrigin only)
  -> authenticateUser(req)  # wrong shared helper signature
  -> validatePayload(goal-only query/session_id/trace_id/idempotency_key)
  -> invalid_payload before intent/module routing
```

## A1/A2 after call graph

```text
Browser triggerModuleAction
  -> supabase.functions.invoke('trigger-workflow', {
       kind: 'module_action', module_key, action_id, selected_items,
       trace_id, idempotency_key
     })
  -> trigger-workflow withHttp(requireAuth=true, requireOrigin=true, 256 KiB)
  -> ctx.user from shared bearer validation
  -> branch validation:
       module_action -> server tenant fallback authUser.id -> canonical intent event
       intent        -> server tenant override authUser.id -> canonical intent event
       goal          -> legacy goal validation -> /api/v1/goals
  -> signed orchestrator dispatch
```

## Edge function auth strategy

`trigger-workflow` now relies on `withHttp(..., { requireAuth: true })`, which validates the Authorization bearer token through the shared auth helper and exposes `ctx.user`. The handler explicitly fails closed if `ctx.user` is absent.

## Rate-limit strategy

Public onboarding generation uses the existing Upstash-backed `checkRateLimit` utility with `RATE_LIMIT_CONFIGS.publicOnboardingGenerate` (`3` requests per hour). The shared limiter already fails closed when Upstash configuration or calls fail; stale fail-open comments were corrected.

## Automation ownership model

`execute-automation` uses the service-role Supabase client only after bearer auth. Automation fetches and timestamp updates are scoped by both `id` and `user_id`. `create_record` injects the authenticated `user_id` and rejects mismatched client-provided owners. Unsafe generic targets (`users`, `audit_logs`) were removed from the allowlist.

## Veritas commit-gate model

`ApexOrchestrator` acquires an idempotency lock, executes the tool, validates the raw result with Veritas, and commits only when Veritas accepts. Veritas now rejects unknown tools, rejects `success !== true` for success-flag tools, and requires durable persisted IDs for `create_record`.

## Armageddon CI evidence strategy

Full Level 7 certification remains in `src/scripts/certify-armageddon.ts` and requires Temporal plus Supabase telemetry. CI now runs `SIM_MODE=true bun run armageddon:certify:ci`, which produces `artifacts/armageddon/latest.json` with deterministic reduced-iteration evidence, explicit `ci-sim` mode, Temporal/Supabase usage flags, verdict, and limitations. The historical full certification report is not overwritten.
