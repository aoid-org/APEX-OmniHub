# OmniDash Surface — Release 1.8.3 Frozen Baseline (2026-07-04)

**Release:** `1.8.3` (patch) · **Branch:** `claude/omnidash-surface-alignment-fsrs31` · **PR:** #1529 (base `main`)
**Status:** RELEASE-READY — all widget surfaces validated. Owner cuts the final gate by merging the PR.
**Purpose:** Authoritative, reproducible snapshot of the OmniDash surface state at 1.8.3. Read this to
reproduce the exact build + validation without re-deriving anything.

> Discipline note (per `memory/omni-recall/CLAUDE.md`): dated/archived snapshots are immutable records
> and are **not** rewritten. This file is the new canonical snapshot for 1.8.3; prior dated snapshots
> remain as historical evidence.

---

## 1. What shipped (canonical surface facts — the frozen values)

### Brand marks
- In-flow App-Gallery mark (`data-testid="omnidash-canvas-logo"`) = `IMG_APEX_WM`
  (`src/assets/omnidash/apex_omnihub_wordmark.png`). **Enlarged + faded:** `height:92, maxWidth:55%,
  opacity:0.16` — a quiet background mark, never the visual anchor. Header product logo
  (`top-header-logo`) stays `IMG_WORDMARK` (OmniDash hexagon). Full-canvas watermark unchanged.

### Glass translucency (no grid bleed)
- Awaiting tiles (`.ose-integrated-apps-slot`): **no element-level `opacity`** (dashed border + label
  carry the "awaiting" feel).
- `GlassCard` (`designComponents.tsx`): `backdrop-filter: blur(20px) saturate(150%)` + `WebkitBackdropFilter`.
- Canvas card tokens (`theme.css`, +20% from first pass): light `--omni-card: rgba(255,255,255,0.96)` /
  `--omni-card-hover: rgba(241,245,249,1)`; dark `--omni-card: rgba(14,22,40,0.936)` /
  `--omni-card-hover: rgba(17,29,51,0.984)`.

### Unified rail/sidebar glassmorph tiles (one spec, all tiles)
Applied to **OmniTrace, OmniSentry, Ops Controls (SentinelPanel), OmniMedia, System Status
(SystemHealthRow), and the sidebar System KPIs (SidebarKpiBar)**:
- Border: `1px solid rgba(249,115,22,0.25)` (orange) — uniform.
- Fill opacity: `0.06` (orange `rgba(249,115,22,0.06)` for orange-tint tiles; white `rgba(255,255,255,0.06)`
  for OmniSentry/Ops; OmniSentry keeps green `rgba(52,211,153,0.06)` when enabled).
- `backdrop-filter: blur(16px) saturate(140%)` on the rail tiles.
- **OmniTrace** is now a real tile: chrome lives on the feed root (`omni-trace-feed`), inner event list
  capped (`maxHeight:190`, scroll) so the tile stays bounded; the inner Replay sub-panel is a lighter
  nested panel; the redundant `rt_trace` `maxHeight` wrapper was removed.
- **System Status** (`SystemHealthRow`) wrapped in the same tile with a `SYSTEM STATUS` header; no explicit
  width (rail column stretches it to full rail width, matching siblings).

### Hero-row + drag
- Agent / OmniSlate / Ecosystem headers share one `height:44` flush divider.
- Magnetic alignment (additive): `resolveAlignment()` + `ALIGN_THRESHOLD_PX=10` in `lib/widgetLayout.ts`
  (pure, per-axis edge/center snap within 10px), applied in `DraggableWidget.handlePointerUp` **before**
  `resolveCollisions` (collision-avoidance keeps final say). Live orange guide line during drag. Long-press
  state machine, pointer-capture, `resolveCollisions`, `persistPosition`, `SNAP_GRID`, flick-to-set unchanged.

---

## 2. Validation evidence (how it was proven)

- **Frontend tests:** `vitest run tests/omnidash tests/unit/widgetLayout.test.ts` → **726 passed**, 0 failed
  (769 incl. skipped/todo, 76 files). New `resolveAlignment` unit coverage included.
- **Integrity guards:** `npm run check:omnidash` 37/37 · `npm run check:omni-skin` 6/6.
- **Static gate:** `npm run typecheck` clean · `eslint` (touched files) clean · `npm run build` green.
- **OmniMedia player (proven end-to-end):** real media fed to the live built player → `<video>` decoded
  frames (960×540) and `currentTime` advanced 2.49s→3.99s, `readyState 4`, not paused. Honesty guards
  (`omnimedia-gallery-honesty`, `zero-mock-widgets`) pass — no fake/demo content introduced.
- **OmniMedia production backend (Management API, read-only, project `rtopreovkywofgwgmozi` "APEX-OmniHub"):**
  - `omnilink-port` edge function: **DEPLOYED**.
  - `omnimedia_assets` table exists — columns `id, owner_user_id, title, kind, storage_path, bucket,
    external_url, provider, mime_type, size_bytes, created_at, updated_at`; **RLS enabled**; **4 policies**.
  - `count(*) = 0` → production correctly shows the honest "No media yet — upload from Files" empty state.
    The "temporarily unavailable" seen in the local QA build was a no-backend artifact, **not** a defect.
- **CI (PR #1529):** green across the suite on the pushed commits (build-and-test, governance, security,
  OSE guard, ops-doc guard, SonarCloud quality gate, both Cloudflare Pages deploys).

**Environment limit (recorded honestly):** the production Supabase *project host*
(`rtopreovkywofgwmozi.supabase.co`) is blocked by this sandbox's egress policy (proxy `connect_rejected`),
so a live in-browser catalog fetch could not be run here; the backend was instead validated via the
Supabase Management API (`api.supabase.com`), which is reachable. End-to-end live playback in production
requires one owner upload via Files.

---

## 3. Reproduce the build + validation

```bash
npm ci
npm run typecheck && npm run check:omnidash && npm run check:omni-skin
npx vitest run tests/omnidash tests/unit/widgetLayout.test.ts
npm run build
```

Visual/playback QA harness (offline, no production access — renders the real production bundle with a
stubbed backend; injects a synthetic session and a mocked catalog so the proven player can play a real
WebM same-origin). Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (proprietary codecs
absent → use WebM/VP9, not MP4/H.264). Backend reachability for OmniMedia is validated via the Supabase
Management API, not the egress-blocked project host.

---

## 4. Frozen baseline (files changed in PR #1529)

| File | Change |
|---|---|
| `apps/omnihub-site/dashboard/OmniDashShell.tsx` | canvas-logo asset + size/fade; Ecosystem header 44px; `rt_trace` wrapper simplified |
| `apps/omnihub-site/dashboard/components/designComponents.tsx` | `GlassCard` blur + Webkit prefix |
| `apps/omnihub-site/dashboard/components/OmniTraceFeed.tsx` | feed root = glassmorph tile; inner list cap; replay sub-panel |
| `apps/omnihub-site/dashboard/components/OmniSentryWidget.tsx` | orange border; 0.06 fill |
| `apps/omnihub-site/dashboard/components/SentinelPanel.tsx` | glass card wrap; orange border; 0.06 fill |
| `apps/omnihub-site/dashboard/components/SidebarKpiBar.tsx` | orange 0.25 border; 0.06 fill |
| `apps/omnihub-site/dashboard/components/SystemHealthRow.tsx` | wrapped tile (border/fill/blur + header) |
| `apps/omnihub-site/dashboard/components/media/OmniMediaLaunchWidget.tsx` | backdrop-filter; 0.06 fill |
| `apps/omnihub-site/dashboard/lib/widgetLayout.ts` | `resolveAlignment` + `ALIGN_THRESHOLD_PX` |
| `apps/omnihub-site/dashboard/DraggableWidget.tsx` | alignment wiring + guide-line overlay |
| `apps/omnihub-site/src/styles/theme.css` | `--omni-card(/-hover)` translucent +20% |
| `apps/omnihub-site/dashboard/omniSkin.css` | removed Awaiting-tile `opacity` |
| `tests/unit/widgetLayout.test.ts` | `resolveAlignment` unit coverage |
| `APEX_SURFACE_REGISTRY.md`, `docs/audits/…`, this baseline | docs |

**No** migrations, edge-function, env-var, or start-command changes. Constraint set in CLAUDE.md
("OmniDash Canonical Layout Law") preserved — `check:omnidash` green.
