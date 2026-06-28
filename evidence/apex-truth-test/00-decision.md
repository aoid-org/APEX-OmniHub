# APEX Truth Test — Phase 15 Final Decision (00)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `b47726c`
- **Supabase project:** APEX-OmniHub (`rtopreovkywofgwgmozi`, ACTIVE_HEALTHY)
- **Date:** 2026-06-28 (Phase 15 closeout)
- **Commits on branch:** 20 (from `3abe54d` Phase 0 through `b47726c` OSE Guard ops doc)

---

## Overall Decision

**GO for merge.** All CI gates green. All repo-level remediation verified.
**BLOCKED for full production certification** by one post-merge dependency:
omnilink-port redeploy (CI pipeline deploys on merge to main).

---

## CI Status (all 32 checks — PASS)

| Check | Status |
|---|---|
| build-and-test | **PASS** (completed 14:31 UTC) |
| SonarCloud + SonarCloud Code Analysis | **PASS** |
| Cloudflare Pages: apex-omnihub | **PASS** |
| Cloudflare Pages: apex-omnihub-shadow | **PASS** |
| Build Web Assets | **PASS** |
| Android Build (Debug) | **PASS** |
| Mobile Build Gate | **PASS** |
| Governance gate (required for branch protection) | **PASS** |
| Secret scan (gitleaks) | **PASS** |
| Dependency vulnerability scan | **PASS** |
| APEX policy gates | **PASS** |
| RFC + architecture review marker | **PASS** |
| Architectural Boundary Enforcement | **PASS** |
| Terraform Expression Drift Gate | **PASS** |
| RSI Governance Gate | **PASS** |
| OmniSkin Engine token contract (OSE Guard) | **PASS** |
| Operations doc drift guard | **PASS** |
| Security Invariant Checks | **PASS** |
| Dependency Security Audit | **PASS** |
| Lighthouse Audit | **PASS** |
| Compliance Gates | **PASS** |
| Security Report (×2) | **PASS** |
| Scan for Exposed Secrets | **PASS** |
| Verify No .env Files | **PASS** |

`mergeable_state: clean` — PR is mergeable.

---

## Remediation Summary

### Gallery Remediation (PR #1511 primary scope)

**PASS.** ConnectionsWidget reverted to display-only "Integrated Apps Gallery."
Forbidden-string scan: zero of {`ConnectionsWidget`, `Third-Party Connections`,
`Connected APEX Apps`, `connections-third-party`, `connections-apex-apps`,
`Connect Third-Party App`} in `apps/omnihub-site/dashboard`. "Integrated Apps
Gallery" heading present and display-only.

### OmniMedia Error Honesty (P1 defect fix)

**PASS (code). BLOCKED (live playback).**

- **Defect:** user-facing error rendered raw SDK text — "Edge Function returned a
  non-2xx status code."
- **Root cause (PROVEN):** deployed `omnilink-port` v32 returns **404** on
  `omnimedia-catalog` — the omnimedia routing was added to source but the function
  was never redeployed. `OMNILINK_ENABLED` is enabled (probe returned 403 not 503).
  Not a config, auth, or CORS issue.
- **Frontend fix (shipped, commit `a104425`):**
  - `omniMediaCatalog.ts`: all SDK/network failures collapse to stable
    `OmniMediaError` codes (`omnimedia_catalog_failed` / `_ingest_failed` /
    `_delete_failed`). Raw error messages never propagate.
  - `OmniMediaGallery.tsx`: honest i18n copy "OmniMedia is temporarily unavailable.
    Retry, or check media service status." + Retry control + in-flight dedupe +
    last-good catalog preservation. All strings via `tx()` across 9 locales.
  - Hardcoded demo clips (Big Buck Bunny / Elephants Dream) removed (commit
    `995a0e2`) — Surface Registry compliance.
- **Unit/render tests:** `omnimedia-catalog-honesty.spec.ts` (4 tests) +
  `omnimedia-gallery-honesty.spec.tsx` (2 tests) — raw SDK string never surfaces.
- **Backend deploy path:** CI workflows deploy `omnilink-port` on merge:
  - `.github/workflows/deploy-production-cf-direct.yml:163`
  - `.github/workflows/deploy-web3-functions.yml:64`
- **Post-merge smoke required:** re-probe `omnimedia-catalog` → expect 401 (route
  reachable, auth required) instead of 404, then authenticated call → 200 `{items}`.

### OmniSkin Engine (added by subsequent session)

**PASS.** Three-layer token system:
- Layer 1: canonical token forge (`omniSkinTokens.ts`)
- Layer 2: static CSS (`omniSkin.css`), retired JSX `<style>` tag
- Layer 3: OSE Guard CI contract (`scripts/ci/check-omni-skin.mjs`)
- Invalid `var()+hex-alpha` CSS patterns replaced with `rgba()`.

### Static Fake-Surface Scan

**PASS.** Executed scan (see `01-static-scan.md`). No production-facing fake surface
rendering mock/hardcoded data or a no-op control as a real capability. The one
historical raw-error surface (OmniMedia) is remediated and test-locked.

### i18n Parity

**PASS.** `omnimedia` namespace keys added to all 9 locales (en-US, fr-FR, es-ES,
de-DE, ja-JP, zh-CN, pt-BR, ar, hi-IN) with genuine translations. `i18n:check`
passes.

---

## Evidence Pack Index

| File | Status | Notes |
|---|---|---|
| `00-decision.md` | **FINAL** | This file |
| `01-static-scan.md` | **PASS** | Executed rg scan, classified all hits |
| `02-product-truth.md` | PRESENT | Per-surface declarations |
| `03-surface-inventory.md` | PRESENT | Control inventory |
| `04-user-flow.md` | BLOCKED | Requires authenticated browser |
| `05-network-api-proof.md` | **EXECUTED** | Live probes: 403 (CORS), 404 (no route), 204 (preflight). Root cause proven |
| `06-data-provenance.md` | VERIFIED (schema) | `omnimedia_assets` table exists, RLS on, migration applied |
| `07-refresh-persistence.md` | BLOCKED | Requires authenticated browser |
| `08-negative-states.md` | VERIFIED (code) | Error states honest, code audited |
| `09-visual-quality.md` | BLOCKED | Requires authenticated browser |
| `10-accessibility.md` | VERIFIED (code) | `role="alert"`, `aria-label` on controls, i18n-wired |

---

## Drift Guard

OmniMedia is the user-facing media surface. `omnilink-port` / `OMNILINK_ENABLED`
are backend/config dependencies only and are never product truth or user-exposed
wording. Allowed phrasing: "OmniMedia depends on the omnilink-port backend path in
this deployment."

---

## Blocking Dependencies for Full Production Certification

| Dependency | Owner | Resolution |
|---|---|---|
| `omnilink-port` redeploy with omnimedia routing | CI pipeline (on merge to main) | Merge PR #1511 → CI deploys → re-probe |
| Authenticated E2E (screenshots, traces, axe) | Release engineer with auth session | Out of scope for this ephemeral container |
| Post-merge smoke: `omnimedia-catalog` → 200 | Release engineer | Re-probe after deploy confirms route is live |

---

## Contract Language

**GO for merge.** All 32 CI gates green, `mergeable_state: clean`, all repo-level
remediation verified (gallery revert, OmniMedia error honesty, fake-surface scan,
i18n parity, OmniSkin Engine, demo clip removal, Test Integrity R2 compliance).

**BLOCKED for full production certification** by: (1) omnilink-port redeploy
containing omnimedia routing (deploys via CI on merge — not a manual action), and
(2) authenticated E2E evidence (screenshots / video / traces / axe) which cannot be
produced in an ephemeral container without a browser session against the deployed
origin.

No evidence has been fabricated. Every BLOCKED row states its exact dependency.
