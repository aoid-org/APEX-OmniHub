# APEX-OmniHub — Debt Triage Pass (2026-06-14)

Scope: **P2-1** (type-safety debt), **P2-2** (test debt), **P3-1** (partition RLS),
**P3-2** (entitlement table designation). P0-1, P1-1, P2-3, P3-3 were already fixed.

All changes are type-only / test / DB-comment level. **Zero production runtime change.**
Did not touch `src/lib/useAuth.ts`, `src/hooks/useOmniModuleState.ts`, or the
`@/*` path config in `tsconfig.app.json` / `apps/omnihub-site/tsconfig.json`.

---

## Phase 0 — Suppression baseline → result

| Metric            | Baseline | After | Δ    |
| ----------------- | -------: | ----: | ---- |
| `as any` (all)    |       90 |    79 | −11  |
| `as any` (src/)   |       24 |    13 | −11  |
| `@ts-ignore`      |        0 |     0 | 0    |
| `@ts-expect-error`|       16 |    16 | 0    |
| `eslint-disable`  |      139 |   128 | −11  |
| `.skip(`          |       19 |    18 | −1   |
| `it.todo`/`.todo` |       29 |    29 | 0    |

`bun run typecheck` ✓ · `bun run lint` ✓ — both green before and after.

---

## Phase 1 — P2-1 type-suppression triage

### Root-fixed (11 production `as any` removed, no cast left behind)

These were **stale suppressions**: the modern `lib.dom` accepts `Uint8Array` as
`BufferSource`, and the asserted types already matched the real ones.

- `src/lib/security/hmacValidator.ts` — `crypto.subtle.verify` accepts `Uint8Array` directly.
- `src/lib/auth/m2mAuth.ts` — same.
- `src/lib/omnibridge/syncPacketVerifier.ts` — same.
- `src/omniconnect/storage/encrypted-storage.ts` — `importKey` / `decrypt` accept `Uint8Array` (×3).
- `src/components/auth/OAuthButtons.tsx` — `provider` is already typed `Provider`; cast was dead.
- `src/omniconnect/translation/translator.ts` — `CanonicalEvent.metadata` already exists (canonical.ts:93).
- `src/lib/supabase/client.ts` — `SupabaseClient<Database>` is assignable to `SupabaseClient`; replaced with a precise `as SupabaseClient`.
- `src/components/ErrorBoundary.tsx` — `(globalThis as any).errorTracker` → precise inline type assertion.
- `src/lib/omni-sentry.ts` — `(performance as any).memory` → precise `Performance & { memory?… }` assertion.

### Documented deferrals (13 remaining src/ `as any`, each now carries a reason)

Genuine generated-type / third-party boundary gaps (Decision C). Each suppression
now has an `eslint-disable … -- <reason> (P2-1 deferral)` justification:

- `src/lib/database/providers/supabase.ts` (×5) — generic provider erases per-table
  row types; supabase-js requires a concrete Insert/Update type at this boundary.
- `src/hooks/useOmniStream.ts` (×2) — `agent_events` absent from generated Database
  types; `RealtimeChannel` generic mismatch with the ref element type.
- `src/omniconnect/entitlements/entitlements-service.ts` — `tenant_entitlements`
  absent from generated Database types (see Phase 4 note).
- `src/omniconnect/ingress/OmniPort.ts` — `raw_input` is an untyped `jsonb` column.
- `src/omnidash/realtime.ts` — supabase-js `.on('postgres_changes')` overload chaining
  is not expressible in the channel's declared type.
- `src/lib/push-native.ts` — Capacitor `DeliveredNotifications` element type is over-strict.
- `src/armageddon/worker.ts` — Temporal `Runtime` logger destination typing is incomplete.

### Known latent bug (tracked, runtime fix deferred)

- `src/lib/spatial/useSpatialEngine.ts:removeEntity` — `QuadTree.remove(point: Point<T>)`
  expects a `Point`, but the call passes a string `id`, so removal is silently a no-op.
  Correct removal needs an `id → Point` index that does not exist yet. Fixing it is a
  **runtime change, out of scope** for this type-debt pass; the suppression is retained
  and explicitly documented rather than masked.

### `@ts-expect-error` / `@ts-ignore`

`@ts-ignore`: 0. All 16 `@ts-expect-error` already carry reason comments and are
legitimate (CDN imports, jsdom WebSocket/AudioContext mocks, deliberately-malformed
test inputs, a custom-element JSX gap). None are stale (typecheck still errors without
them). No change required.

---

## Phase 2 — P2-2 test-debt triage

- **`.only`**: 0 ✓ (no silently-skipped suites).
- **Re-enabled**: `tests/omnidash/omnidash-widgets.chaos.spec.tsx` —
  "does not crash when Today mock throws on first render" passes un-skipped; `.skip` removed.
- **Confirmed-failing → kept skipped *with documented reasons*** (verified by un-skipping
  and running): `tests/web3/wallet-integration.test.tsx` (×2, Web3 component render/copy
  drift) and `tests/security/auditLog.spec.ts` (queue-on-500 retry semantics drift).
- **Legitimate conditional skips (not debt, left as-is)** — already the prescribed
  Decision-B pattern: `skipIf`/`describe.skip` gated on `CI`, service-key, desktop layout,
  or Supabase reachability across `tests/e2e-playwright/*`, `tests/omnidash/*`,
  `tests/integration/*`, `tests/maestro/e2e.test.tsx`.
- **Already-documented unconditional deferrals (left as-is)**:
  `tests/e2e-playwright/verify-translation-ui.spec.ts` (file-header rationale) and
  `tests/maestro/backend.test.ts` (empty `describe.skip` placeholder).

### `it.todo` inventory (29 — formal backlog, left as `it.todo`)

`it.todo` is vitest's native backlog primitive: these report as *todo*, never as
failures, and each carries a descriptive title that **is** the backlog item. Churning
29 identical `// DEFER` comments was judged net-negative (diff noise, no added signal),
so they are inventoried here instead and left as the formal backlog they already are:

- `tests/omnidash/*` (24): production-truthfulness, widget-lifecycle, theme-system (×3),
  settings-workspace-depth, omnimedia/omnislate boundary, fake-success-guardrails (×2),
  translation-realness, runs, module-actions-realness, zero-mock-widgets, omniskills-forge,
  orphaned-components-routing, apex-agent-avatar-selector, connect-ai-byom.
- `tests/smoke/*` (4): prompt16/prompt17 launch-claim & PWA/SEO/a11y stubs.
- `tests/unit/omniport-logging.test.ts` (1), `tests/stress/battery.spec.ts` (1).

---

## Phase 3 — P3-1 partition RLS (ground-truth: already remediated)

**No migration added — the protocol's suggested SQL would be incorrect for this schema.**

`supabase/migrations/20260528000000_physiomni_telemetry_partition_rls.sql` already
hardens the `physiomni_telemetry_2026_05/06/07/08` partitions by enabling RLS on each
child. This is a **fail-closed** design: with RLS enabled and no child-level policy,
direct queries by `authenticated`/`anon` are denied, `service_role` (BYPASSRLS) is
unaffected, and legitimate reads continue through the parent table, which retains its
tenant-scoped policies (`physiomni_pilot_init.sql`). This is *stricter* than adding
permissive per-partition policies.

The triage protocol's fallback `CREATE POLICY … USING (auth.uid() = user_id)` references
a **`user_id`** column that does not exist on this table — the isolation column is
**`tenant_id`**. Applying it verbatim would error. Status: **verified, no action.**

---

## Phase 4 — P3-2 entitlement table designation (ground-truth: not duplicates)

**No deprecation comment added — the two tables are distinct domains, not an
orphan/canonical pair.**

- `public.entitlements` (`20260101000000_create_web3_verification.sql`) — polymorphic
  web3/chain entitlement facts keyed on `(subject_type, subject_id, entitlement_key)`.
  Canonical for the web3 path; used by `src/lib/web3/entitlements.ts`.
- `public.user_entitlements` (`20260211000000_create_user_entitlements.sql`) — per-user
  subscription `tier` + UEP `active_skills`. Canonical for the monetization path; used by
  the subscription-activation RPC, skill-forge, onboarding, and the most recent enforcement
  trigger (`20260610000000_skill_entitlement_db_enforcement.sql`).

Neither is an orphan; deprecating either would break a live flow. Status: **verified,
no action** beyond this designation note.

> Latent gap (out of scope, flagged for backlog): `src/omniconnect/entitlements/
> entitlements-service.ts` queries a `tenant_entitlements` table that has **no migration**
> defining it. This is the source of the documented `as any` at that call site.

---

## Verification gate

- `bun run typecheck` → exit 0
- `bun run lint` → exit 0
- Affected vitest files re-run: 12 passed / 3 skipped (was 11 / 4) — no failures.
</content>
</invoke>
