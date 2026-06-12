---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Runtime Remediation Results

## Issue IDs resolved

- A1: OmniDash module actions now send an explicit `kind: module_action` payload and no client `user_id`.
- A2: `trigger-workflow` uses the shared `withHttp` authenticated context instead of the invalid auth helper call.
- B1: Public onboarding generation is method/origin/body/input/rate limited before Anthropic and provider errors are sanitized.
- D1: Automation execution is scoped to the authenticated owner while using the service-role client.
- E1: Veritas fails closed for unknown tools and failed success flags.
- F1: Armageddon CI-safe evidence generation was added without fake full certification claims.

## Exact files changed

- `.github/workflows/ci-runtime-gates.yml`
- `apex-resilience/tests/iron-law-concurrency.spec.ts`
- `apex-resilience/tests/iron-law.spec.ts`
- `apps/omnihub-site/src/hooks/useOmniModuleState.ts`
- `docs/audits/RUNTIME_REMEDIATION_CALL_GRAPH.md`
- `docs/audits/RUNTIME_REMEDIATION_RESULTS.md`
- `package.json`
- `src/core/orchestrator/Veritas.ts`
- `src/scripts/certify-armageddon-ci.ts`
- `supabase/functions/_shared/event-ingress-adapter.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/rate-limit.ts`
- `supabase/functions/execute-automation/index.ts`
- `supabase/functions/generate-business-skills/index.ts`
- `supabase/functions/trigger-workflow/index.ts`
- `tests/core/orchestrator/ApexOrchestrator.spec.ts`
- `tests/core/orchestrator/Veritas.spec.ts`
- `tests/runtime-remediation.spec.ts`

## Tests added or patched

- Added source-level runtime remediation guard tests in `tests/runtime-remediation.spec.ts`.
- Patched Veritas tests to encode fail-closed unknown-tool and strict success behavior.
- Patched ApexOrchestrator tests to prove rollback on Veritas rejection and duplicate idempotency cache reuse after commit.
- Patched Apex resilience tests to use `crypto.randomUUID()` instead of an unresolved transitive `nanoid` import.

## Command output summary

- `git status --short`: baseline clean before changes.
- `git rev-parse HEAD`: `bfd5f0c044778d5f788bc319b99084bd660ff736`.
- `bun install --frozen-lockfile`: failed with registry `403` responses for multiple packages; existing `node_modules` were used for subsequent checks.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run test`: passed (`204` files passed, `4` skipped; `2393` tests passed, `85` skipped).
- `bun run test:coverage`: passed (`204` files passed, `4` skipped; coverage reporter emitted a zeroed aggregate table without failing).
- `bun run secret:scan`: passed.
- `bun run build`: passed with expected build-guard warnings for missing local Supabase env vars.
- `bun run armageddon:certify:ci`: failed closed without `SIM_MODE=true` as expected.
- `SIM_MODE=true bun run armageddon:certify:ci`: passed and wrote `artifacts/armageddon/latest.json` locally; the path is gitignored and uploaded by CI.

## Skipped tests with reason

Integration suites intentionally skipped by test configuration remained skipped: database integration, storage integration, Maestro backend, and paid-access integration. Initial baseline `bun run test` failed before remediation because `apex-resilience` tests imported unresolved `nanoid`; those imports were replaced with built-in `crypto.randomUUID()`.

## Residual risks

- `trigger-workflow` uses `authUser.id` as tenant fallback because no authoritative tenant membership lookup was verified in this edge contract.
- Module action intent support ultimately depends on the orchestrator `/api/v1/intents` contract accepting `module.<module_key>.<action_id>` intents.
- Full Armageddon certification still requires provisioned Temporal and Supabase telemetry and is intentionally not claimed by CI simulation.

## Rollback plan

- Revert `.github/workflows/ci-runtime-gates.yml` to remove secret scan and Armageddon artifact upload steps if CI orchestration regresses.
- Revert `apps/omnihub-site/src/hooks/useOmniModuleState.ts` to restore the previous module action body, acknowledging A1 would return.
- Revert `supabase/functions/trigger-workflow/index.ts` and `supabase/functions/_shared/event-ingress-adapter.ts` together to restore legacy trigger behavior, acknowledging A1/A2 would return.
- Revert `supabase/functions/generate-business-skills/index.ts` and `supabase/functions/_shared/rate-limit.ts` together to restore previous public onboarding behavior, acknowledging B1 would return.
- Revert `supabase/functions/execute-automation/index.ts` to restore prior automation execution behavior, acknowledging D1 would return.
- Revert `src/core/orchestrator/Veritas.ts` plus the orchestrator tests to restore fail-open validation, acknowledging E1 would return.
- Revert `src/scripts/certify-armageddon-ci.ts` and `package.json` to remove CI evidence generation, acknowledging F1 would return.
- Revert `apex-resilience/tests/iron-law*.spec.ts` only if `nanoid` becomes a direct dependency again.
- No database migrations were added, so there are no database rollback steps.
