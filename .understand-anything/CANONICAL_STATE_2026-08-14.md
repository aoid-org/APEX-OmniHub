# Canonical State Record - 2026-08-14 (APEX SEO/GEO/AI-SEO Elevation Complete)

Authoritative snapshot of repo state as of 2026-08-14. Covers execution of Contract `APEX-SEOGEO-OMNIHUB-2026-08-14-v1.0`.

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File(s) | Canonical Behavior |
|---|---|---|
| **SSG Prerender Build Pipeline** | `apps/omnihub-site/scripts/build-ssg.mjs`, `apps/omnihub-site/vite.config.ts` | Prerenders all 30 React marketing routes to static HTML + preserves 44.3 KB static `manifesto.html` in `dist/`. Fixed static router import alias. Zero new dependencies. |
| **Sitemap Generation Pipeline** | `scripts/generate-sitemap.mjs`, `apps/omnihub-site/public/sitemap.xml` | Generator correctly writes to `apps/omnihub-site/public/sitemap.xml` and `public/sitemap.xml` with 29 clean public routes and real `lastmod`. Stale 8-URL sitemap deleted. |
| **Canonical Link Tags** | `apps/omnihub-site/index.html`, `apps/omnihub-site/orchestrator.html` | Fixed malformed `content=` attribute to `href=`; added self-referencing absolute canonical link to `index.html`. |
| **AI Discovery Posture (`robots.txt`)** | `apps/omnihub-site/public/robots.txt`, `public/robots.txt` | Explicitly permits AI search indexers and user fetchers (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot-Extended`) while filtering bulk training crawlers. Points to valid `sitemap.xml`. |
| **Entity Graph (`organization.jsonld`)** | `apps/omnihub-site/public/schema/organization.jsonld` | Populated `sameAs` array with verified GitHub organization repositories (`aoid-org/APEX-OmniHub`, `apexbusiness-systems/APEX-OmniHub`) and LinkedIn company page. |
| **PWA & Build Invariants** | `scripts/ci/check-pwa-integrity.mjs`, `apps/omnihub-site/scripts/smoke-test.mjs` | PWA integrity verified 15/15 passing; smoke tests updated for SSG server-rendered root divs (`data-server-rendered="true"`) and passing 100%. |
| **SEO Documentation Suite** | `_seo/ROUTES.md`, `_seo/BASELINE.md`, `_seo/keywords.json`, `_seo/geo-queries.md`, `_seo/VERIFICATION.md`, `_seo/COMPLETION.md` | Full route census, keyword targets, GEO buyer queries, and before/after verification logs stored in `_seo/`. |

## 2. Verified Invariants
- **Root Typecheck**: `npm run typecheck` (`tsc -b --noEmit`) -> **Exit 0**.
- **PWA Guard**: `npm run check:pwa` -> **15 passed, 0 failed (Exit 0)**.
- **SSG Prerender**: `node scripts/build-ssg.mjs` in `apps/omnihub-site` -> **Exit 0 (30 pages prerendered + static manifesto)**.
- **Smoke Test**: `node scripts/smoke-test.mjs` in `apps/omnihub-site` -> **Exit 0**.
