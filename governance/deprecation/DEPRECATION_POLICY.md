---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Deprecation Policy

Version: 1.0.0
Owner: Architecture
Applies To: public APIs, internal contracts, feature flags, deprecated database columns, deprecated AI models

---

## Lifecycle Stages

| Stage | Meaning | Marker |
|---|---|---|
| **Active** | Default. Fully supported. | none |
| **Deprecated** | Still works, but new code must not depend on it. | `@deprecated` tag, doc header, telemetry counter |
| **Sunset Announced** | End-of-life date published. | banner / changelog entry / API header `Sunset:` |
| **End-of-Life (EOL)** | Removed; calls fail. | 410 Gone, schema dropped, code removed |

## Minimum Timelines

| Surface | Active → Deprecated | Deprecated → Sunset Announced | Sunset Announced → EOL |
|---|---|---|---|
| Public API | required RFC | ≥ 30 days | ≥ 90 days |
| Internal contract | required RFC | ≥ 14 days | ≥ 30 days |
| Database column | RFC + expand/contract migration | ≥ 1 release | ≥ 2 releases |
| Feature flag (full rollout) | n/a | ≥ 30 days post-100% | ≥ 30 days |
| AI model version | required ADR | ≥ 14 days | ≥ 30 days |

## Required Artifacts per Deprecation

- RFC or ADR documenting reason, alternative, and migration path
- code marker (`@deprecated` JSDoc / `DeprecationWarning` / equivalent)
- telemetry counter (so we measure remaining usage before EOL)
- migration guide (`docs/migrations/{slug}.md`)
- changelog entry on every release until EOL

## EOL Approval

EOL requires:
- usage telemetry shows < 0.1 % of baseline for at least 14 days, OR
- explicit cutover communicated to all known consumers, OR
- security/compliance override (documented)

## Forbidden

- silent EOL (removing without prior deprecation)
- skipping the announced-sunset window
- removing a public API without 410 Gone shim for at least 30 days post-EOL
