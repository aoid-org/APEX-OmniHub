---
version: 1.0.0
created: 2026-06-23
last_audited: 2026-06-23
status: verified
supersedes: CURRENT_PLATFORM_STATE_2026_06_22.md
---

# Current Platform State — 2026-06-23

> **Canonical drift-control snapshot — 2026-06-23 (post-PR #1476 release-rescue audit).**
> Supersedes [`CURRENT_PLATFORM_STATE_2026_06_22.md`](./CURRENT_PLATFORM_STATE_2026_06_22.md).
> All values directly verified against the working tree HEAD `5870a8ec` + fix branch
> `fix/release-gate-claim-hygiene-omniskills`.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-23 |
| `main` HEAD at audit start | `5870a8ec` — Rebrand SkillForge to OmniSkills and update modal styling (#1476) |
| Fix branch | `fix/release-gate-claim-hygiene-omniskills` |
| Root package version | `1.8.1` |
| Platform stack | **Vite 7 + React 18 + TypeScript 5.9** — Cloudflare Pages (frontend), Supabase (DB/edge), Render/Temporal (orchestrator) |
| SonarQube project | `apexbusiness-systems_APEX-OmniHub` (SonarCloud) |

## PR #1476 — OmniSkills Rebrand + Modal Styling (MERGED 2026-06-22)

| Item | Status |
|---|---|
| Branch | `claude/great-curie-5l5v2i` — merged to `main` |
| Scope | OmniSkillsForgePanel, OmniSentryWidget, OmniMediaLaunchWidget, AuditsModule, AutomationsModule, BillingModule, FilesModule, WorkflowsModule, SettingsModule, OmniSpatialHost, OmniTraceFeed, OmniBoardWizard, i18n (9 languages), slider.tsx, omniMediaStore, sitemap.xml, Playwright E2E |
| CI green | Security Guards, apex-governance, compliance, Secret Scanning, Lighthouse, Security Regression Guard, Deploy to Staging, CI Runtime Gates |
| CI failing (pre-fix) | **Clean-Room Final Certification** — `verify:claim-hygiene` 9 false positives |

## Release Blocker Fixed (2026-06-23)

### verify:claim-hygiene — 9 false positives resolved

All 9 findings were internal non-rendered content: JSDoc comments, `notes:` metadata fields in
`featureTruth` data objects, and the W3C WebAuthn API parameter `attestation: 'none'`.
None are rendered as public product copy.

**Fix:** Surgical update to `scripts/ci/verify-claim-hygiene.mjs`:
- `stripCodeComments()` strips `//`, `/** */`, `/* */` before pattern matching (comments are never public UI copy)
- `NOTES_KEY_ONLY_RE` + `NOTES_INLINE_RE` + `inNotes` state machine skips `notes:` field values in TS data objects (internal engineering metadata, never rendered)
- `WEBAUTHN_ATTESTATION_PARAM_RE` skips `attestation: 'none'` W3C API parameter
- `walk()` extracted to `scripts/ci/ci-utils.mjs` as `walkFiles()` — eliminates cross-file duplication
- Real public claim protection verified unchanged: 5-fixture regression test suite added

### User-facing SkillForge copy fixed

| File | Change |
|---|---|
| `apps/omnihub-site/src/pages/Launch/SkillForge.tsx` | `<h1>Skill Forge</h1>` → `<h1>OmniSkills</h1>`; toast description rebranded |
| `apps/omnihub-site/src/App.tsx` | Route title `"Skill Forge"` → `"OmniSkills"` |
| Route path `/launch/skillforge` | Kept for backward compatibility |
| Component name `SkillForge`, file names | Kept as internal identifiers |

New guard `scripts/ci/check-omniskills-rebrand.mjs` added to prevent regression.

## CI Gate Status (post-fix local verification)

| Gate | Status |
|---|---|
| verify-ci-integrity | PASSED |
| verify-supabase-security | PASSED — 93 tables, all RLS |
| verify-supply-chain | PASSED |
| check-pwa-integrity | PASSED — 10/10 |
| check-omnidash-integrity | PASSED — 7/7 |
| assert_no_stubbed_provider_impls | PASSED |
| **verify-claim-hygiene** | **PASSED** (was FAILING) |
| check-omniskills-rebrand | PASSED (NEW guard) |
| Clean-Room Final Certification (CI) | YELLOW — local gates pass; CI run pending merge |

## Product-Realness Audit (PR #1476 surfaces)

| Surface | Backend | Honest on failure | Verdict |
|---|---|---|---|
| OmniSkillsForgePanel | `supabase.functions.invoke('generate-business-skills')` | 402 upgrade toast; error toast | REAL |
| OmniSkillsModule | `useOmniModuleState('omniskills')` | ModuleShell error/loading | REAL |
| OmniSentryWidget | `src/lib/omni-sentry` circuit-breaker | Disabled toggle shown | REAL |
| OmniMediaLaunchWidget | `useOmniMedia` store | Labeled as demo clips in JSDoc | HONEST |
| FilesModule | `useOmniModuleState('files')` | "Connect APEX Storage Provider" shown | HONEST |
| BillingModule | `useOmniModuleState('billing')` | Escalates to mailto:billing@ | HONEST |
| WorkflowsModule | `useOmniModuleState('workflows')` | ModuleShell error | REAL |
| AuditsModule | `useOmniModuleState('audits')` | ModuleShell error | REAL |
| AutomationsModule | `useOmniModuleState('automations')` | ModuleShell error | REAL |

## Security Notes

- No tracked secrets — all `.env.*` files are `.example` with confirmed mock values
- `verify:supabase-security` — 93 tables with RLS, no service-role literals in migrations
- Secret scanning CI: PASSED (2026-06-23 scheduled run)

---

## Batch 2 — Commercial Realness Fixes (2026-06-23, PR #1477 commit `1fa8870e`)

### Stripe checkout — fail-closed on missing env vars

**File:** `supabase/functions/create-checkout/index.ts`

| Before | After |
|---|---|
| `const stripePriceId = ... \|\| 'price_123456789'` — fake hardcoded Stripe price ID used when env unset | Removed entirely. `stripePriceId` is `undefined` if env absent. |
| `new Stripe(stripeSecretKey ?? '', ...)` — Stripe client created with empty string key | Removed from module scope. |
| No guard — requests proceeded with broken credentials | Fail-closed guard added at request entry: HTTP 503 `BILLING_NOT_CONFIGURED` if either `STRIPE_SECRET_KEY` or `STRIPE_PRICE_ID_PRO` is absent. |
| N/A | Stripe client instantiated inside guard — only runs when both secrets are present. |

Error response body when billing is unconfigured:
```json
{ "error": "BILLING_NOT_CONFIGURED", "message": "Billing is not configured. Contact support at billing@apexbusiness.systems." }
```

### ApexRealtimeGateway — env var name + Vite access pattern

**File:** `src/lib/realtime/ApexRealtimeGateway.ts`

| Before | After |
|---|---|
| `process.env.VITE_ORCHESTRATOR_BASE_URL \|\| process.env.ORCHESTRATOR_BASE_URL` — neither var exists in `.env.example`; `process.env` not available in Vite browser bundles | `import.meta.env.VITE_ORCHESTRATOR_URL` — correct Vite access pattern; correct var name (defined in `.env.example` line 91) |
| WSS URL silently fell back to `wss://localhost:3000/realtime/...` in every production deployment | Now correctly resolves to `wss://apex-orchestrator-api.onrender.com/realtime/<skillId>` in production |

The `skillId: 'omnisupport'` init payload is architecturally correct per `SKILL.md §H (DAG I/O Contract)` — the orchestrator resolves the skill server-side from skillId.

### OmniSupportWidget — console.warn cleanup

**File:** `src/components/global/OmniSupportWidget.tsx`

- Removed `console.warn('[OmniSupport] Connected')` on the successful `.then()` path — warning-level log on a non-error path is noise and misleads observability tooling.
- `.catch` error log retained (`console.warn('[OmniSupport] Connection failed:', err)`).
- `ApexRealtimeGateway.connect({ skillId: 'omnisupport' })` call retained and correct.
- `SkillRegistry.loadSkill()` is intentionally NOT called in the widget — per `SKILL.md §H`, skill loading is the orchestrator's responsibility. `loadSkill()` exists for client-side fallback environments.

### apex-support skill — audit confirmed correct

**File:** `.claude/skills/apex-support/SKILL.md`

Full read-through confirmed. No changes needed. Key facts preserved:
- Version 2.0 — production DAG executor node
- Section H defines I/O contract: orchestrator receives `skillId`, resolves systemPrompt server-side
- Section E: all billing issues route to `info-outreach@apexomnihub.com`
- Section F: prompt-injection defense, secret hygiene
- Section I: `SkillRegistry` JSON object for orchestrator registration
- `SkillRegistry.ts` compact prompt is the intentional client-side summary

### PR #1477 — final commit state

| Commit | SHA | Files |
|---|---|---|
| Batch 1 (OmniSkills + OmniSentry + CI gates) | `c9457b85` | 14 files |
| Batch 2 (Stripe + Gateway + OmniSupport) | `1fa8870e` | 3 files |

**Root cause of `release.yml` failures on `main`:** `verify-claim-hygiene.mjs` patched version is on `fix/release-gate-claim-hygiene-omniskills-v2`. Merging PR #1477 → main resolves CI.

---

## Conflict Resolution Rule

This document (2026-06-23) supersedes all prior `CURRENT_PLATFORM_STATE_*.md` files
unless a newer dated file exists.
