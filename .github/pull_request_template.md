## Summary
<!-- What changed and why -->

## ⚖️ Operational source-of-truth (CI-enforced)
`docs/APEX_AGENT_OPERATIONS.md` is operational infrastructure, not paperwork.

> **Enforced in CI** by the **Ops Doc Guard** workflow
> (`.github/workflows/ops-doc-guard.yml` → `scripts/ci/check-ops-doc-drift.mjs`):
> if this PR changes a deployed service, env var, DB table/migration, or start
> command without updating `docs/APEX_AGENT_OPERATIONS.md`, the check **fails**.

- [ ] This PR changes a **service, environment variable, database table, or start command** → I updated `docs/APEX_AGENT_OPERATIONS.md` **in this same PR**.
- [ ] OR: this PR makes no such change (no doc update required).

## Verification
- [ ] Smoke test passed (`bun run ./scripts/test-gateway.ts` or equivalent) — paste trace IDs
- [ ] Any DB migration is applied **and tracked** in `supabase_migrations.schema_migrations`
