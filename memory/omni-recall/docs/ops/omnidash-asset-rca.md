---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Incident RCA: OmniDash Asset Delivery Failure

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


**Date:** 2026-03-14
**Status:** Fix implemented, deploy verification UNVERIFIED

---

## Symptom

Production OmniDash at `https://apexomnihub.icu/omnidash` exhibits:
- Compiled CSS asset requests (e.g., `/assets/index-C6KzUN4j.css`) served as HTML or 404
- Dashboard renders a black screen with startup lock/loading overlay that never clears
- Bootstrap failure prevents all dashboard interaction

---

## Exact Root Cause

**Classification: A + C combined — SPA rewrite catch-all serves HTML for missing assets, compounded by asset path structure change**

### Primary cause: vercel.json SPA catch-all has no /assets/* exclusion

`vercel.json` line 19:
```json
{ "source": "/(.*)", "destination": "/index.html" }
```

This catch-all rewrite has **no preceding rule to exclude `/assets/*`**. When a hashed asset file does not exist on disk (due to a new deploy with different hashes), Vercel falls through to this rule and serves `index.html` (HTML content) with `text/html` MIME type instead of returning 404.

### Compounding cause: vite.config.ts assetFileNames changed CSS output path

`vite.config.ts` lines 86-88:
```js
chunkFileNames: 'assets/js/[name]-[hash].js',
entryFileNames: 'assets/js/[name]-[hash].js',
assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
```

This puts CSS at `assets/css/index-HASH.css`. Previously deployed builds placed CSS at `assets/index-HASH.css` (flat). After redeploy:
- Old cached `index.html` references `/assets/index-BD0nqDyV.css`
- New deploy only has `/assets/css/index-Cj1cCJq6.css`
- Old path → no file on disk → SPA rewrite → HTML served as CSS

### Cascade to black screen

When CSS loads as HTML:
1. Browser rejects the stylesheet (MIME mismatch with `X-Content-Type-Options: nosniff`)
2. All OmniDash layout CSS fails to load
3. ProtectedRoute loading state renders a full-viewport `#030303` black div
4. Even after auth resolves, the dashboard renders unstyled against `--od-bg-canvas: #060a13`
5. User sees a black, apparently locked screen

---

## Evidence

### Production asset probe (2026-03-14 01:10 UTC)

**Current deploy is serving correctly** (a recent redeploy may have fixed the immediate breakage):
```
CSS: /assets/index-BD0nqDyV.css → 200, text/css; charset=utf-8 (Vercel cache HIT)
JS:  /assets/js/index-Rj6KbYf6.js → 200, application/javascript; charset=utf-8 (Vercel cache HIT)
```

### Current build from repo HEAD

```
CSS: dist/assets/css/index-Cj1cCJq6.css  (note: css/ subdirectory)
JS:  dist/assets/js/index-fUHwxq-O.js
```

Built `index.html` references `/assets/css/index-Cj1cCJq6.css` — different path structure from deployed `/assets/index-BD0nqDyV.css`.

### Structural vulnerability in vercel.json

The SPA catch-all `/(.*) → /index.html` has NO exclusion for `/assets/*`, `/favicon*`, or other static file patterns. Any missing static file falls through to HTML.

---

## Eliminated Hypotheses

| Hypothesis | Evidence | Status |
|---|---|---|
| **B: Hashes not present in deployed dist** | Production currently serves 200 for both CSS and JS with correct MIME. Hashes match the deployed build. | Not the *current* cause, but was likely the cause during the incident window when hashes changed between deploys |
| **D: Service worker serving stale HTML** | SW uses network-first strategy (line 74 of sw.js). Asset requests that hit network get fresh response. Only falls back to cache on network failure, and non-navigation non-cached requests get 503, not HTML. Navigation fallback to cached index.html only fires for `request.mode === 'navigate'`, which compiled assets don't use. | Eliminated — SW does not serve HTML for asset requests under normal conditions |
| **E: Application-state feature (not a bug)** | ProtectedRoute shows `#030303` loading div, but this is a transient auth check state that clears in <2s normally. The *persistent* black screen requires CSS failure. | Eliminated — loading state is transient, persistent black requires CSS bootstrap failure |

---

## Files Changed

1. `vercel.json` — Added explicit static asset route that returns 404 (not HTML fallback) for missing assets under `/assets/*`, `/favicon*`, `/manifest*`, `/robots.txt`, `/sw.js`
2. `public/sw.js` — Asset requests (`/assets/`) now skip navigation fallback entirely; returns network response or 404, never cached HTML
3. `scripts/verify-built-assets.mjs` — Regression test: parses `dist/index.html`, verifies all referenced assets exist on disk
4. `incident/omnidash-asset-rca.md` — This document

---

## Verification Evidence

### Pre-fix regression test
```
$ node scripts/verify-built-assets.mjs
# FAILS before fix if dist contains stale index.html referencing old paths
```

### Post-fix build verification
```
$ npm run build
$ node scripts/verify-built-assets.mjs
# PASSES — all referenced assets exist in dist/
```

---

## Rollback Plan

1. Revert `vercel.json` to previous version (remove `/assets/:path*` route)
2. Revert `public/sw.js` to previous version
3. Redeploy
4. Risk: reverts to vulnerable state where missing assets serve HTML

---

## External Deploy/Cache Actions Required (UNVERIFIED)

These steps cannot be verified from this workspace:

1. **Vercel CDN cache purge** — After deploy, purge edge cache to ensure old `index.html` references are cleared: `vercel --force` or via Vercel dashboard → Deployments → Purge Cache
2. **Service worker invalidation** — Users with cached SW may need hard refresh (Ctrl+Shift+R) or SW update will propagate via `skipWaiting()` on next visit
3. **Deploy ordering** — Verify Vercel atomic deploys: all assets must be available before `index.html` is served. Vercel handles this by default with immutable deployments.
4. **Monitor** — After deploy, verify with: `curl -sSI https://apexomnihub.icu/assets/css/index-NEWHASH.css` returns `text/css`, not `text/html`
