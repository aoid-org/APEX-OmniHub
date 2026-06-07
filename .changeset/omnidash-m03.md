---
"apex-omnihub": patch
---

Implement OmniDash M-03 Realtime Observability Panels

- Add `recharts` for data visualization.
- Implement 7 production-grade observability panels (`SystemHealthOverview`, `AgentActivityTimeline`, `GuardianAlertFeed`, `ManModeReviewQueue`, `OmniRouteTraffic`, `WorkflowStatusBoard`, `SystemSparklines`).
- Integrate real data using Supabase Realtime via `useDashboardData` hook.
- Enforce strict "Zero Mock Data" standard.
