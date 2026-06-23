---
version: 1.0.0
last_audited: 2026-06-23
status: approved
---

# RFC: Tenant-Scoped OmniConnect Entitlements + SSG Readiness Gate

Status: Approved
Owner: APEX Platform Engineering
Date: 2026-06-23
Related Tickets: /pull/1483
Affected Domains: OmniConnect, Supabase migrations, CI/CD production readiness, OmniHub Site SSG

---

## 1. Problem

The audit found three production-readiness gaps:

1. `EntitlementsService` referenced `tenant_entitlements`, but no repo-backed table guaranteed that contract.
2. `production-readiness.yml` did not exercise the isolated `apps/omnihub-site` SSG build.
3. `useSpatialEngine.removeEntity` passed an id string to `QuadTree.remove`, which expects the original `Point`.

## 2. Exact User

APEX platform engineers, release owners, and OmniConnect operators who need tenant-scoped connector feature access to fail closed and be certifiable before release.

## 3. Workflow

OmniConnect checks whether a user in a tenant can access a connector app feature. CI validates the root production bundle and the isolated site SSG bundle before merge. Spatial canvas consumers register, update, query, and remove entities without stale query results.

## 4. Current Pain

The entitlement runtime could fail at deploy time because the referenced table did not exist. SSG regressions were not blocked by production-readiness CI. Spatial removals silently no-oped, leaving removed or moved entities queryable.

## 5. Current Workaround

Manual audit and runtime discovery. There was no safe database fallback for `tenant_entitlements`, and spatial callers could not reliably remove entities by id.

## 6. Proposed Change

- Add `public.tenant_entitlements` as an additive, idempotent Supabase migration with tenant/user/app/feature scoping, soft-revoke status, timestamps, indexes, RLS, and explicit grants.
- Keep Web3 `public.entitlements` and UEP `public.user_entitlements` as separate domains; do not overload them for OmniConnect connector features.
- Add the isolated `bun run build:ssg` smoke gate in production readiness after dependency install and before the root production bundle.
- Fix spatial removal by storing the exact inserted `Point` by entity id and removing that point.

## 7. Business Capability

Tenant Entitlements, Connector Access Control, Release Safety, Premium UX Reliability.

## 8. Ownership Boundary

OmniConnect owns tenant connector feature entitlements. Web3 owns wallet/device/user-chain entitlements. UEP owns per-user skill/tier entitlements. CI/CD owns the SSG gate. The spatial engine owns in-memory point indexing only.

## 9. Data Flow

`EntitlementsService` uses a Supabase service-role client when available, reads active `tenant_entitlements` rows for checks/lists, upserts active grants, and soft-revokes by setting `is_active = false`. Authenticated users may select only their own entitlement rows through RLS; writes are service-role only.

## 10. Contracts

- Table: `public.tenant_entitlements(id, tenant_id, user_id, app_id, feature_key, is_active, created_at, updated_at)`.
- Unique contract: `(tenant_id, user_id, app_id, feature_key)`.
- RLS: authenticated own-row SELECT; service-role full access.
- CI: `production-readiness.yml` smoke job installs root + site dependencies and runs `bun run build:ssg` in `apps/omnihub-site`.
- Spatial: `SpatialEntity.data.id` is required for id-based removal.

## 11. Failure Modes

Missing Supabase credentials remain fail-closed. Missing or revoked rows return not entitled. SSG dependency or render regressions fail CI before deployment. Missing spatial ids no-op safely.

## 12. Observability

CI exposes the SSG gate result. Supabase errors are logged by `EntitlementsService` without granting access. Spatial behavior is covered by regression tests for removal and stale update replacement.

## 13. Rollback Strategy

Revert the PR commit. If the migration has been applied, review and archive any written tenant entitlement rows before dropping `public.tenant_entitlements`. Removing the SSG gate restores the prior CI behavior but reopens the audit gap.

## 14. Security Impact

No RLS weakening. No anon grants. Authenticated SELECT is row-scoped by `auth.uid() = user_id`; service-role writes are explicit. The change reduces accidental entitlement exposure by backing checks with a real fail-closed table contract.

## 15. Scalability Impact

Lookup indexes cover tenant/user active lists and tenant/user/app/feature active checks. Soft revoke keeps writes idempotent and avoids audit-hostile destructive deletes.

## 20. Architecture Review Checklist

- [x] No duplicate entitlement domain introduced; OmniConnect tenant features remain separate from Web3 and UEP entitlements.
- [x] RLS/auth boundaries preserved.
- [x] Migration is additive and idempotent.
- [x] CI gate added without weakening existing gates.
- [x] Rollback path defined.
