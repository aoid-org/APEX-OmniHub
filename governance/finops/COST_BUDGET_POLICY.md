---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Cost & FinOps Policy

Version: 1.0.0
Owner: Architecture + Operations
Applies To: every domain, every external API, every AI invocation, every storage tier

---

## Principle

Cost is a feature requirement. A workflow that wins on quality but loses on per-user unit economics is not APEX-grade.

Every production system must expose:
- per-tenant cost attribution
- per-feature cost attribution
- per-AI-call cost attribution
- budget alerts at 50 / 80 / 100 / 120 %

---

## Per-Domain Cost Tags

Every cloud resource, edge function, queue, database, vector store, and AI key must carry tags:

```
domain      = identity | broadcast | commerce | ai-orchestration | ...
environment = prod | staging | dev | preview
tier        = p0 | p1 | p2 | p3        # service tier; see RELEASE_POLICY.md
owner       = team-handle
cost_center = product-code
```

Untagged resources older than 7 days are subject to automatic shutdown after notification.

## Budget Tiers

| Tier | Monthly variance threshold | Action |
|---|---|---|
| Green | ±10 % vs forecast | Continue. |
| Yellow | +10–25 % | Domain owner files justification within 5 business days. |
| Red | +25–50 % | Architecture review. Optimization RFC required within 10 business days. |
| Black | +50 % or any single line > $5K unexpected | SEV2 incident. On-call engaged. Halt scaling. |

## AI / Embedding / LLM Budgets

- Every AI pipeline must declare:
  - cost per call (p50, p95)
  - calls per user per day (cap)
  - per-tenant monthly ceiling
  - degradation behavior at ceiling (queue, downgrade model, deny)
- No production AI feature may ship without per-tenant rate limit and per-tenant monthly cap.
- Embedding re-computation is a budgeted operation. Re-embed jobs require RFC if cost > $100.

## Storage Lifecycle

| Class | Hot retention | Warm | Cold | Deletion |
|---|---|---|---|---|
| Operational logs | 30 days | 90 days | 1 year | 1 year + 1 day |
| Audit logs | 90 days hot | 1 year | 7 years (regulated) | per legal hold |
| Product analytics | 13 months hot | n/a | n/a | rolling delete |
| Vector embeddings (ACRA) | per TTL declared per namespace | n/a | n/a | TTL job, hourly sweep |
| Backups | 7 days daily, 4 weeks weekly, 12 months monthly | per DR_POLICY | per DR_POLICY | overwrite |

## Cost Review Cadence

- Weekly: domain-owner glance at dashboard.
- Monthly: cross-domain review by Architecture + Ops.
- Quarterly: unit-economics review by Leadership.

## Required Dashboards

- spend by domain (line)
- spend by environment (stacked)
- AI cost per active tenant (gauge)
- top-10 most expensive endpoints (table)
- runaway-job detector (alert)

## Hard Rules

- No orphaned preview / staging environments older than 30 days.
- No production resource without `owner` tag.
- No AI integration without cost-per-call telemetry.
- No "let's see how it scales" without a circuit breaker.
