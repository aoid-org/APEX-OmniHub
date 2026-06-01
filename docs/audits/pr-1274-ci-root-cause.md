# PR 1274 CI Root Cause Audit

## ESLint Warnings (Max-Warnings 0 Failure)
- `apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane.tsx`
  - 7:15  warning  'OmniSlateContextItem' is defined but never used
- `apps/omnihub-site/dashboard/components/modules/TranslationModule.tsx`
  - 58:20  warning  'setMetadata' is assigned a value but never used

## Vitest Failures
- The `npm run test` suite exited with code 0 in the test pass because some of the CI failures mentioned were product-truth mismatches that pass technically but violate the assertions or contain fake tests.
- Specifically, `tests/omnidash/theme-system.spec.tsx`, `tests/omnidash/zero-mock-widgets.spec.tsx` and others contained `expect(true).toBe(true)` stubs.
- `tests/omnidash/apex-apps-contract.spec.ts` had product truth mismatch with the canonical six apps.

## Root Cause Categories
1. **ESLint max-warnings 0:** Unused imports and variables remaining after refactoring OmniSlate and TranslationModule.
2. **Product Truth Contract Mismatch:** APEX Apps list has drifted from the canonical six apps, resulting in incorrect test assertions and EcosystemPane rendering.
3. **OmniSlate Context Stale Shapes:** Some files still import the old `ContextItem` shape or don't use the required `OmniSlateContextItem` normalized shape.
4. **UniversalModalEngine:** Missing `selectedId` in payload.
5. **Junk Files:** `old_package.json` was left over.
