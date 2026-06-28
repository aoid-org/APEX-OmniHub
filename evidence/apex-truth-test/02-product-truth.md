# APEX Truth Test — Product Truth Declaration (02)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`

Each surface declares: Purpose / Primary user / Primary action / Expected result /
Required systems / Required data / Missing prerequisite / Decision.

Decision legend: VERIFIED (live or code-confirmed), PRESENT (declared, live
unverified), BLOCKED (needs authenticated session or live logs).

---

## OmniDash

- **Purpose:** Primary operator dashboard aggregating APEX surfaces.
- **Primary user:** Authenticated operator/owner.
- **Primary action:** Navigate to and monitor connected surfaces (gallery, board, media, KPIs).
- **Expected result:** Dashboard renders real, owned data for the signed-in user.
- **Required systems:** Supabase auth + dashboard app (`apps/omnihub-site/dashboard`).
- **Required data:** User session; per-surface owned records.
- **Missing prerequisite:** Authenticated browser session (not available here).
- **Decision:** BLOCKED (live), PRESENT (declared).

## Integrated Apps Gallery

- **Purpose:** Display-only showcase of integrated apps (reverted from the
  ConnectionsWidget split in PR #1511).
- **Primary user:** Authenticated operator.
- **Primary action:** View the set of integrated apps (no live action surface in
  this widget by design).
- **Expected result:** Static, display-only gallery renders; no controls imply
  unbacked actions.
- **Required systems:** Dashboard app render only.
- **Required data:** Integrated-apps list (display-only content).
- **Missing prerequisite:** Authenticated visual confirmation.
- **Decision:** VERIFIED (diff: display-only by design; CI + preview green) /
  BLOCKED (authenticated visual).

## APEX Ecosystem — "Add APEX App"

- **Purpose:** Entry point to add/connect an APEX app to the ecosystem.
- **Primary user:** Authenticated operator/owner.
- **Primary action:** Initiate add/connect flow.
- **Expected result:** Real connect flow backed by `omnilink-port` OmniBoard
  endpoints (auth-gated; 401 if unauthenticated, see index.ts:842-885).
- **Required systems:** Supabase auth; `omnilink-port` Edge Function (v32, ACTIVE).
- **Required data:** User session; app catalog/connection records.
- **Missing prerequisite:** Authenticated session.
- **Decision:** BLOCKED (live), PRESENT (declared).

## OmniBoard

- **Purpose:** Board surface for connected/managed apps.
- **Primary user:** Authenticated operator.
- **Primary action:** View and manage board entries.
- **Expected result:** Real owned board data via `omnilink-port` (auth-gated).
- **Required systems:** Supabase auth; `omnilink-port` Edge Function.
- **Required data:** User session; board records.
- **Missing prerequisite:** Authenticated session.
- **Decision:** BLOCKED (live), PRESENT (declared).

## OmniMedia — right-rail widget

- **Purpose:** USER-FACING media surface entry: compact view of the user's media catalog.
- **Primary user:** Authenticated owner of the media.
- **Primary action:** View catalog summary / open media.
- **Expected result:** Owned catalog renders; empty catalog renders an honest
  empty state (code trace: empty owned catalog -> HTTP 200 `{items:[]}`).
- **Required systems:** Supabase auth; `public.omnimedia_assets` (RLS); OmniMedia
  depends on the omnilink-port backend path in this deployment.
- **Required data:** User session; rows in `omnimedia_assets`.
- **Missing prerequisite:** Authenticated session + non-empty catalog for full trace.
- **Decision:** VERIFIED (schema present, error-honesty fixed in code) / BLOCKED (live).

## OmniMedia — modal / playback flow

- **Purpose:** Play a selected media asset.
- **Primary user:** Authenticated owner.
- **Primary action:** Play button on a catalog item.
- **Expected result:** Asset streams/plays via signed URL.
- **Required systems:** Supabase auth + Storage signed URLs; `omnimedia_assets`;
  OmniMedia depends on the omnilink-port backend path in this deployment.
- **Required data:** Asset row + valid signed URL.
- **Missing prerequisite:** Authenticated session + an asset to play.
- **Decision:** BLOCKED (live), PRESENT (declared).

## Files upload feeding OmniMedia

- **Purpose:** Ingest uploaded files into the OmniMedia catalog.
- **Primary user:** Authenticated owner.
- **Primary action:** Upload a file (ingestion).
- **Expected result:** New `omnimedia_assets` row created; appears in catalog.
  Client ingestion failures collapse to `omnimedia_ingest_failed` (catalog lib).
- **Required systems:** Supabase auth + Storage; ingestion path; `omnimedia_assets`.
- **Required data:** User session; uploadable file.
- **Missing prerequisite:** Authenticated session + write path exercise.
- **Decision:** VERIFIED (error code path in code) / BLOCKED (live ingestion).

## KPI band

- **Purpose:** Headline KPI metrics for the operator.
- **Primary user:** Authenticated operator.
- **Primary action:** Read KPI values.
- **Expected result:** Real computed/owned metrics (no hardcoded sample figures).
- **Required systems:** Supabase auth + metrics source.
- **Required data:** User session; metric records.
- **Missing prerequisite:** Authenticated session; static-scan confirmation no
  hardcoded values back the band.
- **Decision:** BLOCKED (live + static scan pending).

## Observability / M03 panels

- **Purpose:** Operational observability panels (M03).
- **Primary user:** Authenticated operator/admin.
- **Primary action:** Read observability state.
- **Expected result:** Real telemetry/state, honestly gated when unavailable.
- **Required systems:** Supabase auth + telemetry/observability source.
- **Required data:** User session; observability records.
- **Missing prerequisite:** Authenticated session.
- **Decision:** BLOCKED (live), PRESENT (declared).
