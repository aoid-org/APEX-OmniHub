# Correction 001: Additive Migration Constraint Linter Comment Location
**Version:** 1.0.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Active & Ingested

## 1. Context
During the deployment of the PhysiOmni Phase 1 Pilot database migrations (`supabase/migrations/20260526000000_physiomni_pilot_init.sql`), the GitHub Actions CI workflow `build-and-test` failed on the additive migration gate `check-additive-migrations.ts`.

## 2. Original Wrong Assumption
It was assumed that putting the linter exception comment `-- additive-allow: ON_DELETE_CASCADE` on the **same line** as the constraint declaration would satisfy the gate check:
```sql
tenant_id  uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- additive-allow: ON_DELETE_CASCADE Clean up devices if tenant is deleted
```

## 3. Corrected State
The script `scripts/ci/check-additive-migrations.ts` uses `stripSqlComment` on code portions, stripping out any trailing comment text before matching. It then checks the **immediately preceding line** for the allowlist comment:
```typescript
const precedingLine = i > 0 ? lines[i - 1] : '';
if (isAllowlistComment(precedingLine, rule.id)) continue;
```
Therefore, the allowlist comment **must always reside on the line immediately preceding** the constraint declaration to pass the gate successfully:
```sql
-- additive-allow: ON_DELETE_CASCADE Clean up devices if tenant is deleted
tenant_id  uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
```

## 4. Scope
- **Scope:** `global` (applies to all future database migrations inside the `APEX-OmniHub` repository).
- **Affected Files:** `supabase/migrations/20260526000000_physiomni_pilot_init.sql`
- **Promotion Decision:** Promoted to permanent global database migration policy in `CLAUDE.md` and repository guidelines.
