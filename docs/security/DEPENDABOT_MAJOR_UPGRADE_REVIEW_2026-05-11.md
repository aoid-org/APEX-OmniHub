# Dependabot Major Upgrade Review - 2026-05-11

## Audit Table

| PR | Dependency | Upgrade | Breaking Risk | Migration Notes | Smoke Tests Required | Recommendation | Reason |
|----|------------|---------|---------------|-----------------|----------------------|----------------|--------|
| #1117 | Capacitor iOS | 6 → 8 | High | iOS native plugin rebuild required | Mobile build/smoke | `HOLD` | Pending manual device verification due to iOS native breaking changes |
| #1118 | Capacitor CLI | 6 → 8 | High | Project sync rebuild required | Mobile build/smoke | `HOLD` | Coupled with #1117, pending sync verification |
| #1119 | wagmi | 2 → 3 | High | React hook signature changes in wagmi v3 | Web3 wallet connect/read smoke | `HOLD` | Requires manual smoke test of all wagmi hooks |
| #1120 | mysql-connector-python | 8 → 9 | Medium | Connection pooling arguments changed | Orchestrator Python tests | `MERGE_AFTER_GATES` | Low surface area, covered by orchestrator tests if passing |

Rules applied:
- No blind merge of major dependency bumps.
- Auto-merge recommendation given only if all gates pass and changes are backward compatible or covered by automated tests.
