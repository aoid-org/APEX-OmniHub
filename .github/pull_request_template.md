## Summary
<!-- What changed and why -->

## ⚖️ Operational source-of-truth (LAW — required)
`docs/APEX_AGENT_OPERATIONS.md` is operational infrastructure, not paperwork.

- [ ] This PR changes a **service, environment variable, database table, or start command** → I updated `docs/APEX_AGENT_OPERATIONS.md` **in this same PR**.
- [ ] OR: this PR makes no such change (no doc update required).

## Verification
- [ ] Smoke test passed (`bun run ./scripts/test-gateway.ts` or equivalent) — paste trace IDs
- [ ] Any DB migration is applied **and tracked** in `supabase_migrations.schema_migrations`
