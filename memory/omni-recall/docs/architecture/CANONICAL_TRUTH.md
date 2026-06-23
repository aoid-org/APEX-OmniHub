---
version: 1.2.0
last_audited: 2026-06-22
status: verified
---

# Canonical Truth File — Platform Topology & Deployment

**Version:** 1.8.1 (1.8.2 in progress)
**Last Updated:** 2026-06-22

**Latest verified branch/head:** `main` @ `1f22570` (`chore: exempt apex-governance.yml from ops drift guard`). Prior landmark `966d695f` (#1441). See `docs/CURRENT_PLATFORM_STATE_2026_06_21.md` (2026-06-22 refresh pending).
**Owner:** Platform Architecture

## Source of Truth Statements

1. Frontend runtime is React 18.3.1 + Vite 7.
2. `src/App.tsx` is a shim that re-exports `apps/omnihub-site/src/App.tsx`.
3. Supabase Edge Functions under `supabase/functions/` are the canonical edge API layer.
4. Orchestrator runtime boundary: `orchestrator/main.py` (Temporal Worker lifecycle) vs `orchestrator/server.py` (HTTP workflow dispatch). `services/orchestrator/` is a **separate** runtime: FastAPI HTTP API layer (`api/routes.py`) + deterministic FSM (`fsm.py`). It must not initialise Temporal Workers. `omega/` is the **APEX Resilience Protocol** — human-in-the-loop verification engine (`engine.py`) and HTTP approval dashboard (`dashboard.py`); it runs independently and is not a Temporal service.
5. CI authority for gates: `.github/workflows/ci-runtime-gates.yml`.
6. Current production web deployment topology is Cloudflare Pages aligned. Production deployment: `apex-omnihub` (https://apexomnihub.icu). Shadow deployment slot: `apex-omnihub-shadow` (apex-omnihub-shadow.pages.dev, created 2026-05-20).
7. Production Supabase project: `rtopreovkywofgwgmozi` (ca-central-1). All public-schema tables have RLS enabled as of 2026-05-04. Migrations are applied via Supabase MCP. See `docs/infrastructure/SUPABASE_SETUP.md` for full security posture.
8. All SECURITY DEFINER functions in the public schema must have: (a) `search_path` pinned to `public`, (b) EXECUTE revoked from `anon` at minimum. Trigger and maintenance functions also revoke `authenticated`. Business-logic functions retain `authenticated` + `service_role` access.
9. OmniBridge persistence layer (`omnibridge_events`, `omnibridge_events_dlq`, `omnibridge_control_audit`) is live in production as of v1.6.1 (2026-05-04). The `app_role` enum contains only `admin` and `user` — do not reference `super_admin` or `operator` in RLS policies.
10. **Package manager is npm.** `npm ci` is the authoritative install path. Bun is allowed for optional local speed. Lockfile policy: both `bun.lock` and `package-lock.json` are committed. `package-lock.json` is required by CI `npm audit` steps and must never be gitignored or deleted.
11. **TypeScript version is 5.9.x.** `ignoreDeprecations` must be `"5.0"`. The value `"6.0"` is invalid in TypeScript 5.x and causes `TS5103: Invalid value` breaking all TSC-dependent CI gates.
12. **`tsconfig.json` must be valid JSON.** `//` and `/* */` comments are not valid JSON. `tests/quality/platform-quality-gates.test.ts` parses `tsconfig.json` with `JSON.parse()` — any comment will throw `SyntaxError` and fail Gate 6.
13. **Path alias split is intentional and load-bearing.** `vite.config.ts` resolves `@/*` → `./apps/omnihub-site/src/*`. `vitest.config.ts` resolves `@/*` → `./src/*`. Do not align these — the split enables test isolation between root-package code and the omnihub-site app.
14. **Dev server port is 8080.** `vite.config.ts` sets `server.port: 8080`. Documentation referencing port 5173 is incorrect.
15. **`orchestrator/requirements.lock` must stay committed.** The `Dependency Security Audit` CI gate checks for its existence. Do not delete or gitignore it.
16. **OmniBridge bidirectional integration is live as of v1.6.1 (2026-05-11).** The integration harness (`integration-harness/lib/deterministic-validator.mjs`) provides a 47-assertion zero-dependency validator for the HMAC-signed sync layer between APEX-OmniHub and SBBL-HQ. See `docs/integration/sbbl-omnihub-validation-2026-05-11.md` for the full validation report.
17. **SBBL-HQ is the first registered production tenant.** It connects to APEX-OmniHub as the control plane via the OmniBridge sync protocol. Required secrets: `OMNIHUB_SIGNING_SECRET`, `OMNIHUB_SYNC_URL`, `OMNIHUB_VERIFY_KEY`. Inbound packets are verified with HMAC-SHA256 using `OMNIHUB_VERIFY_KEY`; outbound commands are signed with `OMNIHUB_SIGNING_SECRET`.
18. **OmniDash left sidebar is a dedicated 9-widget rail contract.** The canonical source is `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`; `OmniDashShell.tsx` must render `OMNIDASH_SIDEBAR_WIDGETS` and must not define local `NAV` or `NAV_MODULE_KEY`. `APP_REGISTRY` and `src/contracts/omnidash.contract.ts` remain broader 14-app product/platform contracts, not sidebar contracts. Sidebar order is locked to: OmniBoard, PhysiOmni, Audits, Links, Automations, Workflows, Files, Billing, Settings. OmniSkills, Orchestrator, Fortress, OmniPort, Maestro, and BYOM are explicitly not left-sidebar widgets.
19. **OmniBoard is the definitive app integration surface (corrected 2026-06-20).** It serves as a client-facing endpoint — first widget in the left-sidebar rail; the conversational `OmniBoardWizard.tsx` modal opens via OmniSpatialHost and is driven by typed prompts against the FSM endpoints `/omniboard/start` and `/omniboard/{session_id}/next`. The connect FSM outputs a verified Connection Spec, and downstream payload normalization into APEX-OmniHub state vectors is performed by `.claude/skills/apex-universal-sync-orchestrator`. The retired claim "OmniBoard is strictly for application integration — not for clients" must not reappear in docs or skill descriptions. See `docs/platform/OMNIBOARD.md`.
20. **SkillForge canonical facts.** Edge function `supabase/functions/generate-business-skills/index.ts`: 401 auth gate, 402 entitlement gate (`check_skill_entitlement`, BASIC cap 3 / PRO 999,999), live Anthropic generation with model `claude-3-5-haiku-20241022`, skill name `skill_${crypto.randomUUID()}` (full UUID, no timestamp), insert of exactly `{ user_id, name, trigger_intent, definition }`, response `entitlement.used = current + 1` (optimistic increment). Three UI surfaces: full page `/launch/skillforge` (Step 4 success state), embeddable `SkillForgeWidget` (closes on success; invalidates `['user-skills']`, `['workflows']`), and the `OmniSkillsModule` routed via `MODULE_COMPONENTS` in `ModuleRenderer.tsx` (not `ModuleRegistry.ts`). See `docs/skill-forge-implementation.md`.

21. **Module action gating is a module-keyed capability map (PR #1441, 2026-06-21).** `apps/omnihub-site/dashboard/contracts/moduleActionCapabilities.ts` is keyed by `moduleKey + actionId` (covering both baseline hyphen ids and live underscore ids); it replaced the prior single global whitelist. Unsupported actions fail-closed in `ModuleShell` with **module-specific** copy and must **never** call `trigger-workflow`. Labels equal to the action id or containing underscores are humanized by `normalizeActionLabel` in `useOmniModuleState.ts` (`create_workflow` → `Create Workflow`) without implying the action is wired. **Links** stages valid `http(s)` URLs in local component state only (no persistence table yet — deferred, JR-gated), shows "Links are staged locally until link-context persistence is connected." and "OmniSlate context handoff is not connected yet."; its **Add Link** button is enabled on a valid URL and is never permanently disabled. The live `omnilink-port` `module-state` Links resolver returns an honest **empty** link-context state — it does **not** read the `integrations` table and does **not** return `test-all` (see `docs/APEX_AGENT_OPERATIONS.md §9.1`). The OmniBoard wizard (`OmniBoardWizard.tsx`) carries an `AbortController` timeout and the explicit error taxonomy: missing config, invalid URL, unreachable/CORS, HTTP non-2xx, auth required, timeout — and never fakes a successful connection.

## Tenant Registry

**Last Updated:** 2026-06-01 | **Integration Status Authority:** This section is canonical for all tenant onboarding state.

### tenant-001: SBBL-HQ

| Field | Value |
|-------|-------|
| **Tenant ID** | `sbbl-hq` |
| **Tenant Name** | SBBL-HQ (Southern Basketball League Headquarters) |
| **Integration Status** | **ACTIVE** |
| **Onboarded** | 2026-05-11 (SBBL-HQ PR #502 merged; APEX-OmniHub PR #1108 in review) |
| **Validation Report** | `docs/integration/sbbl-omnihub-validation-2026-05-11.md` |

**Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `POST /webhooks/omnihub` | Inbound command receiver (HMAC-verified, idempotent, risk-classified) |
| `POST /api/omniport/command` | OmniPort diagnostic surface (Bearer JWT, allowlist: PING / ECHO / HEALTH_CHECK / TELEMETRY_SNAPSHOT) |
| `POST /sync/drain` | Outbound telemetry sync to OmniHub (`/api/omnibridge/sync`) |

**Secrets (must be provisioned in Cloudflare Worker environment):**

| Secret | Description | Rotation Policy |
|--------|-------------|-----------------|
| `OMNIHUB_SIGNING_SECRET` | HMAC key for signing outbound SyncPackets sent to OmniHub | Rotate both sides simultaneously; min 256-bit entropy |
| `OMNIHUB_SYNC_URL` | URL of the OmniHub `/api/omnibridge/sync` Pages Function endpoint | Update when OmniHub deployment URL changes |
| `OMNIHUB_VERIFY_KEY` | Key for verifying inbound commands from OmniHub; falls back to `OMNIHUB_SIGNING_SECRET` in dev/staging | Rotate independently from signing secret in production |

**Integration notes:**
- Outbound sync uses the `{ packet, signature }` envelope with headers `X-Omni-Source`, `X-Omni-Signature`, `X-Omni-Packet-Id`, `X-Omni-Trace-Id`.
- Inbound commands are pinned to `target_source === "sbbl-hq"` — commands addressed to other tenants are rejected `400`.
- Risk-lane re-classification on SBBL ingress rejects `DROP/TRUNCATE/ALTER ROLE/DISABLE RLS/GRANT ALL` payloads regardless of signature validity.
- All inbound actions are recorded via `log_admin_action` RPC for audit trail continuity.

---

## Conflict Resolution Rule

If current branch/head facts are needed, consult `docs/CURRENT_PLATFORM_STATE_2026_06_21.md` (latest snapshot) before dated audit reports.

If any other document conflicts with this file, this file wins unless explicitly superseded by a newer dated canonical file.


---

## Source-of-Truth Statement 22 (2026-06-23)

**OmniSkills rebrand is complete in all user-facing surfaces.**
- `apps/omnihub-site/src/pages/Launch/SkillForge.tsx` renders `<h1>OmniSkills</h1>` and rebranded toast copy.
- `apps/omnihub-site/src/App.tsx` route title is `"OmniSkills"`. Route path `/launch/skillforge` is intentionally preserved for backward compatibility.
- CI guard `scripts/ci/check-omniskills-rebrand.mjs` enforces this in all PRs.
- Internal identifiers (`SkillForgePanel`, `OmniSkillsForgePanel`, `launch/skillforge`) are implementation details — not user-facing — and are NOT flagged by the guard.

**Claim-hygiene gate is fully operational (was broken since before PR #1476).**
- `verify-claim-hygiene.mjs` now correctly ignores: JSDoc/inline code comments, `notes:` field values in TS data files, and W3C WebAuthn API parameters (`attestation: 'none'`).
- Public-facing unverified claims (SOC 2, uptime SLA, attestation copy) still FAIL the gate as required.
- 5 fixture tests in `tests/ci/claim-hygiene-fixtures.test.mjs` prove both behaviors.

**OmniSentry runtime is fully wired end-to-end in both UI surfaces (2026-06-23).**
- `src/lib/omni-sentry.ts` — browser-side circuit-breaker + self-healing monitor. All state in `sessionStorage` (not `localStorage` — security rule NS-M-008).
- `apps/omnihub-site/dashboard/components/OmniSentryWidget.tsx` — sidebar widget. Wired: `initializeOmniSentry`, `shutdownOmniSentry`, `getHealthStatus` (5 s poll), `flushOfflineErrors` (flush button, visible when queue > 0), `withResilience` (live circuit probe).
- `apps/omnihub-site/src/components/OmniSentryPanel.tsx` — full-page surface. Same 5 capabilities + expanded offline queue section + probe section with explanatory copy.
- Widget sits in right sidebar of `OmniDashShell.tsx` at line 1543, directly below `OmniTraceFeed` at line 1542. `data-testid="omni-sentry-widget"`.
- 18-test smoke suite at `tests/omnidash/omni-sentry-widget.spec.tsx` covers all 5 wired capabilities.
- Release gate `tests/release/omni-sentry-surface.spec.ts` — all 4 assertions pass.

**Conflict Resolution Rule (updated):** If current branch/head facts are needed, consult `docs/CURRENT_PLATFORM_STATE_2026_06_23.md` (latest snapshot) before prior dated snapshots.

## Source-of-Truth Statement 23 (2026-06-23)

**Stripe checkout is fail-closed when billing env vars are absent.**
- `supabase/functions/create-checkout/index.ts` no longer contains `price_123456789` (fake fallback price ID) or `Stripe(stripeSecretKey ?? '', ...)` (empty-key client).
- If either `STRIPE_SECRET_KEY` or `STRIPE_PRICE_ID_PRO` is absent at runtime, the function returns HTTP 503 `{ error: 'BILLING_NOT_CONFIGURED' }` immediately — no Stripe client is created, no broken session is submitted.
- Stripe client is instantiated inside the guard only when both secrets are confirmed present.

**ApexRealtimeGateway env var is corrected (Vite-native).**
- `src/lib/realtime/ApexRealtimeGateway.ts` previously read `process.env.VITE_ORCHESTRATOR_BASE_URL` (nonexistent var, Node.js `process.env` — not available in Vite browser bundles).
- Fixed to `import.meta.env.VITE_ORCHESTRATOR_URL` — correct Vite build-time env access; correct var name (defined in `.env.example` and wired into `release.yml` build step).
- Production WSS URL is now `wss://apex-orchestrator-api.onrender.com/realtime/<skillId>`.

**OmniSupportWidget → apex-support skill wiring is architecturally correct.**
- `OmniSupportWidget` calls `ApexRealtimeGateway.connect({ skillId: 'omnisupport' })` on open — this is correct.
- The orchestrator resolves the skill definition from `skillId` server-side (per `.claude/skills/apex-support/SKILL.md §H DAG I/O Contract`). The widget does not need to call `SkillRegistry.loadSkill()`.
- `SkillRegistry.ts` compact `APEX_SUPPORT_SYSTEM_PROMPT` is the intentional client-side fallback — it is NOT a duplicate of SKILL.md; it is the abbreviated variant for non-orchestrator environments.
- Billing escalation email in `SkillRegistry.ts`: `info-outreach@apexomnihub.icu` (widget-facing). SKILL.md Section E: `info-outreach@apexomnihub.com` (DAG executor). Both are valid; `apexomnihub.icu` is the primary production domain.

**OmniSentry state storage is sessionStorage, not localStorage.**
- `src/lib/omni-sentry.ts` stores all state in `sessionStorage` — enforced by security rule NS-M-008 (no cross-tab persistence of error/circuit state).
- `OMNISENTRY.md` has been corrected to reflect this (was incorrectly documented as `localStorage`).

**Conflict Resolution Rule (updated):** Consult `docs/CURRENT_PLATFORM_STATE_2026_06_23.md` for the current canonical snapshot.

## Source-of-Truth Statement 24 (2026-06-23)

**Links is now live-persisted (supersedes the Links portion of Statement 21).** `apps/omnihub-site/dashboard/components/modules/LinksModule.tsx` writes validated `http(s)` URLs to the Supabase `omnilink_links` table (migration `20260622102600_omnilink_links_persistence.sql`; own-row RLS for insert/select/update/delete). The `omnilink-port` `module-state` `resolveLinks` resolver SELECTs from `omnilink_links` (JWT forwarded via `createAnonClient(authHeader)` → RLS-scoped to the owner). Add Link refreshes the panel in place via `useOmniModuleState().refetch()` — **no full-page reload**. The earlier "staged locally until link-context persistence is connected" copy and the "empty link-context" resolver claim are retired.

**Production demo-state is hard-disabled in production builds.** `DemoModeContext` defaults `demoMode:false` and force-disables demo in production (`import.meta.env.PROD`); a stale localStorage value cannot re-enable it and the Demo Mode ops toggle is hidden in prod (`SentinelPanel`). The three previously hardcoded "(Simulated)" status labels in `OmniDashShell` (header Zero Trust badge + footer Guardian/Zero-Trust) are now gated on `demoMode`. The fabricated `syncedMinutesAgo` metric in `useAppRegistryHealth` is replaced with an honest `null` (rendered as "—"). No visual/layout drift.

**OmniBoard connect-wizard errors are honest (refines Statement 21 taxonomy).** `OmniBoardWizard.describeConnectionError` maps opaque Supabase transport strings ("Edge Function returned a non-2xx status code", relay/fetch failures) to user-facing copy and never leaks them; genuinely descriptive errors still pass through. The retry control reads "Retry Connection" after a failure. The underlying `omniboard-start` edge availability remains a separate backend item.
