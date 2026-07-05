---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

> **Current-state note (2026-07-05):** Current repo-state evidence is `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_05.md`; governance doctrine remains normative, while release/production status is governed by `docs/release/release-validation-matrix.json` plus owner/live evidence.


# APEX Build Doctrine

Version: 1.1.0
Status: Canonical
Owner: APEX Business Systems LTD
Applies To: Product, Engineering, AI Agents, Operations, CI/CD, Architecture Reviews
Supersedes: 1.0.0

---

## Mission

Build systems that remove operational friction, increase execution velocity, and scale reliably without increasing complexity for the user.

## Vision

Create interoperable operational systems that become the default infrastructure layer for modern organizations.

---

## Core Principles

### 1. User First

Before building, identify:
- exact user
- painful workflow
- current workaround
- measurable improvement

If unclear, do not build.

### 2. Build Workflows, Not Features

Users care about:
- speed
- clarity
- reliability
- task completion

Every feature must improve a real workflow.

### 3. Architecture Before Scale

Before implementation define:
- ownership
- boundaries
- contracts
- data flow
- failure modes
- rollback path
- observability path
- service tier (T1/T2/T3/T4 per `governance/release/RELEASE_POLICY.md`)
- SLO and error budget (per `governance/observability/SLO_POLICY.md`)
- data classification (per `governance/data/DATA_CLASSIFICATION.md`)

### 4. No God Objects

No service, module, component, class, store, worker, prompt, or agent may become:
- central decision maker
- shared mutable brain
- cross-domain dependency hub
- hidden orchestration layer

If the system becomes dangerous to modify, split it.

### 5. Strict Domain Boundaries

Each domain:
- owns its logic
- owns its data
- exposes explicit contracts only

Forbidden:
- cross-domain database writes
- hidden coupling
- deep imports across domains
- shared business logic dumping grounds
- implicit side effects

### 6. Scope Control Is Mandatory

Every initiative must define:
- IN SCOPE
- OUT OF SCOPE
- OWNER
- SUCCESS METRIC

Anything outside scope requires a new decision, new ticket, and new approval.

### 7. Complexity Stays Internal

Internal complexity is acceptable. User-facing complexity is failure.

The user must never experience:
- org structure
- technical architecture
- operational fragmentation
- unclear system state

### 8. Systems Must Accelerate Shipping

Architecture exists to:
- reduce deployment risk
- increase iteration speed
- isolate failures
- simplify maintenance

It does not exist to maximize abstraction purity.

### 9. Observable Or Not Production Ready

All production systems require:
- structured logs (retention per `SLO_POLICY.md`)
- metrics (naming convention per `SLO_POLICY.md`)
- tracing (sampling per `SLO_POLICY.md`)
- rollback capability (tested per `RELEASE_POLICY.md`)
- auditability
- cost visibility (tags per `COST_BUDGET_POLICY.md`)
- health checks
- error budget tracking (per `SLO_POLICY.md`)

Invisible systems are operational liabilities.

### 10. AI Must Be Controlled

AI systems must be:
- permissioned (per `AI_AGENT_SYSTEM_PROMPT.md`)
- observable (per `SLO_POLICY.md` + `AI_EVAL_POLICY.md`)
- auditable (per `GLOBAL_AI_PROMPT_USAGE.md`)
- reversible (kill switch per `AI_KILL_SWITCH.md`)
- contract-bound
- scope-bound
- evaluation-gated (per `AI_EVAL_POLICY.md`)
- cost-capped (per `COST_BUDGET_POLICY.md`)

No uncontrolled autonomous behavior.

### 11. Data Has Classification (new in v1.1)

Every datum is classified P0–P4 (per `governance/data/DATA_CLASSIFICATION.md`).
Cross-tier mixing in storage, logs, or AI context is forbidden.
Default classification for unknown data is **P2**.

### 12. Cost Is A Feature Requirement (new in v1.1)

Unit economics belong in the RFC, not the retro.
Every production system carries domain/tier/owner tags and exposes per-tenant cost (per `COST_BUDGET_POLICY.md`).
Budget burn is monitored; runaway jobs trigger SEV2.

### 13. Disposability And Deprecation Are Engineered (new in v1.1)

Every API, contract, column, flag, and model has a documented end-of-life path (per `governance/deprecation/DEPRECATION_POLICY.md`).
Silent EOL is forbidden.

---

## Definition of APEX-Level Systems

APEX systems:
- ship fast
- fail visibly
- recover predictably (per `DR_POLICY.md` RPO/RTO)
- scale safely
- evolve independently
- reduce operational friction
- preserve user simplicity

Every addition to a system must maintain:
- atomic idempotency
- modularity
- adaptive refactorability
- horizontal scalability
- enterprise-grade performance (defined as: meeting declared tier SLO; see `SLO_POLICY.md`)
- operational efficiency (cost-tagged; see `COST_BUDGET_POLICY.md`)
- security by default (per `SECURITY_BASELINE.md` + threat model when required)
- durability (per `DR_POLICY.md`)
- resiliency
- ease of use
- regression resistance
- overload resistance

---

## Non-Negotiables

Never sacrifice:
- maintainability
- observability
- rollback safety
- ownership clarity
- user simplicity
- operational visibility
- security posture
- data classification compliance
- cost attribution
- AI kill-switch availability

For:
- short-term speed
- convenience
- abstraction vanity
- premature optimization
- uncontrolled experimentation

---

## Final Operating Principle

Build systems that remain understandable, modifiable, observable, recoverable, and scalable under pressure.

If a system becomes difficult to understand, dangerous to modify, operationally opaque, tightly coupled, difficult to scale, or difficult to recover, the architecture must be refactored immediately.

---

## Policy Index

This doctrine is enforced via the following companion policies (see `governance/INDEX.md` for navigation):

| Area | Document |
|---|---|
| Architecture review gates | `governance/architecture/ARCHITECTURE_REVIEW_GATES.md` |
| Merge rights | `governance/architecture/MERGE_RIGHTS_POLICY.md` |
| RFC process | `governance/rfc/RFC_USAGE_POLICY.md`, `RFC_TEMPLATE.md` |
| CI policy gates | `governance/ci/CI_POLICY_GATES.md` |
| Testing | `governance/testing/TESTING_DOCTRINE.md` |
| Observability + SLOs | `governance/observability/OBSERVABILITY_BASELINE.md`, `SLO_POLICY.md` |
| Security baseline | `governance/security/SECURITY_BASELINE.md`, `THREAT_MODEL_TEMPLATE.md`, `INCIDENT_DISCLOSURE.md` |
| Data classification | `governance/data/DATA_CLASSIFICATION.md` |
| FinOps / cost | `governance/finops/COST_BUDGET_POLICY.md` |
| Release management | `governance/release/RELEASE_POLICY.md` |
| API versioning | `governance/api/API_VERSIONING_POLICY.md` |
| Deprecation | `governance/deprecation/DEPRECATION_POLICY.md` |
| Supply chain | `governance/supply-chain/SUPPLY_CHAIN_POLICY.md` |
| Operations | `governance/ops/INCIDENT_RESPONSE.md`, `ON_CALL_POLICY.md`, `DR_POLICY.md`, `POSTMORTEM_TEMPLATE.md`, `RUNBOOK_TEMPLATE.md` |
| AI governance | `governance/ai/AI_AGENT_SYSTEM_PROMPT.md`, `GLOBAL_AI_PROMPT_USAGE.md`, `AI_KILL_SWITCH.md`, `AI_EVAL_POLICY.md` |
| Onboarding | `governance/onboarding/ENGINEERING_ONBOARDING.md`, `MERGE_ACCESS_CHECKLIST.md` |
| Rubric | `governance/rubrics/APEX_BUILD_RUBRIC_100.md`, `RUBRIC_SCORING_GUIDE.md` |
