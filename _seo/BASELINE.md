# APEX-OmniHub SEO & Indexing Baseline Measurement
# Document ID: _seo/BASELINE.md
# Evidence Date: 2026-08-14
# Target Host: https://apexomnihub.icu

## 1. Initial State Inventory

| Metric / Dimension | Baseline (Pre-Fix) | Target State | Notes |
|---|---|---|---|
| **Public Routes Readable Without JS** | **~1 of ~34** | **32 / 32 (100%)** | Prior CSR build served empty `<div id="root"></div>` on all routes |
| **Sitemap URL Count** | **8 URLs** (stale 2026-06-01) | **32 URLs** (dynamic/active) | Generator wrote to wrong directory (`public/` vs `apps/omnihub-site/public/`) |
| **Server-Side Schema @graph** | **1 page (`/`)** | **All 32 public pages** | Client-injected JSON-LD now statically rendered in HTML `<head>` |
| **Average Body Words Without JS** | **~0 words** | **800–1,500 words** | SSG prerender extracts full DOM content |
| **Canonical Link Integrity** | **Missing on `/`, malformed on `orchestrator.html`** | **100% self-referencing absolute canonicals** | Fixed syntax and alias mappings |
| **AI Crawler Access (`robots.txt`)** | **Blocked at edge** | **Segmented (Search Bots allowed, training controlled)** | `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot` permitted |
| **GSC Indexed Pages** | **Baseline: Not yet measured** (requires GSC access) | **100% of sitemap routes indexed** | To be monitored Day 7/30/90 post-deploy |
| **Lighthouse Performance (Mobile)** | **TBD / Initial CSR baseline** | **>= 90 Performance, 100 SEO** | Font optimization + static HTML delivery |

## 2. Route Audit Matrix (Pre-Fix vs Post-Fix Target)

| Route | Pre-Fix Words (No JS) | Target Words (No JS) | Pre-Fix Title | Target Title (50–60 Chars) |
|---|---|---|---|---|
| `/` | ~0 | >1,200 | Generic Root Shell | APEX OmniHub | The Universal Sync Orchestrator |
| `/tech-specs` | 0 | >950 | Under 30 Chars | APEX OmniHub Technical Specifications & Architecture |
| `/demo` | 0 | >800 | Under 30 Chars | APEX OmniHub Interactive Control Plane Sandbox Demo |
| `/tri-force` | 0 | >900 | Under 30 Chars | Tri-Force Engine: Direct, Audit & Deduce Architecture |
| `/fortress` | 0 | >1,100 | Under 30 Chars | APEX Fortress: Enterprise AI Security & Governance |
| `/omniport` | 0 | >850 | Under 30 Chars | OmniPort: High-Throughput Synchronized API Gateway |
| `/story` | 0 | >1,400 | Under 30 Chars | APEX Founder Story: The Vision for Governed AI |
| `/request-access` | 0 | >500 | Under 30 Chars | Request Early Access | APEX OmniHub Enterprise |
| `/pricing` | 0 (Unlisted) | >700 | Under 30 Chars | APEX OmniHub Pricing & Enterprise Licensing Plans |
| `/manifesto` | 0 (Unlisted) | >1,450 | Under 30 Chars | The APEX Manifesto: Freedom with Governed Structure |
| `/maestro` | 0 (Unlisted) | >900 | 22 Chars | Maestro Workflow Conductor & Autonomous Orchestration |
| `/orchestrator` | 0 (Unlisted) | >850 | 24 Chars | Central Command FSM & State Machine Orchestrator |
| `/omniboard` | 0 (Unlisted) | >950 | 22 Chars | OmniBoard: Universal Third-Party SaaS Integrations |
