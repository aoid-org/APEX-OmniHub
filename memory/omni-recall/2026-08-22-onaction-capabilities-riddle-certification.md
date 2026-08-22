---
title: OmniDash onAction Capabilities & Riddle Audit Certification Record
date: 2026-08-22
status: certified
commit: d18107c6
repo: aoid-org/APEX-OmniHub
---

# OmniDash onAction Capabilities & Riddle Audit Certification Record (2026-08-22)

## 1. Executive Summary
This record certifies the remediation and alignment of the central capability contract `moduleActionCapabilities.ts` with live backend pipelines across the OmniDash sidebar modules (`Billing`, `Files`, `Workflows`, `Automations`, `OmniBoard`), resolving the discrepancy identified by the Riddle Prompt Audit (`apex-riddler`).

## 2. Remediated Capabilities & Backend Mappings

| Module | Action ID(s) | Supported | Backend Target & Behavior |
|---|---|:---:|---|
| **Billing** | `billing-portal`, `manage-plan`, `download-invoices` | `true` | Invokes Supabase Edge Function `create-billing-portal` with session validation; opens live Stripe Customer Portal URL for the authenticated enterprise account. |
| **Files** | `upload_file`, `upload`, `delete_file` | `true` | Interacts directly with tenant-scoped Supabase Storage (`omnihub-files` for generic docs, `omnimedia-assets` for playable media); performs real uploads and deletions. |
| **Workflows** | `trigger_run`, `create_workflow`, `create-workflow` | `true` | `trigger_run` executes the selected pipeline via Supabase Edge Function `execute-workflow`; `create_workflow` opens the inline pipeline authoring form. |
| **Automations** | `execute-automation`, `create-automation`, `create-rule` | `true` | `execute-automation` dispatches the selected rule via Supabase Edge Function `execute-automation`; `create-automation` opens the inline trigger builder. |
| **OmniBoard** | `connector.list`, `connector.connect`, `connector.test` | `true` | Routes through live MCP dispatcher and Orchestrator API for third-party SaaS integrations. |

## 3. Right-Rail Layout & System Health Visibility
- Bounded vertical height across right-rail cards:
  - `OmniMediaLaunchWidget`: Removed fixed `minHeight: 280px` to allow compact scaling.
  - `SentinelPanel`: Tightened bottom padding and toggle row margins.
  - `SystemHealthRow`: Streamlined metric card padding (`6px 8px`) and font size (`16px`).
  - Added `paddingBottom: 96px` to `.omni-right-panel` to ensure full scroll clearance above footer.
- Result: System Health telemetry (`FlowBills Demos`, `System Health`, `Paid Accounts`, `Stale Checks`) is 100% visible and un-obfuscated above the fold and scrollable without truncation on all desktop viewports.

## 4. Multi-Viewport Responsive Validation
- **Desktop (1440x900)**: Full 3-column layout, interactive modal opens/dismissals, live OmniSlate prompt execution, DueRadar and Antigravity context droplets.
- **Tablet (820x1180)**: Smooth sidebar collapse to drawer, responsive sheet transitions, touch-safe targets.
- **Mobile (390x844)**: Responsive bottom navigation bar (`apps`, `insights`, `more`, `slate`, `home`), zero horizontal scroll leakage, touch targets >=44px.

## 5. Verification Proof
- `npm run typecheck` -> Exit code 0 (0 errors)
- `npm run lint` -> Exit code 0 (0 warnings)
- `npm run check:omnidash` -> 43/43 PASSED
- `npm run check:pwa` -> 15/15 PASSED
- `npm run check:react` -> React 18.3.1 singleton verified
- Production deployed to Cloudflare Pages (`https://apexomnihub.icu`) and CDN cache purged.
