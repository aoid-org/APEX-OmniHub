# Production validation harness note — 2026-06-26

- Added a non-destructive production validation harness for `https://apexomnihub.icu`: detailed release matrix, production-safe Playwright suite, k6 smoke wrapper, and owner-run validation procedures.
- Current certification boundary remains NO-GO for claiming fully certified production functionality until live evidence verifies Cloudflare provenance, Request Access backend/fallback proof, auth/OAuth/passkey, OmniDash persistence, Supabase RLS, BYOM, billing, native mobile, performance, and branch protection.
- Production-safe browser evidence writes sanitized JSON/screenshots under `artifacts/production-validation/` and does not submit production writes by default.
- `npm run perf:k6:smoke` must actually execute k6; missing k6 is BLOCKED, never pass.
