<!-- VALUATION_IMPACT: Guides adding Temporal workflows without systemic risk -->
<!-- Generated: 2026-02-03 -->
# Add New Workflow Runbook
1. Define interface in `src/temporal/workflows/types.ts`.
```ts
export interface WorkflowContract {
  name: string;
  version: string;
  inputs: Record<string, string>;
}
```
2. Create activities under `src/temporal/activities/`.
```ts
export async function captureVehicle(payload: { vin: string }) {
  return { ...payload, intakeTs: new Date().toISOString() };
}
```
3. Register workflow in `src/temporal/workers/index.ts`.
```ts
workflowClient.register({
  workflow: VehicleSaga,
});
```
4. Add integration test in `tests/workflows/vehicle.spec.ts`.
```ts
await workflowClient.start(VehicleSaga, { vin: '1HGCM82633A004352' });
```
5. Update registry documentation with metadata and triggers.
6. Deploy via `npm run deploy:workflows`.

## Common Pitfalls
| Issue | Resolution |
| --- | --- |
| Missing activity exports | Re-export from `activities/index.ts` |
| Workflow not registered | Confirm `workers/index.ts` imports it |
| No integration test | Add Vitest case and run `npm test -- --grep workflows` |

# Verify:
markdownlint docs/runbooks/ADD_NEW_WORKFLOW.md
