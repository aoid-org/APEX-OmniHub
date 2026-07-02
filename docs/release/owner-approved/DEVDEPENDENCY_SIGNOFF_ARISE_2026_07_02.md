# A.R.I.S.E. devDependency Sign-Off — 2026-07-02

> **CI validates. Owner certifies.**
> This document is the owner authorization record for the development-only
> dependencies introduced by the A.R.I.S.E. Phase 0 structural observatory
> (PR #1540). It closes FR2 of `orchestrator/EXECUTION_CONTRACT_2026-07.md`
> (A.R.I.S.E. Phase 0 gap: "devDependency sign-off record since PR #1540"),
> as identified in `orchestrator/AUDIT_2026-07.md` §5.

---

## Sign-Off Metadata

| Field | Value |
| --- | --- |
| **Date** | 2026-07-02 |
| **Source PR** | [#1540](https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1540) — feat: add A.R.I.S.E. Phase 0 structural observatory (measurement-only), commit `f91016b` |
| **Manifest** | `apps/apex-arise/package.json` (`devDependencies` block only) |
| **Authorizing authority** | APEX Business Systems LTD — product owner (JR) |
| **Authorization act** | Owner directive of 2026-07-02 to proceed with Phase 1 gap closure, finalized by the owner's merge of the PR containing this record (consistent with the governance precedent in `PRODUCTION_CERTIFICATION_2026_06_26.md`: the deliberate merge decision by JR is the certification act) |

## Packages Covered

All are **devDependencies** — CI/static-analysis tooling only. None is imported by
application code, none ships in any production bundle, none touches a deployed
service, environment variable, database, or start command
(per `docs/APEX_AGENT_OPERATIONS.md` §9.25: "Deployed runtime contracts affected: None").

| Package | Version spec | Role in A.R.I.S.E. Phase 0 |
| --- | --- | --- |
| `madge` | `^8.0.0` | Circular-dependency (acyclicity) signal |
| `dependency-cruiser` | `^18.0.0` | Module-boundary / modularity signal |
| `jscpd` | `^5.0.11` | Copy-paste redundancy signal |
| `ts-morph` | `^28.0.0` | AST analysis for control-flow depth signal |
| `typescript` | `^6.0.3` | Compiler for the scanner's own sources |
| `vitest` | `^4.1.9` | Scanner unit tests |
| `@vitest/coverage-v8` | `4.1.9` | Coverage for scanner tests |
| `@types/node` | `^26.0.1` | Type stubs for scanner sources |

## Constraint Compliance

- **Zero new cost:** all packages are OSS, run only inside CI runners already provisioned; no vendor, SaaS, or infra line item added.
- **Blast isolation:** installed only in the `apps/apex-arise` workspace; the A.R.I.S.E. workflow (`.github/workflows/arise.yml`) executes scan tooling in a job with `contents: read` and no write-scoped token present (two-job split, per `docs/APEX_AGENT_OPERATIONS.md` §9.25).
- **Non-blocking:** the workflow is informational-only (`continue-on-error: true`, never a required check).

## Decision

The owner **authorizes retroactively and going forward** the eight development-only
packages above for the A.R.I.S.E. Phase 0 observatory scope. Any *additional*
dependency — dev or runtime, in any workspace — still requires its own explicit
authorization under the zero-new-dependency rule
(`orchestrator/EXECUTION_CONTRACT_2026-07.md` §B1/§B6 BLOCKED-DEPENDENCY).
