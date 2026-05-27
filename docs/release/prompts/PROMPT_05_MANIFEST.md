# PROMPT 05: OmniDash Truthful State Validation

## Mission
Eliminate static fallback data and mandate honest state reporting in OmniDash.

## Success Criteria
- [x] All modules report `stateKind: 'live' | 'demo' | 'local' | 'unavailable'`.
- [x] Fetch failures render as `UNAVAILABLE` unless explicitly flagged as `demo`.
- [x] Distinct visual badges implemented for each state.
- [x] `verify:claim-hygiene` passes.

## Execution
- Updated `ModuleRegistry.ts` and `useOmniModuleState.ts` to strictly type the state kind.
- Refactored `ModuleShell.tsx` to render state-dependent badges.
- `moduleData.json` explicitly flagged demo modules to bypass the UNAVAILABLE hard stop for required visual demonstrations.
