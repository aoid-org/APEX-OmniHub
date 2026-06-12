---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# APEX OmniHub Developer Operating Model

> **Version:** 1.0.0
> **Status:** Canonical
> **Purpose:** Explains the in-repo abstractions, simulators, testing harnesses, and developer assets available in the APEX-OmniHub repo.

## Purpose and Scope

The APEX-OmniHub repository provides a rich set of operational abstraction assets—specifically simulators, integration harnesses, and deterministic validation scripts.

These tools are built to accelerate **support triage, planning, testing, and debugging**. They serve as high-leverage accelerators but **do not** substitute for sound engineering judgment, architecture review, or understanding of system components.

---

## 1. Integration Harness (OmniBridge Validator)

**Location:** `integration-harness/lib/deterministic-validator.mjs`

### What it does
A zero-dependency Node.js validator that verifies the bidirectional HMAC-signed sync layer between OmniHub and tenant endpoints (e.g., SBBL-HQ).

### Problem it solves
It validates that sync packets follow the right shape, risk lanes are properly classified, tamper detection works, and latency requirements are met. It prevents regressions in integration parity.

### When to use it
- When changing OmniBridge code.
- When onboarding a new tenant integration.
- During troubleshooting of HMAC or API envelope issues.

### What it does NOT replace
- Full end-to-end testing with actual tenant deployments.
- Manual verification of token scopes during rollout.

---

## 2. Chaos & Simulation Engine

**Location:** `sim/cli.ts` (triggered via `bun run sim:*`)

### What it does
Provides multiple operation modes (`chaos`, `dry`, `quick`, `burst`, `custom`) to inject jitter, failures, latency, and out-of-order execution into the application state to observe resilience.

### Problem it solves
Proves that our retry mechanisms, Dead Letter Queues (DLQ), and Orchestrator failovers work correctly when external dependencies exhibit latency or unreliability.

### When to use it
- To validate changes in async execution flows or retry logic.
- Run automatically via GitHub Actions (`chaos-simulation-ci.yml`).

### What it does NOT replace
- Genuine monitoring and alerting in production using Datadog/New Relic.
- True infrastructure stress tests (e.g. database load testing).

---

## 3. Deterministic Evaluator (OmniEval)

**Location:** `bun run eval:ci`

### What it does
Runs an evaluation gate to ensure output determinism across critical deterministic paths in the application.

### Problem it solves
Prevents unpredictable outputs from affecting stable state machines or policy evaluations.

### When to use it
- Automatically runs as a required CI guardrail.
- Use it locally to verify deterministic outputs for critical features.

### What it does NOT replace
- Unit testing of edge cases and business logic bounds.

---

## 4. Secret Scanning & Audit

**Location:** `scripts/secret-scan.mjs` and `npm audit --omit=dev` (npm audit is the only npm command used — never `npm install`)

### What it does
Locally verifiable security gates. The secret scanner prevents committing API keys, and the dependency scanner verifies production vulnerabilities (with strict enforcement).

### Problem it solves
"Shift-left" security, giving immediate feedback without waiting for CI to fail.

### When to use it
- Run `bun run secret:scan` and `bun run security:audit` before committing.

### What it does NOT replace
- Centralized secrets management and rotation.
- Third-party penetration testing or dynamic application security testing (DAST).

---

## Conclusion

Use these assets as your force-multipliers. If an integration breaks, reach for the validator. If an orchestrator step acts flaky, reach for the chaos simulator. But always read the underlying code to understand why a failure is occurring before treating the symptom.
