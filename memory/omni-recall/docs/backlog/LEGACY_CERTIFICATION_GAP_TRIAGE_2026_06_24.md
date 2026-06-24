# Legacy Certification Gap Triage — 2026-06-24

This file preserves stale gaps from the retired certification document.

These are not active certification blockers unless re-verified against current code.

Current rule: CI validates. Owner certifies.

| Gap | Prior Severity | Current Status | Evidence | Next Action |
|---|---:|---|---|---|
| SentinelPanel static feed | P1 | STALE_NEEDS_REVERIFY | Previously listed in retired certification doc | Inspect current SentinelPanel source before reopening |
| NotificationCenter Realtime subscription | P1 | STALE_NEEDS_REVERIFY | Previously listed in retired certification doc | Inspect current NotificationCenter source before reopening |
| DashboardOverview ecosystem widget wiring | P1 | STALE_NEEDS_REVERIFY | Previously listed in retired certification doc | Inspect DashboardOverview/EcosystemPane/AppsSection before reopening |
| it.todo guardrail tests | P2 | STALE_NEEDS_REVERIFY | Previously listed in retired certification doc | Run current test grep before reopening |
| hono CVE bump | P2 | RESOLVED_IN_CURRENT_REPO_COPY | package.json and bun.lock show hono ^4.12.25 / hono@4.12.25 | No certification action |
