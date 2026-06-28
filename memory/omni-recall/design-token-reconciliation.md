# OmniDash Design Token Reconciliation

Status: **resolved (Layer 1-3 implemented)** · Established 2026-06-28 (post-1510 UI/UX
remediation) · Updated 2026-06-28 (CCEX-OSE-001 — APEX OmniSkin Engine, Phases 0-3),
branch `claude/apex-omnihub-rc-remediation-d9txs1`.

## Problem (historical)
Three token sources coexisted with no documented precedence, and two independent `T`
object definitions (`designSystem.ts` and `designSystem.tsx`) silently diverged depending
on bundler module-resolution order:
- `apps/omnihub-site/dashboard/designSystem.ts` / `.tsx` — each defined its own `T` object
  wrapping `--omni-*` vars.
- `apps/omnihub-site/src/styles/omnidash-layout.css` — `--od-*` vars.
- `apps/omnihub-site/src/styles/theme.css` — `--color-*` (app-wide) **and** `--omni-*`.

A secondary hazard: appending hex alpha directly after a CSS variable reference —
`` `${T.orange}22` `` — resolves to `var(--omni-orange)22`, which is **invalid CSS** and
silently drops the declaration (paints fully transparent). This pattern existed in ~33
call sites across `OmniDashShell.tsx` and `M03Panels.tsx`.

## Resolution — APEX OmniSkin Engine (OSE v1.0)
The dual-`T`-definition and invalid-CSS hazards are resolved via a 4-layer engine
(CCEX-OSE-001, Phases 0-3 complete; Layer 4 is a future contract):

- **Layer 1 — Token Forge** (`apps/omnihub-site/dashboard/omniSkinTokens.ts`, NEW): the
  single canonical source. Exports `CHANNELS` (decimal RGB triples per brand color),
  `omniRgba(channel, alpha)` (builds `rgba()` strings — the fix for the var()+hex-alpha
  hazard), `T` (the `--omni-*` CSS-var token map), `NAV_BG`/`NAV_BORDER`/`NAV_SHADOW`
  (composite nav-state presets), and `HEALTH_PALETTE` (red/yellow/green status presets
  with both the `rgba()` fill/border and the raw decimal channel string).
- **`designSystem.ts`** and **`designSystem.tsx`** now **re-export** `T` (and the other
  Layer-1 exports) from `omniSkinTokens.ts` instead of each defining their own copy. The
  module-resolution ambiguity is eliminated — both files point at the same source.
  `designSystem.tsx`'s `StatusDot`/`GlassCard`/`SectionLabel` components are unchanged
  (and remain dead code — all 5 real import sites pull these components from
  `designComponents.tsx` instead; tracked but intentionally untouched, out of scope).
- **Layer 2 — Static CSS** (`apps/omnihub-site/dashboard/omniSkin.css`, NEW): the 8
  `@keyframes` (`apexPulse`, `apexShimmer`, `apexFadeIn`, `navGlow`, `ringRotate`,
  `ringBreath`, `ringBreath2`, `scanLine`) and shell-scoped resets that previously lived
  in a JSX `<style>` tag inside `OmniDashShell.tsx` (re-injected into the DOM on every
  render). Imported exactly once, in `apps/omnihub-site/src/main.tsx`. Deliberately
  excludes the Google Fonts `@import` that was also in the old `<style>` tag — that load
  is already covered by `omnidash-layout.css` and `index.html`'s preconnect/preload
  links, so re-adding it here would just restore a third redundant render-blocking fetch.
- **Layer 3 — OSE Guard** (`scripts/ci/check-omni-skin.mjs`, NEW; wired into
  `.github/workflows/apex-governance.yml` as the `ose-token-contract` job, which feeds
  `governance-gate`'s `needs:` aggregation): a 6-rule CI gate run via
  `npm run check:omni-skin`. Enforces: no `<style>` tags in dashboard TSX; no invalid
  `var()`+hex-alpha pattern in dashboard module files or in `OmniDashShell.tsx`; no
  `var(--od-*)` references in the Shell/token-forge files this contract owns (NOT a
  repo-wide ban — see Canon §2 below); `omniSkin.css` imported exactly once in
  `src/main.tsx`; the `src/components/dashboard/` ghost path holds only the allowlisted
  `OmniTracePanel.tsx`.
- **Layer 4 — Surface Snapshot Registry**: out of scope, tracked as a future contract.

## Canon (single precedence) — unchanged, now enforced by Layer 3
1. **`--omni-*` is the canonical semantic dashboard token layer.** `T` (now sourced from
   `omniSkinTokens.ts`) references `--omni-*` only.
2. **`--od-*` remains a separate, larger alias-layer migration**, explicitly out of
   CCEX-OSE-001's surgical scope. Existing `--od-*` consumers (`FloatingWindow.tsx`,
   `OmniSentryWidget.tsx`, `OmniTraceFeed.tsx`, `SentinelPanel.tsx`, `SystemHealthRow.tsx`,
   `WidgetShell.tsx`) are unchanged by this contract. The OSE Guard's `--od-*` rule only
   checks the 4 files this contract directly owns (`OmniDashShell.tsx`,
   `omniSkinTokens.ts`, `designSystem.ts`, `designSystem.tsx`) — a literal dashboard-wide
   ban was deliberately rejected as architecturally wrong (the correct fix for the 6
   files above is aliasing per §3, not deletion) and would fail today for unrelated,
   out-of-scope files.
3. **`--od-*` becomes an alias layer** mapping to `--omni-*` when that separate migration
   is executed. No new `--od-*` tokens in the meantime. This alias-layer migration
   (the `omnidash-layout.css` `--od-* → var(--omni-*)` block) is **not yet implemented**
   — it remains a documented follow-up, not part of CCEX-OSE-001.
4. **`--color-*` remains app-wide** for non-dashboard surfaces (login, public layout).
   Not migrated; out of scope to avoid blast radius.

## Migration policy
- Do not rename tokens globally (surgical, decomplexified). No new `--od-*`. Prefer
  `--omni-*` / `omniSkinTokens.ts` in new/touched code.
- `var()`+hex-alpha concatenation is now a CI-enforced hard failure (OSE Guard Rules 2/4)
  in dashboard module files and `OmniDashShell.tsx`. Use `omniRgba(channel, alpha)` or an
  explicit `rgba(r,g,b,a)` literal instead.
- Hex-byte → decimal-alpha reference used during remediation: `0x06`→0.02, `0x08`→0.03,
  `0x12`→0.07, `0x15`→0.08, `0x18`→0.09, `0x22`→0.13, `0x28`→0.16, `0x33`→0.20, `0x44`→0.27,
  `0x55`→0.33, `0x66`→0.40, `0x88`→0.53, `0xaa`→0.67, `0xf0`→0.94.

## Locked constraints (user directives) — unchanged
- **Font family stays Space Grotesk** (`--font-sans` in `fonts.css`). Font work only
  removes duplicate runtime `@import`s; the family and the zero-shift
  `Space Grotesk Fallback` stay.
- **i18n + language switcher are untouched.** All new user-facing copy (KPI labels, empty
  states, avatar upload messages) MUST use i18n keys via `apps/omnihub-site/src/i18n` —
  the `i18n-hardcoded-ui-check` gate forbids hardcoded UI strings.
- **Increase persistence where beneficial:** avatar (`user_metadata.avatar_url` +
  Storage), observability toggle state (per-user, via existing layout-persistence
  pattern), and per-breakpoint layout (`omnidash_layout_v2:{userId}:{breakpoint}`).
- **Branding preserved:** glassmorphism, orange accent, dark Sentinel theme, 3-tier depth
  unchanged. Token work is structural, not a restyle.

## Verification (CCEX-OSE-001, 2026-06-28)
`npm run typecheck` / `npm run build` / `npm run lint -- --quiet` / `npm run test` /
`npm run check:omni-skin` all green. OSE Guard: 6/6 rules pass. Test suite: 3029 passed,
0 failed, 70 skipped (pre-existing, unrelated), 26 todo (pre-existing, unrelated).

## Open follow-ups (not part of this contract)
- `--od-* → var(--omni-*)` alias-layer migration (Canon §3) — not yet implemented.
- `designSystem.tsx`'s `StatusDot`/`GlassCard`/`SectionLabel` dead-code exports — flagged,
  not removed (contract instructed leaving these untouched).
- Layer 4 (Surface Snapshot Registry) — future contract.
