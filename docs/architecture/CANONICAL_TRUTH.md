# Canonical Truth File — Platform Topology & Deployment

**Version:** 1.2.0
**Last Updated:** 2026-05-06
**Owner:** Platform Architecture

## Source of Truth Statements

1. Frontend runtime is React 18.3.1 + Vite 7.
2. `src/App.tsx` is a shim that re-exports `apps/omnihub-site/src/App.tsx`.
3. Supabase Edge Functions under `supabase/functions/` are the canonical edge API layer.
4. Orchestrator runtime boundary: `orchestrator/main.py` (worker) vs `orchestrator/server.py` (API).
5. CI authority for gates: `.github/workflows/ci-runtime-gates.yml`.
6. Current production web deployment topology is Cloudflare Pages aligned.
7. Production Supabase project: `rtopreovkywofgwgmozi` (ca-central-1). All public-schema tables have RLS enabled as of 2026-05-04. Migrations are applied via Supabase MCP. See `docs/infrastructure/SUPABASE_SETUP.md` for full security posture.
8. All SECURITY DEFINER functions in the public schema must have: (a) `search_path` pinned to `public`, (b) EXECUTE revoked from `anon` at minimum. Trigger and maintenance functions also revoke `authenticated`. Business-logic functions retain `authenticated` + `service_role` access.
9. OmniBridge persistence layer (`omnibridge_events`, `omnibridge_events_dlq`, `omnibridge_control_audit`) is live in production as of v1.6.1 (2026-05-04). The `app_role` enum contains only `admin` and `user` — do not reference `super_admin` or `operator` in RLS policies.
10. **Package manager is bun.** `bun install` is authoritative for all installs. npm is used only for `npm audit`. Lockfile policy: both `bun.lock` and `package-lock.json` are committed. `package-lock.json` is required by CI `npm audit` steps and must never be gitignored or deleted.
11. **TypeScript version is 5.9.x.** `ignoreDeprecations` must be `"5.0"`. The value `"6.0"` is invalid in TypeScript 5.x and causes `TS5103: Invalid value` breaking all TSC-dependent CI gates.
12. **`tsconfig.json` must be valid JSON.** `//` and `/* */` comments are not valid JSON. `tests/quality/platform-quality-gates.test.ts` parses `tsconfig.json` with `JSON.parse()` — any comment will throw `SyntaxError` and fail Gate 6.
13. **Path alias split is intentional and load-bearing.** `vite.config.ts` resolves `@/*` → `./apps/omnihub-site/src/*`. `vitest.config.ts` resolves `@/*` → `./src/*`. Do not align these — the split enables test isolation between root-package code and the omnihub-site app.
14. **Dev server port is 8080.** `vite.config.ts` sets `server.port: 8080`. Documentation referencing port 5173 is incorrect.
15. **`orchestrator/requirements.lock` must stay committed.** The `Dependency Security Audit` CI gate checks for its existence. Do not delete or gitignore it.

## Conflict Resolution Rule

If any other document conflicts with this file, this file wins unless explicitly superseded by a newer dated canonical file.

