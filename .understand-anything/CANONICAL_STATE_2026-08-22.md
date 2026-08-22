# Canonical State Record - 2026-08-22 (Full GO onAction Capabilities & Right-Rail Layout Certified)

Authoritative snapshot of repo state as of 2026-08-22. Covers execution of Riddle Audit Remediation and Full GO Certification on `main` (commit `d18107c6`).

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File(s) | Canonical Behavior |
|---|---|---|
| **Module Action Capabilities Contract** | `apps/omnihub-site/dashboard/contracts/moduleActionCapabilities.ts` | Aligns the central capability contract with live backend pipelines. Declares explicit `supported: true` capabilities for `Billing` (`create-billing-portal`), `Files` (tenant-scoped Supabase Storage upload/delete), `Workflows` (`execute-workflow`), and `Automations` (`execute-automation`). Upgrades modules from stubs to live enterprise action runners. |
| **Module Shell Gating & Badges** | `apps/omnihub-site/dashboard/components/modules/ModuleShell.tsx` | Resolves action capabilities dynamically, surfaces honest error/status feedback, enables working action buttons without stub gating, and renders accurate `live` badges. |
| **Right-Rail Layout & System Health** | `apps/omnihub-site/dashboard/OmniDashShell.tsx`, `SystemHealthRow.tsx`, `SentinelPanel.tsx`, `OmniMediaLaunchWidget.tsx` | Compacts vertical bounds across right rail tiles (`paddingBottom: 96px`, compact `SystemHealthRow` metric cards, auto-scaling `OmniMediaLaunchWidget`), ensuring `SystemHealthRow` and all 4 telemetry metrics are 100% visible and un-obfuscated above the fold and scroll smoothly on all desktop viewports. |
| **Multi-Viewport Responsiveness** | `apps/omnihub-site/dashboard/OmniDashShell.tsx` | Validated across Desktop (1440x900), Tablet (820x1180), and Mobile (390x844). Seamless sidebar-to-drawer collapse, responsive bottom tab bar (`home`, `slate`, `apps`, `insights`, `more`), and full-height mobile sheets with touch targets >=44px. |
| **Surface Routing & App Branding** | `apps/omnihub-site/dashboard/OmniDashShell.tsx`, `ProviderLogo.tsx` | Strictly separates first-party APEX apps (`DueRadar` rendered exclusively in APEX Ecosystem with metallic "R" + cyan "D" radar brand SVG) from third-party SaaS integrations (`Google Antigravity 2.0` rendered in App Gallery with Rainbow Gravitational Arc brand SVG). |

## 2. Verified Invariants
- **Root Typecheck**: `npm run typecheck` (`tsc -b --noEmit`) -> **Exit code 0 (Zero compiler errors)**.
- **Root Lint**: `npm run lint` (`eslint .`) -> **Exit code 0 (Zero linter warnings)**.
- **OmniDash Invariants**: `npm run check:omnidash` -> **43/43 PASSED**.
- **PWA Integrity**: `npm run check:pwa` -> **15/15 PASSED**.
- **React Singleton**: `npm run check:react` -> **React 18.3.1 validated**.
- **Remote Origin Alignment**: `https://github.com/aoid-org/APEX-OmniHub.git` on `main`.
- **Cloudflare Pages Production**: Deployed and cache purged on `apexomnihub.icu`.
