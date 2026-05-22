# Rubric Scoring Guide

Version: 1.0.0
Owner: Architecture
Companion to: `governance/rubrics/APEX_BUILD_RUBRIC_100.md`

This guide tells reviewers **how** to score each rubric category. Same scale, same standards, every review.

---

## Scoring Mechanics

- Each of the 10 categories is scored 0–10.
- 0 = absent / wrong. 5 = present but weak. 8 = good. 10 = exemplary.
- Score with evidence. Every score < 10 must cite the specific gap.
- The reviewer's own conscience is the auditor — be honest, not generous.

---

## Category Scoring Rubrics

### 1. Exact user and workflow identified (10 pts)

| Score | Criteria |
|---|---|
| 10 | RFC names a specific user persona, the specific workflow being improved, baseline metric (current time/cost/error), and target metric. |
| 8 | Persona + workflow + qualitative pain. No baseline metric. |
| 5 | Generic "users want X". |
| 0 | No user identified, or "everyone". |

### 2. Pain and current workaround validated (10 pts)

| Score | Criteria |
|---|---|
| 10 | Pain is documented with at least one of: customer quote, support ticket count, lost-revenue estimate, or measured workflow time. Current workaround is described. |
| 8 | Pain described qualitatively + workaround described. |
| 5 | Pain asserted; no evidence. |
| 0 | "We think this would be nice." |

### 3. Scope boundaries clear (10 pts)

| Score | Criteria |
|---|---|
| 10 | IN SCOPE + OUT OF SCOPE both populated with concrete items; deferred items linked to follow-up tickets. |
| 8 | Both populated; no follow-up tickets. |
| 5 | Only IN SCOPE; OUT OF SCOPE missing or vague. |
| 0 | Scope undefined. |

### 4. Domain ownership clear (10 pts)

| Score | Criteria |
|---|---|
| 10 | Owning domain, calling domains, and forbidden callers are explicitly listed. CODEOWNERS matches. |
| 8 | Owning domain named; allowed callers implied. |
| 5 | Owner named; no boundary discussion. |
| 0 | No ownership statement. |

### 5. No god object or hidden coupling (10 pts)

| Score | Criteria |
|---|---|
| 10 | No new cross-domain dependency hub; no shared mutable state; no deep imports; no hidden orchestration. Reviewed against `ARCHITECTURE_REVIEW_GATES.md` hard blockers. |
| 8 | Minor coupling introduced, justified and isolated. |
| 5 | New coupling, not analyzed. |
| 0 | God object or shared-state pattern introduced. **HARD FAIL.** |

### 6. Contracts typed and documented (10 pts)

| Score | Criteria |
|---|---|
| 10 | API/event/DB contracts typed (TypeScript types, Zod schemas, protobuf, OpenAPI), committed, and discoverable. Idempotency keys honored where required (per `API_VERSIONING_POLICY.md`). |
| 8 | Typed but not discoverable in central location. |
| 5 | Loose typing or runtime-only validation. |
| 0 | Untyped or `any`-typed contracts. |

### 7. Observability complete (10 pts)

| Score | Criteria |
|---|---|
| 10 | Logs, metrics, traces, dashboards, alerts, audit events, cost telemetry all defined per `SLO_POLICY.md` and `OBSERVABILITY_BASELINE.md`. SLO target declared. Burn-rate alert configured. |
| 8 | Logs + metrics defined; tracing or alerts missing. |
| 5 | Only logs. |
| 0 | None. **HARD FAIL.** |

### 8. Rollback path executable (10 pts)

| Score | Criteria |
|---|---|
| 10 | Exact rollback command(s) in the runbook. Tested in staging. For schema changes, expand/contract documented. |
| 8 | Documented but not tested. |
| 5 | "Redeploy previous version" without specifics. |
| 0 | None. **HARD FAIL.** |

### 9. Security and permission model clear (10 pts)

| Score | Criteria |
|---|---|
| 10 | Authn, authz, data classification (per `DATA_CLASSIFICATION.md`), secret handling, audit logging, key rotation, threat model (if required) all addressed. |
| 8 | Most of the above; one minor gap. |
| 5 | "Standard auth applies." |
| 0 | Auth bypassed or unstated for sensitive surface. **HARD FAIL.** |

### 10. Regression and overload resistance addressed (10 pts)

| Score | Criteria |
|---|---|
| 10 | Tests cover happy path, failure path, authz boundary, rollback path, contract compatibility (per `TESTING_DOCTRINE.md`). Rate limit, circuit breaker, or backpressure documented for high-load paths. |
| 8 | Strong testing; overload only partially addressed. |
| 5 | Tests present; no overload analysis. |
| 0 | No tests or no overload consideration on a high-load path. |

---

## Hard Fail Overrides

Regardless of total score, any of the following forces rejection:

- uncontrolled AI mutation
- no rollback path
- no observability
- god object introduced
- unclear ownership
- cross-domain database write without architecture approval
- P0 secret in code or logs
- payment / identity change without security review

---

## Reviewer Output

Use `governance/architecture/ARCHITECTURE_REVIEW_TEMPLATE.md`. Final block must include:

```
Score: XX / 100
Hard fails triggered: <none | list>
Decision: Approved | Changes Required | Rejected
Top three required changes:
  1.
  2.
  3.
```
