# Cloudflare Project Parity

This document measures the build environment divergence between the production Cloudflare Pages project (`apex-omnihub`) and the shadow project (`apex-omnihub-shadow`).

| Field | `apex-omnihub` (prod) | `apex-omnihub-shadow` (shadow) | Divergent? |
|-------|-----------------------|---------------------------------|------------|
| Build system / build image version | 3 | 3 | |
| Build command | `npm run build` | *(empty)* | **DIVERGENT** |
| Build output directory | `dist` | *(empty)* | **DIVERGENT** |
| Root directory | *(empty)* | *(empty)* | |
| `NODE_VERSION` env var | `22` | *(missing)* | **DIVERGENT** |
| `NPM_FLAGS` / `BUN_VERSION` env vars | *(missing)* | *(missing)* | |
| Framework | `react-router` | *(empty)* | **DIVERGENT** |
| All other environment variable names | `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_DOMAIN_TOKEN_AOID`, `CLOUDFLARE_SHADOW_PROJECT_NAME`, `CONTROL_SIGNING_SECRET_SBBL_HQ`, `CONTROL_TARGET_URL_SBBL_HQ`, `ENABLE_SHADOW_DEPLOYMENT`, `GH_TOKEN_TEMP`, `GROQ_API_KEY`, `MCP_GATEWAY_API_KEY`, `OMNIBOARD_MOCK_OAUTH`, `OMNIBRIDGE_M2M_CLIENTS`, `OMNIBRIDGE_SBBL_NATIVE_SECRET`, `REDIS_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TF_PROD_TOKEN`, `VITE_CONNECT_AI_ENABLED`, `VITE_DASHBOARD_URL`, `VITE_OMNIDASH_ENABLED`, `VITE_OMNILINK_MOBILE_ONLY`, `VITE_ORCHESTRATOR_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_DOMAIN_TOKEN_AOID`, `MCP_GATEWAY_API_KEY`, `OMNIBOARD_MOCK_OAUTH`, `TF_PROD_TOKEN`, `VITE_ORCHESTRATOR_URL`, `VITE_SUPABASE_URL` | **DIVERGENT** |

## Production build failure — first error
```
npm error Missing: @esbuild/aix-ppc64@0.28.1 from lock file
```

**Conclusion on H1:**
The log confirms H1. Because `apex-omnihub` explicitly specifies a build command and framework, Cloudflare's v3 build image falls back to `npm ci` parsing the `package-lock.json` file. The `npm ci` command immediately fails because cross-platform optional native dependencies (`@esbuild` and `@supabase/cli`) are missing from the `package-lock.json` generated on Windows. 

Conversely, `apex-omnihub-shadow` relies on empty defaults. Cloudflare successfully detects `bun.lock`, delegates to `bun install`, and builds flawlessly.
