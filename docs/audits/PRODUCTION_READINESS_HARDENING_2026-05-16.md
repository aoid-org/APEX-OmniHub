# Production Readiness Hardening — 2026-05-16

This note records the focused security hardening applied after the production-readiness audit. It is intentionally limited to confirmed issues in the current branch and does not alter NFT business rules, route architecture, SQL RLS policies, sitemap strategy, package-manager policy, or public product behavior.

## Patched

| Area | Files | Outcome |
| --- | --- | --- |
| Supabase browser config | `apps/omnihub-site/src/lib/supabase.ts`, `scripts/check-env-root.mjs` | Removed real fallback project credentials from client code. CI/production builds now fail closed when required Supabase env vars are absent. Local override remains available only through `APEX_ALLOW_MISSING_SUPABASE_CONFIG=true`. |
| Canonical Cloudflare CORS proxy | `edge/cors-proxy/edge-cors-proxy.js` | Preserved `?source=<encoded-url>` while requiring HTTPS targets, blocking unsafe hosts/IP forms, validating redirects, reflecting only approved APEX origins, preserving `Range`, and enforcing an upstream content-length cap. |
| Integration test Edge Function ownership | `supabase/functions/test-integration/index.ts` | Service-role reads and status updates for client-provided integration IDs are now scoped to `user_id = authResult.user.id` and return `404` for non-owned records. |
| Service worker sensitive caching | `public/sw.js` | Supabase, REST/RPC/Auth/Edge Function, and `/api/*` requests bypass cache to prevent stale authenticated data after logout/session changes. Static asset and navigation fallback behavior remains intact. |
| Notification click URL safety | `public/sw.js` | Notification payload URLs are canonicalized to documented same-origin app paths only. Legacy `/integrations` and `/omnitrace` actions map to active routes safely. |
| Web3 nonce chain binding | `supabase/functions/web3-nonce/index.ts`, `supabase/functions/web3-verify/index.ts` | Confirmed schema requires `wallet_nonces.chain_id`; nonce creation/reuse now scopes by chain, verification consumes by nonce + wallet + chain, and typedData-only requests fail explicitly instead of falling through malformed message parsing. |

## Regression Coverage

Focused regression coverage was added in `tests/security/production-hardening-regression.test.ts` for all changed security behaviors: Supabase build guard, CORS proxy SSRF/origin/redirect/size controls, integration ownership scoping, service-worker cache bypasses, notification URL safety, and Web3 nonce chain binding.
