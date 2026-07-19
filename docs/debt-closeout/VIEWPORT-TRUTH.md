# Viewport breakpoint Audit (Track R)

This document presents the current breakpoint logic and maps the cutover behaviors between the active implementation and the requested APEX 5-tier viewport contract.

---

## Current Cutovers (As Implemented)

### JavaScript Breakpoints (`useViewport.ts`)
- **Mobile**: `w <= 640px` (`isMobile = true`)
- **Tablet**: `w > 640px && w <= 1024px` (`isTablet = true`)
- **Desktop**: `w > 1024px` (`isDesktop = true`)

### CSS Breakpoints (`omniSkin.css`)
- **Mobile & Tablet Layouts**: `@media (max-width: 1024px)`
- **Narrow Desktop Layouts**: `@media (min-width: 1025px) and (max-width: 1365px)` (shrinks sidebar/right panels from 300px to 240px)
- **Standard Desktop Layouts**: `w >= 1366px`

---

## Requested Cutovers (APEX 5-Tier Breakpoint Contract)

- **XS Mobile**: `320px - 374px`
- **SM Mobile**: `375px - 767px`
- **MD Tablet Portrait**: `768px - 1023px` (compact 56px icon rail requested)
- **LG Tablet Landscape / Laptop**: `1024px - 1279px`
- **Desktop**: `w >= 1280px`

---

## Conflict Assessment (Track R)

- **Locked Files**:
  - `apps/omnihub-site/dashboard/OmniDashShell.tsx` is strictly **LOCKED** (modified in merged PR #1640 and protected from duplication/rewrite).
- **Impact**: We cannot modify the shell layout to render `OmniTabletRail`, wire the compact icon sidebar, or update responsive CSS selectors inside locked components.
- **Audit Conclusion**: Track R remains in **AUDIT ONLY** status. The breakpoint table has been documented. No source modifications are made to preserve the integrity of the shell-governance layout code.
