---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# APEX OmniHub Canonical Truth Matrix

> Last reconciled: 2026-06-01 against HEAD `86bc14a`. This matrix labels claim classes; it is not a substitute for release evidence.

## Purpose

This document defines the authoritative claim taxonomy for APEX OmniHub diligence, architecture, simulation, audit, and investor-facing materials.

## Runtime Topology

| Layer | Status | Allowed Claim |
|---|---|---|
| Cloudflare edge/deployment | VERIFIED | Current canonical edge/deployment target |
| Vite frontend | VERIFIED | Current frontend build/runtime |
| Supabase auth/data/functions | VERIFIED | Current auth/data/backend substrate |
| Temporal orchestration | VERIFIED | Workflow/state orchestration layer |
| OmniLink abstraction | VERIFIED | Integration fabric / abstraction layer |
| OmniDash Shell | VERIFIED | Current post-auth product surface at `/omnidash` and `/dashboard`; shell authority is `OmniDashShell.tsx` |
| APEX Agent endpoint | VERIFIED | Canonical AI orchestration function is `supabase/functions/apex-agent/`; `apex-assistant` is legacy/410 |
| PhysiOmni HMAC ingress | VERIFIED IN CODE | Current tree enforces signed ingress; live deployment status must be verified before external claims |

## Provider Portability

| Provider | Status |
|---|---|
| Cloudflare | VERIFIED |
| Supabase | VERIFIED |
| Temporal | VERIFIED |
| Vite | VERIFIED |
| AWS | PROPOSED |
| Azure | PROPOSED |
| GCP | PROPOSED |
| On-prem | ARCHITECTURALLY POSSIBLE / UNVERIFIED |

## Evidence Classes

| Evidence Type | Status Label | Allowed Claim |
|---|---|---|
| CI/build/typecheck/lint/test logs | VERIFIED | Verified engineering gate |
| Live Supabase destructive-action safe block | VERIFIED LIVE GUARDRAIL | Guardrail prevented destructive live chaos execution |
| Chaos simulation framework | SIMULATION | Deterministic resilience simulation framework validated in sandbox/mock-mode environments |
| Mock agent/client reports | SIMULATION | UX/agent behavior validated in mock mode |
| Stubbed adapters | SIMULATION / EXPERIMENTAL | Contract present, not production integration |
| Audit valuation reports | OPINION / AUDIT ASSERTION | Audit-estimated valuation, subject to investor diligence, market validation, and revenue traction |

## Mandatory Simulation Disclaimer

IMPORTANT:
Chaos simulation results validate orchestration resilience and recovery behavior in controlled sandbox environments. These results are NOT representations of public production traffic volume or commercial customer load unless explicitly labeled VERIFIED LIVE EXECUTION.

## Prohibited Unqualified Claims

The following may not appear without status label, artifact reference, and scope:
- "live production resilience proof"
- "state is indestructible"
- "guarantees 99.999% SLA"
- "mathematically proven determinism"
- "$150M valuation"
- "production ready" in simulation-only docs
