# APEX-OmniHub Metrics Documentation

This document defines the core metrics mandated by Prompt 15 for system observability and SLO enforcement.

## 1. Auth Rejection (`auth.rejection.count`)
- **Type:** Counter
- **Description:** Tracks the number of failed authentication or authorization attempts.
- **Attributes:** `reason` (e.g., invalid_token, insufficient_scope), `module`.
- **Threshold:** >100/min triggers a security audit alert.

## 2. Duplicate Idempotency (`idempotency.duplicate.count`)
- **Type:** Counter
- **Description:** Tracks the number of operations rejected or safely replayed due to matching idempotency keys.
- **Attributes:** `module`, `action`.
- **Threshold:** Normal during syncs, but spikes >10x baseline indicate upstream retry loops.

## 3. Replay Rejection (`replay.rejection.count`)
- **Type:** Counter
- **Description:** Tracks events rejected because their causal trace IDs indicate an invalid or malicious replay attempt.
- **Attributes:** `actorId` (redacted), `module`.
- **Threshold:** >10/min triggers a high-severity security alert.

## 4. Connector Success/Failure (`connector.execution.status`)
- **Type:** Counter
- **Description:** Tracks the outcome of external integrations (OmniConnect / OmniBridge).
- **Attributes:** `connectorId`, `status` (success, failed_retryable, failed_terminal).
- **Threshold:** Error rate >5% triggers degraded state.

## 5. Workflow P95 (`workflow.latency.p95`)
- **Type:** Histogram
- **Description:** 95th percentile latency of end-to-end orchestration workflows.
- **Attributes:** `workflowName`, `stateKind`.
- **SLO:** <500ms for synchronous UI workflows; <2000ms for background processing.

## 6. Model Cost/Error (`byom.cost.sum` / `byom.error.count`)
- **Type:** Histogram / Counter
- **Description:** Tracks cumulative token spend and provider API errors for BYOM.
- **Attributes:** `provider`, `model`.
- **SLO:** Error rate <1%.

## 7. Module Unavailable Count (`system.module.unavailable`)
- **Type:** Gauge
- **Description:** Tracks the number of subsystems reporting an `unavailable` state from the health endpoint.
- **Attributes:** `module`.
- **Threshold:** >0 triggers a degraded state alert.
