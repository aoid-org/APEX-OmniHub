---
rfc: 0001
title: Release-Candidate Remediation — architecture-impacting changes
status: accepted
created: 2026-06-28
pr: apexbusiness-systems/APEX-OmniHub#1510
owner: APEX Business Systems Ltd.
---

# RFC 0001 — Release-Candidate Remediation Architecture

Architecture-review evidence for PR #1510 (batched RC remediation). Covers the
changes that touch ownership, routing, deployed services, and the database.

## Context

APEX-OmniHub is NO-GO for full authenticated certification. This PR remediates
surface ownership, modal behavior, app-connect routing, the OmniMedia pipeline,
and related contracts in evidence-gated batches. This RFC records the
architecturally significant decisions and their blast radius.

## Decisions

### 1. Two-owner surface ownership (Batch 1)
`omniSurfaceOwnership.ts` is the single source of truth: **OmniBoard** owns
third-party provider connections; **APEX Apps** owns first-party MCP/OmniPort
apps. The legacy single-owner `appIntegrationOwnership.ts` is retired to a
deprecated re-export shim. Rationale: the old model misrouted "Add APEX App" to
OmniBoard. Blast radius: dashboard contracts + OmniDashShell routing; covered by
unit + E2E tests.

### 2. APEX Apps MCP modal (Batch 1)
A separate, independent prompt-first modal (`ApexAppsMcpModule`) opens the chosen
APEX app's OmniPort. No new backend; honest gateway (opens, never fakes
"connected"); durable install-state persistence deferred (`APEX-APPS-MCP-PERSIST`).

### 3. Modal close-law (Batch 1)
`OmniSpatialHost` ordinary modals close on Escape/backdrop (was: minimize);
minimize is an explicit button; focus returns to opener.

### 4. Connections split (Batch 2)
`ConnectionsWidget` replaces the dishonest Integrated Apps picker with two
single-owner sections + honest empty states. Source wiring
(`connector_sessions` / APEX install-state) deferred (`APEX-CONN-SOURCES`).

### 5. OmniMedia pipeline (Batch 3) — DB + storage + edge
- **DB (additive):** `public.omnimedia_assets` (RLS, owner-scoped) +
  migration `20260628000000_omnimedia_pipeline.sql`. Applied + tracked on
  project `rtopreovkywofgwgmozi`.
- **Storage:** private `omnimedia-assets` bucket (200 MB, media MIME allowlist),
  user-prefixed `storage.objects` policies.
- **Edge:** `omnilink-port` gains `omnimedia-catalog`, `-ingest-from-upload`,
  `-register-external`, `-delete-asset`. User-scoped anon client → RLS enforces
  ownership; signed URLs are TTL-bound and refetched; no `service_role` bypass.
- Rationale: replace demo-only YouTube clips with a real upload-fed pipeline.
  Migrations are additive-only; destructive changes are out of scope and require
  separate written approval.

## Security & rollback
- RLS mandatory on the new table; storage scoped by user prefix; privileged keys
  never reach the browser (see `ENV_CLASSIFICATION.md`).
- Rollback: additive migration → a follow-up additive migration can drop the new
  objects without touching existing data; frontend changes are git-revertible and
  feature-flag-gated where risky.

## Status
Accepted; implemented across batches on PR #1510 with per-phase evidence.
