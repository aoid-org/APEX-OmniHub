---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

### OmniDash Panel Audit

| Panel Name | Status | Supabase Source | Priority for Demo |
| :--- | :--- | :--- | :--- |
| **Tasks** (`Tasks.tsx`) | REAL DATA | `omnilink_orchestration_requests`, `integrations`, `omnilink_api_keys` | High |
| **Events** (`Events.tsx`) | REAL DATA | `omnilink_events` | High |
| **Approvals** (`Approvals.tsx`) | REAL DATA | `omnilink_orchestration_requests` (via rpc `omnilink_set_approval`) | High |
| **Integrations** (`Integrations.tsx`) | REAL DATA | `integrations`, `omnilink_api_keys`, `omnilink_events` | High |
| **Entities** (`Entities.tsx`) | REAL DATA | `omnilink_entities` | Low |
| **Runs** (`Runs.tsx`) | REAL DATA | `omni-runs` (Edge Function via `omnilink_runs`) | Low |
| **LocalAgents** (`LocalAgents.tsx`) | REAL DATA | `omnilink_events` | Medium |
| **Ops** (`Ops.tsx`) | REAL DATA | `omnidash_today_items`, `omnidash_pipeline_items`, `omnidash_kpi_daily`, `omnidash_incidents`, `memory_health_stats` | Low |
| **OmniTraceFeed** (`OmniTraceFeed.tsx` / `OmniTracePanel.tsx`) | REAL DATA | `audit_log` (Realtime), Gateway SSE | High |
| **NotificationCenter** (`NotificationCenter.tsx`) | MOCK DATA | `omnilink_orchestration_requests` (status: `waiting_approval`) | High |
| **SentinelPanel** (`SentinelPanel.tsx`) | MOCK DATA | `omnilink_events`, `audit_log` | High |
| **DashboardOverview** (`DashboardOverview.tsx`) | MOCK DATA | `integrations`, `omnilink_events` (for connected modules/apps) | Medium |

### Build Plan (Realtime Upgrade)

Constraint Check: Only building what a prospect would ask to see in a 15-minute demo to prove the zero-trust / orchestration capabilities.

**1. Sentinel Panel (OmniTrace Integration)**
- **Component**: `SentinelPanel`
- **File Location**: `apps/omnihub-site/dashboard/components/SentinelPanel.tsx`
- **Supabase Query**: `supabase.from("audit_log").select("*").eq("tenant_id", user.id).order("created_at", { ascending: false }).limit(5)`
- **Realtime subscription needed?**: Yes (`postgres_changes` on `audit_log` table).
- **Estimated build time**: 15 minutes.

**2. Notification Center (MAN Mode Approvals)**
- **Component**: `NotificationCenter`
- **File Location**: `apps/omnihub-site/dashboard/components/NotificationCenter.tsx`
- **Supabase Query**: `supabase.from("omnilink_orchestration_requests").select("*").eq("tenant_id", user.id).eq("status", "waiting_approval")`
- **Realtime subscription needed?**: Yes (`postgres_changes` on `omnilink_orchestration_requests` where status changes to/from `waiting_approval`).
- **Estimated build time**: 20 minutes.

**3. Dashboard Overview (App/Module Status)**
- **Component**: `EcosystemPane` & `AppsSection` (within `DashboardOverview.tsx`)
- **File Location**: `apps/omnihub-site/dashboard/components/DashboardOverview/components/EcosystemPane.tsx` and `AppsSection.tsx`
- **Supabase Query**: `supabase.from("integrations").select("*").eq("user_id", user.id)` joined with `omnilink_events` for sync status.
- **Realtime subscription needed?**: Yes (`postgres_changes` on `integrations` to show live module connections).
- **Estimated build time**: 25 minutes.
