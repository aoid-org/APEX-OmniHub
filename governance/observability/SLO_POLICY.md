---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# SLO Policy

Version: 1.0.0
Owner: Architecture + Operations
Applies To: every production service

---

## Principle

An SLO is a **promise**. The error budget is what we are **allowed to spend** on velocity. When the budget burns, we freeze risk and pay it back.

## Default SLOs by Tier

(see `governance/release/RELEASE_POLICY.md` for tier definitions)

| Tier | Availability (monthly) | Latency p95 | Latency p99 | Error rate |
|---|---|---|---|---|
| T1 | 99.95 % | 300 ms | 800 ms | < 0.1 % |
| T2 | 99.9 % | 500 ms | 1500 ms | < 0.5 % |
| T3 | 99.5 % | 1000 ms | 3000 ms | < 1 % |
| T4 | best effort | — | — | — |

Override only via ADR.

## Voice / Real-Time SLO Carve-Out

Voice-agent or live broadcast pipelines have stricter latency requirements:
- end-to-end round-trip p95 ≤ 400 ms
- TTS first-byte p95 ≤ 250 ms
- ASR partial p95 ≤ 200 ms

## Error Budget

Monthly error budget = (1 − availability target) × total minutes.

| Target | Budget per 30 days |
|---|---|
| 99.95 % | 21.6 min |
| 99.9 % | 43.2 min |
| 99.5 % | 3 h 36 min |

## Burn-Rate Alerts

| Burn rate | Window | Severity | Action |
|---|---|---|---|
| 14.4× | 1 hour | SEV1 | page on-call immediately |
| 6× | 6 hours | SEV2 | page on-call business hours |
| 3× | 1 day | SEV3 | ticket created, owner notified |
| 1× | 3 days | SEV4 | review at next ops sync |

## Policy When Budget Burns

| Budget remaining | Action |
|---|---|
| > 50 % | normal velocity |
| 25–50 % | risky changes (schema migrations, T1 deploys) require extra reviewer |
| 0–25 % | feature freeze for the burning service; reliability work only |
| < 0 % (over budget) | hard freeze + reliability sprint required before next feature ship |

## Required Per Service

- declared tier
- declared SLO (with ADR if non-default)
- declared error-budget burn dashboard
- declared alert routing for SEV1/SEV2
- declared on-call rotation
- monthly SLO review checked-in to `governance/slo-reviews/`

## Metric Naming Convention

```
apex_<domain>_<surface>_<metric>_<unit>
  domain   = identity | broadcast | commerce | ai-orch | ...
  surface  = http | rpc | queue | worker | edge | ai | db
  metric   = requests_total | latency_seconds | errors_total | depth
  unit     = total (counter) | seconds (histogram) | bytes | ratio
```

Tags required on every metric: `domain`, `tenant_id` (where applicable), `tier`, `environment`.

## Log Retention

| Class | Hot | Cold |
|---|---|---|
| App logs | 30 days | 1 year |
| Audit logs | 90 days | 7 years |
| Access logs (CDN/edge) | 30 days | 90 days |

## Trace Sampling

- Default: tail-based sampling, 100 % of errors, 1 % of success, 100 % of slow (> p99 latency).
- T1 services may raise success sampling to 5 %.

## Required Dashboards Per Service

- golden signals (latency, traffic, errors, saturation)
- SLO compliance + error budget burn
- per-tenant top-N (calls, errors, cost)
- dependency health
- deployment markers overlay
