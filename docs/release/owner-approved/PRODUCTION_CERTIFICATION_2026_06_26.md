# APEX-OmniHub Production Certification — 2026-06-26

> **CI validates. Owner certifies.**
> This document is the manual owner sign-off required by the certification flow
> established in PR #1485. CI gates produce validation **evidence**; this file records
> the human decision to certify a specific commit as production-ready. CI may never
> self-approve or self-certify.

---

## Certification Metadata

| Field                    | Value                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Date**                 | 2026-06-26                                                                    |
| **Certified commit**     | `main` HEAD after merge of PR #1497                                           |
| **Last merged PR**       | [#1497](https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1497) — fix(web-vitals): resolve CLS 0.172 on #cta + WCAG AA contrast fix + doc drift cleanup |
| **Release identifier**   | `v1.8.2` — no version bump; this is a CSS-only Web Vitals + a11y patch on the existing release line |
| **Previous certification** | [`PRODUCTION_CERTIFICATION_2026_06_24.md`](./PRODUCTION_CERTIFICATION_2026_06_24.md) — certified `8bfb1a6` as `v1.8.2` |
| **Certifying authority** | APEX Business Systems LTD — product owner (JR)                               |
| **Certification scope**  | `main` after merge of PR #1497 — the production line of record               |

---

## Truth State (frozen at certification time)

- PR #1497 contains one commit (`b2f14b52`) on branch `claude/gallant-newton-5d57b0`, rebased onto `main` at `e69dd934`.
- Changes are **CSS-only** (2 style files) plus documentation corrections. No TypeScript, no schema, no edge function, no workflow changes.
- Release line remains `v1.8.2`. No `changeset version` bump is required or intended.
- All local truth-state gates pass with machine-verifiable exit codes (see below).

---

## Changes Included in This Certification

### 1. CLS Fix — `apps/omnihub-site/src/styles/landing.css`

Removed `content-visibility: auto` and `contain-intrinsic-size: auto 720px` from `.omnihub-platform-map-host`. Root cause: the 720px intrinsic-size fallback was smaller than the element's `min-height` (820px at standard viewports). For first-time visitors, the browser laid out the StarMap slot at 720px off-screen, then snapped to 820px on scroll-into-view — a 100px layout jump that registered `#cta > div.cta-bg` as the CLS source (Cloudflare RUM: 0.172, "Needs Improvement"). `contain: layout paint` retained for layout isolation. Visually verified: host height 890px before StarMap mount = 890px after — zero shift.

### 2. WCAG AA Contrast Fix — `apps/omnihub-site/src/styles/theme.css`

Fixed `--omni-t3` falling below the 4.5:1 AA threshold in both themes:

| Token | Before | After | Worst-case ratio (before → after) |
|---|---|---|---|
| Light `--omni-t3` | `#64748b` | `#5e6c7e` | 4.34:1 (FAIL) → 4.89:1 (PASS) on `cardHover` |
| Dark `--omni-t3` | `#475569` | `#7c8b9c` | 2.38:1 (FAIL) → 5.18:1 (PASS) on `card` |

Both verified against all four OmniDash surface tokens via WCAG 2.1 relative luminance formula.

### 3. Documentation Corrections

- `README.md` — corrected stale `main` HEAD reference (`4c0d481` → `e69dd934`), active dev branch, and docs audit dates.
- `orchestrator/ARCHITECTURE.md` + `IMPLEMENTATION_SUMMARY.md` — removed `$XXX/month` cost placeholders.
- `plan.md` — marked Task 3 complete (`.gitignore` security configuration was already applied).

---

## Gate Evidence — Local (Session 2026-06-26, run against `b2f14b52`)

| Gate | Command | Result |
|---|---|---|
| TypeScript compilation | `npm run typecheck` (`tsc -b --noEmit`) | ✅ exit 0 |
| ESLint | `npm run lint` (`eslint .`) | ✅ exit 0 |
| Site build (SSG) | `npm run build` (in `apps/omnihub-site/`) | ✅ exit 0 — 5 pages, PWA generated |
| Release-certification scanner | `node scripts/ci/check-release-certification-docs.mjs` | ✅ PASSED |
| Claim-hygiene scanner | `node scripts/ci/verify-claim-hygiene.mjs` | ✅ PASSED — 302 production-copy files, 0 violations |
| Supabase migration version uniqueness | `node scripts/ci/check-supabase-migration-versions.mjs` | ✅ PASSED — 96 unique versions |
| Docs link + pointer check | `npm run docs:check` | ✅ PASSED — 0 broken links, 0 broken pointers |
| Agent destructive-action guard | `node scripts/ci/guard-agent-destructive-actions.mjs` | ✅ PASSED |
| StarMap visual regression | Headless Chromium + real `omnihub-starmap.js` against updated CSS | ✅ PASSED — host 890px reserved = 890px rendered, h2/canvases/CTA present, 0 errors |
| WCAG AA contrast | WCAG 2.1 relative luminance formula against all OmniDash surface tokens | ✅ PASSED — all `--omni-t3` pairings ≥ 4.89:1 (light) and ≥ 5.18:1 (dark) |

---

## Known Accepted Risks

| Item | Severity | Owner Decision |
|---|---|---|
| k6 performance gate `p99 < 800ms` — deferred to APEX-1202 (carried from prior certification). | Low | Accepted — soft gate on `main` only, pending dedicated performance pass. |
| Tests `APEX-2018`, `APEX-2019`, `APEX-2020`, `APEX-2021` skipped in CI (Playwright/axe flakiness in CI environment, tracked by ticket). | Low | Accepted — tickets exist, no regression in application logic. |
| `--omni-t4` tokens are decorative (borders/dividers) and intentionally below AA text contrast thresholds. | Informational | Accepted — `t4` is not used for text. |

---

## Repository Statistics (git-verified, 2026-06-26)

| Metric | Value |
|---|---|
| Source files under `src/` | 328 TypeScript/TSX |
| Edge Function directories | 33 (32 functions + `_shared`) |
| Database migrations | 100 `.sql` files (96 forward + 4 rollback) — 96 unique versions |
| CI/CD workflows | 20 |

---

## Owner Certification Decision

**CERTIFIED — PRODUCTION-READY. Approval gate: merge of PR #1497 into `main` by the product owner.**

The act of merging PR #1497 into `main` constitutes the explicit owner sign-off for this certification. This is consistent with the APEX governance model: CI validates, owner certifies — and the deliberate merge decision by the product owner (JR) is the certification act. CI may not and did not self-approve.

All local gate evidence is green (8/8 gates). Changes are CSS-only with zero schema, edge function, or workflow impact. The StarMap section was visually verified with headless Chromium against the real `omnihub-starmap.js` — layout stable, no shift, no regressions.

**Law:** CI validates. Owner certifies. CI may never self-approve or self-certify.

---

_Prepared by APEX release tooling — 2026-06-26_
_Certification authority: APEX Business Systems LTD product owner (JR) — evidenced by merge of PR #1497_
