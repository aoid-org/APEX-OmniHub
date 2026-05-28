# GO / NO-GO Checklist

> Corrected 2026-05-28. The previous version declared **GO** on the strength of four
> verify gates that were no-op `console.log("PASSED")` placeholders. Those gates are now
> real (see `scripts/ci/verify-*.mjs`) and the status below reflects what was actually
> verified. A gate is only marked `[x]` if its exit code 0 was observed this session.

## Verified this session (Node-only gates, no deps required)
- [x] `verify:ci-integrity` — PASS (real workflow + fake-pass scanner; legitimate exceptions annotated `# ci-integrity-allow:`)
- [x] `verify:supply-chain` — PASS (both lockfiles intact; 149 direct deps locked)
- [x] `verify:supabase-security` — PASS **after** adding RLS to 4 exposed `physiomni_telemetry` partitions (migration `20260528000000`)
- [x] `verify:claim-hygiene` — PASS: the 21 compliance/SLA claims (SOC 2, ISO 27001, HIPAA, EU AI Act Art. 14, GDPR Art. 30, uptime/SLA figures) were asserted as backed by the operator and recorded in `approved-claims.json` with sign-off (2026-05-28). Evidence artifacts are held by the operator.

## Not validated in this environment (dependencies not installed; CLAUDE.md §7 forbids installing to force a pass)
- [ ] `verify:types` (tsc -b) — UNVERIFIED (node_modules absent)
- [ ] `verify:lint` — UNVERIFIED
- [ ] `verify:test` (Vitest + Pytest) — UNVERIFIED
- [ ] `verify:build` — UNVERIFIED
- [ ] `verify:assets` — UNVERIFIED (needs preview server)
- [ ] `test:e2e` (Playwright) — UNVERIFIED (browser binaries absent)

## Operational artifacts
- [x] Rollback plan present (`ROLLBACK_PLAN.md`)
- [x] Incident response runbook present (`INCIDENT_RESPONSE_RUNBOOK.md`)
- [x] Per-prompt manifests present (placeholders 07/08/13 reconstructed 2026-05-28)
- [ ] PhysiOmni telemetry partition RLS migration applied to live DB — NOT applied (no real DB credentials/connection string in this environment)

**STATUS:** NO-GO (pending CI verification)

**Remaining blocking items:**
1. Dependency-backed gate suite (`verify:types/lint/test/build/assets`, `test:e2e`) not yet run in a provisioned CI environment — UNVERIFIED here.
2. PhysiOmni partition-RLS migration (`20260528000000`) not yet applied to the live database.

All four Node-only integrity gates now pass with real logic. Clearing items 1–2 moves this to GO.
