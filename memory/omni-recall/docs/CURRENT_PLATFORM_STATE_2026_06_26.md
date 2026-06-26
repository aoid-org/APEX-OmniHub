---
version: 1.0.0
created: 2026-06-26
last_audited: 2026-06-26
status: verified
supersedes: CURRENT_PLATFORM_STATE_2026_06_25.md
---

# Current Platform State — 2026-06-26

> **CURRENT AUTHORITY (2026-06-26):** `main` HEAD after merge of PR #1497
> (fix(web-vitals): resolve CLS 0.172 on #cta + WCAG AA contrast fix + doc drift cleanup).
> Pre-merge `main` HEAD: `e69dd934`.
> Active dev branch: `claude/gallant-newton-5d57b0`.
> Release line remains **1.8.2** — CSS-only patch, no version bump.

---

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-26 |
| `main` HEAD (pre-merge) | `e69dd934` — fix(ops-widgets-smoke): remove unused expect import after APEX-2021 skip |
| `main` HEAD (post-merge) | merge commit of PR #1497 |
| Previous platform state doc | [`CURRENT_PLATFORM_STATE_2026_06_25.md`](./CURRENT_PLATFORM_STATE_2026_06_25.md) — `main` HEAD `4c0d481` |
| Active dev branch | `claude/gallant-newton-5d57b0` |
| Dev branch HEAD | `b2f14b52` — fix(web-vitals): resolve CLS 0.172 on #cta and apply WCAG AA contrast fix |
| Root package version | `1.8.2` (unchanged) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Platform stack | **Vite 7 + React 18 + TypeScript 5.9** — Cloudflare Pages (frontend), Supabase (DB/edge), Render/Temporal (orchestrator) |
| CI/CD workflow count | **20** (unchanged from 2026-06-25) |
| Edge function dirs | **33** total (32 function dirs + `_shared`) |
| SQL migrations | **100** (94 forward + 6 rollback) — 96 unique versions |
| Source files (`src/`) | **328** (234 `.ts` + 94 `.tsx`) |

---

## Session Changes (2026-06-26)

### 1. CLS Fix — Web Vitals

**File:** `apps/omnihub-site/src/styles/landing.css`

**Problem:** Cloudflare RUM reported CLS **0.172** ("Needs Improvement") on `apexomnihub.icu/`, attributed to element `#cta > div.cta-bg`.

**Root cause:** `.omnihub-platform-map-host` had `content-visibility: auto` + `contain-intrinsic-size: auto 720px`. The 720px intrinsic-size fallback was smaller than the element's `min-height` (`clamp(520px, 72vh, 820px)` = 820px at standard viewports). For first-time visitors (no cached "remembered" height), the browser laid out the StarMap slot as 720px while the section was off-screen. On first scroll into view the section snapped to 820px — a 100px jump. The CTA section (`#cta`) and its absolutely-positioned `cta-bg` child shifted with it, registering as CLS.

**Fix:** Removed `content-visibility: auto` and `contain-intrinsic-size: auto 720px`. `contain: layout paint` retained for layout isolation. `min-height: clamp(520px, 72vh, 820px)` retained for space reservation.

**Verification:** Headless Chromium, 1440×900, real `omnihub-starmap.js` mounted into host with updated CSS.
- Host height before mount: **890px**
- Host height after mount: **890px** (identical — zero shift)
- StarMap renders: heading ✅, 2 canvases ✅, CTA button ✅, 0 console errors ✅

**Before / After CSS:**
```css
/* BEFORE */
.landing-root .omnihub-platform-map-host {
  display: block;
  min-height: clamp(520px, 72vh, 820px);
  contain: layout paint;
  content-visibility: auto;
  contain-intrinsic-size: auto 720px;   /* ← 720 < 820 = first-visit CLS */
}

/* AFTER */
.landing-root .omnihub-platform-map-host {
  display: block;
  min-height: clamp(520px, 72vh, 820px);
  contain: layout paint;
}
```

---

### 2. WCAG AA Contrast Fix

**File:** `apps/omnihub-site/src/styles/theme.css`

**Problem:** `--omni-t3` tokens in both light and dark OmniDash themes failed the 4.5:1 AA threshold for normal text.

| Theme | Token | Before | Worst ratio | After | Best ratio |
|---|---|---|---|---|---|
| Light | `--omni-t3` | `#64748b` | 4.34:1 on `cardHover #f1f5f9` ❌ | `#5e6c7e` | 4.89:1 ✅ |
| Dark | `--omni-t3` | `#475569` | 2.38:1 on `card #0E1628` ❌ | `#7c8b9c` | 5.18:1 ✅ |

Verified via WCAG 2.1 relative luminance formula against all four OmniDash surface tokens in each theme: `bg`, `surface`, `card`, `cardHover`.

Note: `--omni-t4` tokens are decorative (borders/dividers) and are intentionally excluded from text contrast requirements.

---

### 3. Documentation Drift Cleanup

| File | Change |
|---|---|
| `README.md` | Corrected stale `main` HEAD ref (`4c0d481`→`e69dd934`), active branch (`claude/kind-feynman-h5gcbs`→`claude/gallant-newton-5d57b0`), docs audit dates (2026-06-24→2026-06-26), platform snapshot date |
| `orchestrator/ARCHITECTURE.md` | Removed `$XXX/month saved` placeholder → `material monthly savings` |
| `orchestrator/IMPLEMENTATION_SUMMARY.md` | Removed `$XXX/month savings` placeholder → `material monthly savings` |
| `plan.md` | Marked Task 3 (`[~] → [x]`) — `.gitignore` security configuration was already applied |

---

## Build Reproduction Guide

To reproduce this exact build state from scratch:

### Prerequisites
```
Node.js 22.x
npm 10.x
git
```

### Steps
```bash
# 1. Clone
git clone https://github.com/apexbusiness-systems/APEX-OmniHub.git
cd APEX-OmniHub
git checkout main   # or the merged commit after PR #1497

# 2. Install root deps
npm install

# 3. Install site deps
cd apps/omnihub-site
npm install --legacy-peer-deps

# 4. Build site (SSG)
npm run build
# → dist/ with 5 SSG pages + PWA + service worker

# 5. Verify TypeScript (from root)
cd ../..
npm run typecheck    # tsc -b --noEmit → EXIT 0

# 6. Verify lint (from root)
npm run lint         # eslint . → EXIT 0

# 7. Run all CI scanner gates (from root)
node scripts/ci/check-release-certification-docs.mjs
node scripts/ci/verify-claim-hygiene.mjs
node scripts/ci/check-supabase-migration-versions.mjs
node scripts/ci/guard-agent-destructive-actions.mjs
npm run docs:check
```

### Key Environment Variables (Cloudflare Pages / production)
```
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase anon/public key>
```
The build works without these (offline mode, no Supabase features). They are required for the authenticated OmniDash surface.

---

## Platform Architecture Summary

### Frontend (`apps/omnihub-site/`)
| Layer | Technology |
|---|---|
| Framework | React 18.3.x + TypeScript 5.8.x |
| Build | Vite 7.3.x with SWC plugin |
| SSG | vite-react-ssg 0.9.x (pre-renders 5 marketing routes) |
| Routing | React Router v6 |
| Styling | CSS custom properties (theme.css) + landing.css + Tailwind 3.4.x utility classes |
| i18n | i18next 25.x + react-i18next 16.x, 9 locales bundled inline (en-US default) |
| Auth | Supabase Auth (email/password + WebAuthn/passkey ECDSA P-256) |
| State | React hooks + Zustand stores |
| Deployment | Cloudflare Pages (direct upload via `deploy-production-cf-direct.yml`) |
| PWA | Workbox (vite-plugin-pwa) — 107 precache entries, ~19MB |

### Backend / Edge
| Layer | Technology |
|---|---|
| Database | Supabase Postgres (100 migrations: 94 forward + 6 rollback) |
| Edge Functions | 32 Supabase Edge Functions + `_shared` helpers |
| Orchestrator | Temporal Cloud (TypeScript SDK 1.14.x) |
| Orchestrator Host | Render.com (worker process) |
| AI/LLM Gateway | Cloudflare Workers (MCP gateway + proxy) |

### Key Edge Functions
| Function | Purpose |
|---|---|
| `omnilink-port` | Module state + link staging surface |
| `trigger-workflow` | Temporal saga dispatch (module actions) |
| `apex-agent` | AI agent pipeline |
| `mcp-gateway` | MCP server proxy |
| `identity-webauthn` | WebAuthn assertion + signature verification |
| `platform-health` | Health check endpoint |
| `omnibridge-control` | External integration control plane |

---

## CI/CD Pipeline (20 Workflows)

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci-runtime-gates.yml` | push/PR | TypeScript, lint, tests, build, audit |
| `compliance.yml` | push/PR + tags | SBOM generation (attach-only on existing tag) |
| `security-regression-guard.yml` | push/PR | Security regression detection |
| `secret-scanning.yml` | push/PR | Secret detection |
| `apex-governance.yml` | push/PR | Governance policy compliance |
| `release.yml` | push/PR | Release validation |
| `lighthouse.yml` | push/PR | Lighthouse CI performance gates |
| `cd-staging.yml` | push to main | Deploy to staging |
| `deploy-production-cf-direct.yml` | manual | Production Cloudflare Pages deploy |
| `integration.yml` | push/PR | Playwright integration harness |
| `ops-doc-guard.yml` | push/PR | Runtime contract doc drift guard |
| `orchestrator-ci.yml` | push/PR | Orchestrator TypeScript CI |
| `chaos-simulation-ci.yml` | push/PR | Chaos/resilience simulation |
| `rsi-governance.yml` | push/PR | RSI governance checks |
| `dependency-consolidation.yml` | schedule | Dependency audit |
| `nightly-evaluation.yml` | schedule | Nightly eval suite |
| `mobile-build-verify.yml` | push/PR | Mobile build verification |
| `deploy-omnihub-proof.yml` | manual | Proof-of-concept deploy |
| `deploy-web3-functions.yml` | manual | Web3 function deployment |
| `alert-guard-rail-violation.yml` | event | Guardrail violation alerting |

---

## Known Deferred Items

| Ticket | Status | Description |
|---|---|---|
| APEX-1202 | Accepted-deferred | k6 performance gate `p99 < 800ms` — soft gate, pending dedicated perf pass |
| APEX-2017 | Skipped in CI | SkillCreateModal backdrop z-index intercepts click in CI env |
| APEX-2018 | Skipped in CI | axe accessibility — 606 violations (unlabeled buttons + contrast) in CI |
| APEX-2019 | Skipped in CI | OmniDash theme-toggle localStorage persistence in CI |
| APEX-2020 | Skipped in CI | OmniDash ops-controls localStorage persistence in CI |
| APEX-2021 | Skipped in CI | SentinelPanel text content not rendering in CI |

---

## Gate Results — Session 2026-06-26 (all green)

| Gate | Result |
|---|---|
| `tsc -b --noEmit` | ✅ EXIT 0 |
| `eslint .` | ✅ EXIT 0 |
| `npm run build` (SSG) | ✅ EXIT 0 — 5 pages, PWA generated |
| `check-release-certification-docs.mjs` | ✅ PASSED |
| `verify-claim-hygiene.mjs` | ✅ PASSED — 302 files, 0 violations |
| `check-supabase-migration-versions.mjs` | ✅ PASSED — 96 unique versions |
| `guard-agent-destructive-actions.mjs` | ✅ PASSED |
| `npm run docs:check` | ✅ PASSED — 0 broken links, 0 broken pointers |
| StarMap visual regression | ✅ PASSED — 890px reserved = 890px rendered |
| WCAG AA contrast | ✅ PASSED — all `--omni-t3` pairings ≥ 4.5:1 |

---

## Production Certification

See [`docs/release/owner-approved/PRODUCTION_CERTIFICATION_2026_06_26.md`](../../../docs/release/owner-approved/PRODUCTION_CERTIFICATION_2026_06_26.md) for the full certification record. Owner approval gate: merge of PR #1497 into `main` by the product owner (JR).
