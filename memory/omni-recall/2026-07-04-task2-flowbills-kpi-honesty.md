# 2026-07-04 — Task 2 FlowBills KPI Honesty Fix

Task 2 from `APEX-EC-20260704-01` corrected the remaining OmniDash FlowBills KPI labeling issue after the earlier footer-only guard.

## Verified live surfaces

- `apps/omnihub-site/dashboard/components/SystemHealthRow.tsx`
- `apps/omnihub-site/dashboard/components/SidebarKpiBar.tsx`

## Canonical rule

`flowbills_demos` and `flowbills_paid_accounts` are FlowBills business metrics. They must not be presented as system telemetry such as `Events Tracked`, `Guardian Loops`, `Events`, or `Loops`.

Use these i18n keys for the FlowBills-derived labels on system-health-adjacent surfaces:

- `dashboard.systemHealth.flowbillsDemoCount`
- `dashboard.systemHealth.flowbillsPaidAccounts`

## Regression guard

`scripts/ci/check-omnidash-integrity.mjs` now scans `FooterObservabilityRow.tsx`, `SystemHealthRow.tsx`, and `SidebarKpiBar.tsx` for FlowBills fields mapped to telemetry-like labels or old telemetry i18n keys.

## Validation

- `node scripts/ci/check-omnidash-integrity.mjs`
- `npm run test -- tests/omnidash/system-health-row.spec.tsx tests/omnidash/kpi-hierarchy.spec.tsx tests/omnidash/ui-surface-integrity.test.tsx`
