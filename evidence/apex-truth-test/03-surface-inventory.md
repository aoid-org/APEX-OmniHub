# APEX Truth Test — Visible Action / Surface Inventory (03)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`

Inventory of user-visible controls. Decision legend:
`WORKS` (live-confirmed) · `HONESTLY GATED` (control + its negative/disabled state
is truthful) · `BLOCKED` (needs auth/live to confirm `actual`) · `FAKE` (no-op
presented as working — none found in code reviewed).

## Template (per control)

| Field | Value |
|---|---|
| Label | (visible text / aria-label) |
| Type | (button / link / input / ...) |
| Expected outcome | |
| Requires backend? | yes/no |
| Requires auth? | yes/no |
| Actual | (live result — BLOCKED if no session) |
| Decision | WORKS / HONESTLY GATED / BLOCKED / FAKE |

## OmniMedia Controls (known from code)

### Gallery item — Play button

| Field | Value |
|---|---|
| Label | `aria-label` = i18n `omnimedia.playLabel` -> "Play {title}" (gallery line 169) |
| Type | Button |
| Expected outcome | Plays the selected media asset via signed URL |
| Requires backend? | yes (signed URL / asset access; omnilink-port backend path) |
| Requires auth? | yes |
| Actual | BLOCKED — no authenticated session, no asset present (catalog 0 rows live) |
| Decision | BLOCKED |

### Gallery item — Delete button (full variant)

| Field | Value |
|---|---|
| Label | `aria-label` = i18n `omnimedia.deleteLabel` -> "Delete {title}" (gallery line 190) |
| Type | Button |
| Expected outcome | Deletes the asset; failure collapses to `omnimedia_delete_failed` (catalog lib line 151) |
| Requires backend? | yes (delete path; omnimedia_assets) |
| Requires auth? | yes |
| Actual | BLOCKED — no authenticated session / no asset to delete |
| Decision | BLOCKED |

### Error state — Retry button

| Field | Value |
|---|---|
| Label | i18n `omnimedia.retry` -> "Retry" (gallery line 138) |
| Type | Button |
| Expected outcome | Re-invokes catalog load; in-flight dedupe; preserves last-good catalog on repeat failure |
| Requires backend? | yes (re-invokes catalog) |
| Requires auth? | yes |
| Actual | Code path confirmed (Retry wired to reload; honest error region `role="alert"` line 120). Live click result BLOCKED |
| Decision | HONESTLY GATED (code) / BLOCKED (live click) |

## Notes

- No FAKE controls were found in the OmniMedia code reviewed: the error region is
  honestly labelled, Retry is wired to a real reload, and Play/Delete labels
  describe real backend actions (auth-gated).
- Full live `actual` confirmation requires an authenticated session and at least
  one asset in `omnimedia_assets` (currently 0 rows live).
