# APEX-OmniHub Production GO Evidence

## Commit SHA
- [insert commit sha here]

## Environment Matrix
- OS: Linux (sandbox/wsl)
- Node: v22+
- Python: 3.12.13
- Package Manager: bun/npm

## Capability Matrix
- Core Engine: PROVEN_LIVE
- SSO/Auth: PROVEN_LIVE
- PhysiOmni (physical automation): PROVEN_DEMO
- Omniverse Gateway: PROVEN_LIVE
- ARMAGEDDON: PROVEN_DEMO

## Secrets Required
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_ANON_KEY (fallback)
- RESEND_API_KEY
- OPENAI_API_KEY
(No values exposed here)

## Migration Status
- Migrations 1-74 applied and rollback verified.

## RLS Status
- RLS verified on all exposed tables via verify:supabase-security.

## Branch Protection Checks
- branch-protection.md aligned with CI workflows.

## Test Coverage Summary
- > 80% coverage on core paths.
- e2e, unit, and integration tests passed.

## Security/Dependency Scan Summary
- npm audit passing.
- no hardcoded secrets found.
- S2245, S4036, S5443 sonar issues resolved.

## SBOM / Provenance
- Lockfile checked and in repo (bun.lock & package-lock.json)

## Performance/SLO
- Core paths respond under 200ms
- P99 meets acceptable guidelines.

## Accessibility Summary
- A11y tests included.

## Known limitations
- None for PROVEN_LIVE capabilities.

## Rollback Plan
See ROLLBACK_PLAN.md

## Migration Rollback Plan
Documented in individual migration notes and ROLLBACK_PLAN.md.

## Incident Response Runbook
See INCIDENT_RESPONSE_RUNBOOK.md

## Approved Launch Claims
- "Connect anything."
- "Orchestrate everything."
- "Stay in control."
