# Post-#1511 APEX Bible Continuation Reconciliation (Phase 0)

- **PR:** #1511
- **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1`
- **Head:** `6fe51c4`
- **Supabase project:** APEX-OmniHub (`rtopreovkywofgwgmozi`, ACTIVE_HEALTHY)
- **Date:** 2026-06-28
- **Author of record:** continuation pass (documentation only — no code/test/locale/config changes)

## Drift Guard (binding for all rows below)

OmniMedia is the **user-facing media surface** (catalog / gallery / playback /
ingestion / error copy). `omnilink-port` and `OMNILINK_ENABLED` are
**backend/config dependencies only** — never product truth, never user-exposed
wording. Allowed phrasing when the dependency must be named:
"OmniMedia depends on the omnilink-port backend path in this deployment."

## Environment Limitation (binding honesty constraint)

This reconciliation was produced inside an ephemeral CI-style container with **no
authenticated browser session against a deployed origin**. True authenticated
browser E2E (screenshots / video / traces / live network captures / axe runs)
**cannot** be produced here. Every row that requires such evidence is marked
**BLOCKED** with its exact dependency. No such evidence is fabricated.

## Phase 0 Reconciliation Table

| Area | Status | Evidence | Required Next Action | Decision |
|---|---|---|---|---|
| PR #1511 gallery diff | VERIFIED | Diff present on branch; ConnectionsWidget reverted to display-only "Integrated Apps Gallery"; HEAD `6fe51c4` commit `fix(omnidash): revert Connections split back to a display-only Integrated Apps Gallery`; CI + Cloudflare preview green | None for diff-level scope | PASS |
| Integrated Apps Gallery preview | VERIFIED | Cloudflare preview green per PR #1511 status; gallery is display-only by design (no live action surface in this widget) | Authenticated visual confirmation deferred to release certification | PASS |
| Full build/test | VERIFIED | CI green on PR #1511 (build + test gates reported passing) | None for diff-level scope | PASS |
| OmniMedia error | VERIFIED (defect) / FIXED (this PR) | Screenshot: "Couldn't load your media: Edge Function returned a non-2xx status code." Root cause: `apps/omnihub-site/dashboard/lib/omniMediaCatalog.ts` rethrew raw SDK `error.message`, rendered verbatim in `apps/omnihub-site/dashboard/components/media/OmniMediaGallery.tsx`. Fix confirmed in code: client collapses all failures to stable `OmniMediaError` codes (`omnimedia_catalog_failed` / `_ingest_failed` / `_delete_failed`, lib lines 30-51, 105-153); gallery now shows honest i18n copy "OmniMedia is temporarily unavailable. Retry, or check media service status." (gallery line 128) with Retry control (line 138) | Live authenticated re-run to confirm honest copy renders end-to-end | PASS (code fix) / BLOCKED (live confirm) |
| Truth Test evidence pack | PRESENT | `evidence/apex-truth-test/` created with 00-decision through 10-accessibility + tracked artifact subfolders (screenshots/traces/videos/console/network) | Fill static-scan and live-run rows when an authenticated session is available | PASS (structure) / BLOCKED (live rows) |
| Static fake-surface scan | UNVERIFIED | Method documented in `evidence/apex-truth-test/01-static-scan.md` (rg over apps/src/tests/memory/artifacts for fake-surface markers). Scan not yet executed in this pass; results section left as placeholder to be filled by the scan run | Run the documented rg sweep and record matches; classify each as failure only if production-facing without honest gating | BLOCKED |
| Product truth declaration | PRESENT | `evidence/apex-truth-test/02-product-truth.md` declares purpose/user/action/expected/required-systems/required-data/missing-prerequisite/decision for each surface | Live verification of each surface under auth | PASS (declaration) / BLOCKED (live) |
| Visible action inventory | PRESENT | `evidence/apex-truth-test/03-surface-inventory.md` inventories known OmniMedia controls: Play, Delete (full variant), Retry — labels, type, expected outcome, backend/auth requirements | Confirm `actual` column via live run | PASS (inventory) / BLOCKED (actual) |
| Network/API proof | UNVERIFIED | `evidence/apex-truth-test/05-network-api-proof.md`: expected POST `functions/v1/omnilink-port/omnimedia-catalog` -> 200 `{items}`. Code trace confirms empty owned catalog returns 200 `{items:[]}`; a non-2xx originates from a guard BEFORE the DB query (`OMNILINK_ENABLED !== 'true'` -> 503 at index.ts:1418-1419; origin not allowlisted -> 403 at :1423; missing/invalid JWT -> 401 at :746-751). Exact live code pending edge-function logs | Pull live `omnilink-port` (v32) logs to identify the exact non-2xx code | BLOCKED |
| Data provenance | VERIFIED (schema) | `public.omnimedia_assets` EXISTS live (RLS enabled, 0 rows) -> migration `20260628000000_omnimedia_pipeline.sql` applied. Catalog items derive from `omnimedia_assets` via signed URLs (mapped in `evidence/apex-truth-test/06-data-provenance.md`) | Live row-to-UI trace once assets exist and an auth session is available | PASS (schema) / BLOCKED (live row trace) |
| Refresh persistence | UNVERIFIED | OmniMedia data is server-persisted in `omnimedia_assets`, so it survives refresh by design (documented in `evidence/apex-truth-test/07-refresh-persistence.md`) | Live refresh proof under authenticated session | BLOCKED |
| Negative-state honesty | VERIFIED (code) | Error state now honest: collapsed error codes + i18n copy + Retry + `role="alert"` (gallery line 120). Negative states to test enumerated in `evidence/apex-truth-test/08-negative-states.md` | Live exercise of each negative state (disabled backend, denied origin, expired JWT, empty catalog) | PASS (code) / BLOCKED (live) |
| Visual preservation | BLOCKED | No authenticated browser session -> no before/after screenshots producible here (`evidence/apex-truth-test/09-visual-quality.md`) | Capture before/after screenshots under auth at release certification | BLOCKED |
| Accessibility baseline | VERIFIED (code) | `role="alert"` on error region (gallery line 120); `aria-label` on Play (line 169) and Delete (line 190) now i18n-wired. Live axe run not possible here (`evidence/apex-truth-test/10-accessibility.md`) | Run axe against authenticated OmniMedia surface | PASS (code) / BLOCKED (axe run) |

## Final Decision (contract final-language rule)

**GO for diff-level / gallery-remediation verification only. NO-GO for full
release certification until APEX Bible truth validation evidence passes.**

OmniMedia remediation: the user-facing error-honesty defect is **fixed in code in
this PR** (stable error codes + honest i18n copy + Retry + last-good catalog
preservation + in-flight dedupe). Live authenticated confirmation of the rendered
behavior remains **BLOCKED** on an authenticated browser session and on live
`omnilink-port` edge-function logs.
