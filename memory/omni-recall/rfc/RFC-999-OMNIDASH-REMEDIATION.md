# RFC-999: OmniDash Remediation

## 1. Summary
This RFC documents the fixes applied to the OmniDash codebase, specifically targeting the `LinksModule.tsx` TS errors and `WorkflowsModule.tsx` file size limits (500 lines) required by the governance gate.

## 2. Motivation
The CI pipeline is failing due to:
1. `LinksModule.tsx` having an incorrect import for `omniSlateStore`.
2. `WorkflowsModule.tsx` exceeding the 500-line limit policy.

## 3. Implementation
- Fixed `LinksModule.tsx` imports by using the `@omnihub/stores/omniSlateStore` path correctly mapped in `tsconfig.app.json` and `vitest.config.ts`.
- Refactored `WorkflowsModule.tsx` to under 500 lines.
- Fixed TS2322 by replacing `source: 'handoff'` with `source: 'system'`.

## 4. Drawbacks
None.

## 5. Alternatives
N/A
