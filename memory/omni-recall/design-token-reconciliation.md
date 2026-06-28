# OmniDash Design Token Reconciliation

Status: active · Established 2026-06-28 (post-1510 UI/UX remediation, branch
`claude/apex-omnihub-rc-remediation-d9txs1`).

## Problem
Three token sources coexisted with no documented precedence:
- `apps/omnihub-site/dashboard/designSystem.ts` — the `T` object wrapping `--omni-*` vars.
- `apps/omnihub-site/src/styles/omnidash-layout.css` — `--od-*` vars (`:23-46`).
- `apps/omnihub-site/src/styles/theme.css` — `--color-*` (app-wide) **and** `--omni-*`.

A secondary hazard: appending hex alpha to a CSS variable — `` `${T.orange}22` `` resolves to
`var(--omni-orange)22`, which is **invalid CSS** and silently paints transparent.

## Canon (single precedence)
1. **`--omni-*` is the canonical semantic dashboard token layer.** `designSystem.ts` `T`
   continues to reference `--omni-*` only.
2. **`--od-*` becomes an alias layer** mapping to `--omni-*`. No new `--od-*` tokens.
   Existing `--od-*` consumers (e.g. `SystemHealthRow.tsx`) keep working through the alias.
3. **`--color-*` remains app-wide** for non-dashboard surfaces (login, public layout).
   Not migrated; out of scope to avoid blast radius.

## Migration policy
- Do not rename tokens globally this sprint (surgical, decomplexified).
- No new `--od-*`. Prefer `--omni-*` in new/touched code.
- Replace `var()`+hex-alpha concatenation with explicit `rgba()`/`color-mix()` or a dedicated
  alpha token, in **touched files only**.

## Alias block (added to `omnidash-layout.css`)
```css
:root {
  --od-bg-canvas:    var(--omni-bg);
  --od-bg-sidebar:   var(--omni-surface);
  --od-text-primary: var(--omni-t1);
  --od-accent:       var(--omni-orange);
  --od-green:        var(--omni-green);
  /* …mapped to existing --omni-* equivalents; values not duplicated */
}
```
(Exact mapping reconciled against current `--od-*`/`--omni-*` values at implementation time.)

## Locked constraints (user directives)
- **Font family stays Space Grotesk** (`--font-sans` in `fonts.css`). Font work only removes
  duplicate runtime `@import`s; the family and the zero-shift `Space Grotesk Fallback` stay.
- **i18n + language switcher are untouched.** All new user-facing copy (KPI labels, empty
  states, avatar upload messages) MUST use i18n keys via `apps/omnihub-site/src/i18n` — the
  `i18n-hardcoded-ui-check` gate forbids hardcoded UI strings.
- **Increase persistence where beneficial:** avatar (`user_metadata.avatar_url` + Storage),
  observability toggle state (per-user, via existing layout-persistence pattern), and
  per-breakpoint layout (`omnidash_layout_v2:{userId}:{breakpoint}`).
- **Branding preserved:** glassmorphism, orange accent, dark Sentinel theme, 3-tier depth
  unchanged. Token work is structural, not a restyle.
