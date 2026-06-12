---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Release & Versioning Policy

Version: 1.0.0
Owner: Architecture + DevOps
Applies To: every deployable artifact (API, worker, edge function, mobile app, web app, infra module)

---

## Service Tier Classification

Every deployable service is assigned a tier on creation. Tier governs SLO, on-call, change risk, and review depth.

| Tier | Examples | SLO | Deploy window | RFC required |
|---|---|---|---|---|
| **T1 — Critical** | Auth, Payments, Live broadcast control plane, Database, OmniHub orchestration | 99.95 % monthly | Mon–Thu 09:00–14:00 local; no Fri deploys | always |
| **T2 — High** | Public API, signed-in dashboards, OmniBridge ingest, scoring | 99.9 % | Mon–Thu daytime | for behavior change |
| **T3 — Standard** | Background workers, analytics ETL, content feeds | 99.5 % | any business day | for behavior change |
| **T4 — Experimental** | Internal tools, feature-flag-gated previews, sandbox | best effort | any | optional |

## Versioning

- **Semantic versioning** on all libraries, SDKs, and public APIs: `MAJOR.MINOR.PATCH`.
- **API versioning** is path-based: `/api/v1/...`, never query-string based.
- **Database migrations** are forward-only and idempotent (`IF NOT EXISTS`, additive); destructive changes require expand → migrate → contract pattern across at least two releases.
- **Mobile clients** must support last 2 minor server versions.

## Branching Strategy

```
main         protected; always deployable; only fast-forward via PR
release/*    cut from main for stabilization; hotfixes flow to main first
feature/*    short-lived (≤ 5 days); rebased before merge
hotfix/*     branch from latest release tag; merged back to main + release
```

Forbidden: long-lived feature branches > 7 days; force-push to `main` or `release/*`.

## Promotion Pipeline

```
PR → preview env → main → staging → canary (5%) → progressive (25/50/100%) → prod
```

- Each promotion requires green status checks + observability quiet period (≥ 30 min) for T1/T2.
- Canary rollback is automated on error-rate breach (> 2× baseline).
- T1 services require a 48-hour soak in staging before prod.

## Feature Flags

- All risky changes ship behind flags.
- Flag lifecycle: born with owner, expiry date, removal RFC.
- Stale flags > 90 days post full rollout are blockers in CI.

## Hotfix Procedure

1. SEV1 or SEV2 declared.
2. Branch from last green production tag.
3. Minimal diff. Tests added for the regression.
4. Reduced review: 1 architecture reviewer + 1 domain owner.
5. Deploy with `canary=100%, traffic-shift=10%, soak=10min, expand`.
6. Postmortem within 5 business days. See `governance/ops/POSTMORTEM_TEMPLATE.md`.

## Required Per Release

- changelog entry
- migration plan (forward + rollback)
- observability dashboard link
- canary plan
- rollback command(s) documented
- on-call notified
- feature flags listed

## Forbidden

- Friday-afternoon prod deploys for T1 or T2 without VP approval.
- Deploys during declared incident on adjacent domain.
- Schema destructive migrations without expand/contract.
- "Tribal knowledge" rollback ("ask Bob").
