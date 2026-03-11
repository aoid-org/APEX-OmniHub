# OmniDash / OmniBoard / OmniModal / OmniSpatial / OmniMedia Audit

## Scope
- apps/omnihub-site/src/layouts/OmniDash-new.jsx
- apps/omnihub-site/src/components/omnidash/OmniSpatialHost.tsx
- apps/omnihub-site/src/components/omnidash/OmniCanvas.tsx
- apps/omnihub-site/src/stores/omniModalStore.ts
- src/omnidash/useOmniDashAction.ts
- src/stores/omniBoardStore.ts
- src/stores/omniMediaStore.ts
- src/components/omnidash/media/GlobalMediaDock.tsx

## Findings
1. OmniModal runtime was wired with deterministic mode resolution and portal root support.
2. OmniMedia PiP dock implementation existed but was not mounted in OmniDash shell.
3. useOmniDashAction referenced stale OmniBoard store API (`hydrateConnector`, `setConnectorStatus`) causing type and runtime drift.
4. Dashboard app status typing was overly broad (`string`) and conflicted with `OmniDashConnectStatus` contract.
5. app-local omniModalStore header comment was malformed by an accidental import line in the comment block.

## Remediation Applied
- Mounted `GlobalMediaDock` in OmniDash layouts.
- Rewired `useOmniDashAction` to current OmniBoard contract (`hydrateIntegration`, `mountActiveApp`).
- Tightened DashboardOverview app status type to `'Live' | 'Partial'`.
- Repaired `omniModalStore` module header metadata.

## Remaining Known Gaps
- Legacy path duplication still exists between app-local and root stores/components.
- Full bounded-context migration to `features/omnidash` is still pending.
