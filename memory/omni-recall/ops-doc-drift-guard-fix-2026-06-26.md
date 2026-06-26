# Ops Doc Drift Guard Fix — 2026-06-26

- CI failure: `scripts/ci/check-ops-doc-drift.mjs` correctly failed because prior remediation changed workflow/package operational critical paths without updating `docs/APEX_AGENT_OPERATIONS.md`.
- Fix: added §9.19 documenting fail-closed Supabase env behavior for release/staging/mobile/lighthouse workflows, dependency branch-update-only automation, `npm run release:validation-matrix`, and the extended CI integrity scanner.
- Validation target: after commit, `node scripts/ci/check-ops-doc-drift.mjs` should pass when compared against the PR base because `docs/APEX_AGENT_OPERATIONS.md` is now changed alongside the critical files.
