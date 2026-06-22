---
version: 3.0.0
created: 2026-06-21
last_audited: 2026-06-21
status: archived
archived_date: 2026-06-22
supersedes: CURRENT_PLATFORM_STATE_2026_06_20.md
superseded_by: CURRENT_PLATFORM_STATE_2026_06_22.md
---

# Current Platform State — 2026-06-21 (V3)

> **⚠️ HISTORICAL / ARCHIVED (2026-06-22).** Superseded by [`CURRENT_PLATFORM_STATE_2026_06_22.md`](./CURRENT_PLATFORM_STATE_2026_06_22.md). Retained verbatim as a point-in-time record — do **not** treat the counts, HEAD, or version below as current.
>
> **Canonical drift-control snapshot taken 2026-06-21 against `main` HEAD `966d695f`.** Supersedes `CURRENT_PLATFORM_STATE_2026_06_20.md`. Historical dated snapshots remain valid as point-in-time evidence only where they do not conflict with this snapshot, `project-status/PRODUCTION_CERTIFICATION_STATUS.md`, or `architecture/ARCHITECTURE_CANONICAL_MAP.md`.
>
> **Verification scope (honesty note):** repository counts, HEAD, versions, and behavior changes were **directly verified this session** against the working tree and `git log`. Live infrastructure state (Render/Temporal/Supabase runtime health) is **carried forward** from the 2026-06-19 end-to-end verification.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-21 |
| Branch inspected | `main` |
| HEAD at snapshot | `7bf395cf` — SkillForge/OmniSkills: free cap 5, Groq-preferred generation, paywall hardening + tests (#1462) |
| Prior HEAD (2026-06-21 V2 snapshot) | `10828a76` — fix(starmap): avoid CatmullRom endpoint crash while preserving minimalist 3D map visuals (#1461) |
| Package version | `1.8.1` (root `package.json`) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Package manager posture | npm-first for CI (`package-lock.json` canonical); bun optional for local dev |
| Certification authority | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `docs/architecture/CANONICAL_TRUTH.md` |

## Commits Since 2026-06-21 V1 Snapshot (`966d695f`)

| SHA | Date (git) | Description | PR |
|---|---|---|---|
| `966d695f` | 2026-06-20 | fix(omnidash): canonical widget rescue and global drift guards (HEAD of prior snapshot) | #1441 |
| `42723d81` | 2026-06-21 | docs: repo-truth sync to main@966d695f (README + omni-recall living docs) | #1442 |
| `9cb22e06` | 2026-06-21 | chore: version packages | N/A |
| `a6d96a36` | 2026-06-21 | fix(release): correct HCP Terraform org + wire TF_PROD_TOKEN | #1444 |
| `8772015e` | 2026-06-21 | chore: version packages | N/A |
| `77125864` | 2026-06-21 | fix(terraform): bundle modules for HCP remote plan + comprehensive docs pass | #1446 |
| `b23b05f6` | 2026-06-21 | Fix pg_cron rollback migration idempotency | #1448 |
| `852257e0` | 2026-06-21 | fix(omnidash): preserve OmniSlate controls across responsive layouts | #1451 |
| `53f40270` | 2026-06-21 | fix(omnihub-site): localize public language switcher | #1450 |
| `2de1e8e9` | 2026-06-21 | Refactor hero layout to flex-based adaptive grid system | #1452 |
| `2683aa51` | 2026-06-21 | fix(byom): Connect AI login auth + proxy inference end-to-end on a clean stack | #1449 |
| `8cd3c684` | 2026-06-21 | fix(platform-health): use service-role client for DB health probe | N/A |
| `9ef39000` | 2026-06-21 | feat(site): split-hero layout for Platform Map section | #1453 |
| `25179687` | 2026-06-21 | fix(site): restore visible 3D map (split hero via copy-left) | #1454 |
| `924cc9be` | 2026-06-21 | chore: resolve SonarQube audit issues and restore A-grade | #1459 |
| `e39f0966` | 2026-06-21 | Claim-approved production release: feature truth ledger & certified surfaces | #1456 |
| `10828a76` | 2026-06-21 | fix(starmap): avoid CatmullRom endpoint crash while preserving minimalist 3D map visuals | #1461 |
| `7bf395cf` | 2026-06-21 | SkillForge/OmniSkills: free cap 5, Groq-preferred generation, paywall hardening + tests — **current `main` HEAD** | #1462 |

## BYOM Sovereign Intelligence Auth (PR #1449)
A monumental shift in platform execution policy. The `byom-proxy` Edge Function was successfully deployed, validating multimodal proxy inference end-to-end. We enabled user-supplied API keys (Anthropic, Groq) via `byom-login`, successfully gating all inference requests based on secure JWT validation.

## Claim-Approved Production Release & WebAuthn (PR #1456)
Merged the feature-truth ledger and established certified product surfaces. Includes WebAuthn ES256 identity verification support for secure hardware-bound identities. The OmniTrace read-contract migration (20260621000002) was also safely deployed, guaranteeing replay read pipelines.

## Starmap & Split-Hero Layouts (PR #1453, #1454, #1461)
The Platform Map section was upgraded to a split-hero responsive layout. We resolved WebGL crashing artifacts within the `CatmullRomCurve3` logic (`safeProg`) while completely preserving the 12 minimalist icosahedron stations and the CatmullRom spine, avoiding drift towards unrelated UI artifacts. 

## SonarQube A-Grade Attestation (PR #1459)
Eliminated super-linear RegEx and Code Smells across the platform (`webauthnClient.ts`, `OmniSentryPanel.tsx`, `EyesVisionInput.tsx`), cleanly restoring our SonarCloud A-grade.

## SkillForge Cap-5 & Groq Routing (PR #1462)
Reconciled OmniSkills logic around a newly expanded **5-skill free tier** using the `20260622000000` idempotent SQL migration, unlocking greater product exploration. AI generation was hardened to **prefer Groq via the `_shared/llm.ts` abstraction**, providing cost-effective compute with an Anthropic fallback. To ensure long-term stability and adhere to our 500-line module policy, `generate-business-skills` was elegantly decomposed into four single-responsibility files (`index.ts`, `onboarding-wizard.ts`, `skill-provider.ts`, `http-helpers.ts`).

## Repo Stats (Verified 2026-06-21, V3 session)

| Area | Count / State | Verification command |
|---|---|---|
| Source files under `src/` | 327 TypeScript/TSX | `find src -type f \( -name '*.ts' -o -name '*.tsx' \)` |
| React components under `src/` | 94 `.tsx` | `find src -type f -name '*.tsx'` |
| Page routes under `src/pages/` | 0 (routes live under app/domain folders) | `find src/pages -type f` |
| Supabase Edge Function directories | 33 (32 function dirs + `_shared`) | `find supabase/functions -maxdepth 1 -mindepth 1 -type d` |
| Supabase SQL migrations | 98 `.sql` total | `find supabase/migrations -name '*.sql'` |
| GitHub workflow files | 23 | `find .github/workflows -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \)` |
| Custom hooks (`src/` + `apps/`) | 40 (`use*.ts*`) | `find src apps -type f -name 'use*.ts*'` |
| Python orchestrator files | 103 | `find orchestrator -name '*.py'` |
| Test/spec source files (`tests`,`e2e`,`sim`,`apps`,`orchestrator`,`packages`) | 3438 | `find … \( -name '*.test.*' -o -name '*.spec.*' -o -name 'test_*.py' -o -name '*_test.py' \)` |
| Root package version | `1.8.1` | `package.json` |
| App package version | `1.3.10` | `apps/omnihub-site/package.json` |

## Infrastructure State (carried forward)

| Component | Status |
|---|---|
| APEX Agent (end-to-end) | LIVE — demo-ready |
| `apex-orchestrator-api` (Render) | Running — `/health` 200 |
| `apex-orchestrator-worker` (Render) | Running — `SEMANTIC_CACHE_ENABLED=false` (512 MB Starter) |
| Temporal Cloud | Connected — ns `apex-omnihub-temporal.i7ero`, ca-central-1 |
| Supabase `agent_runs` | Live — completing runs to terminal states |
| `omni_policies` | Live — 7 tailored policies enforced |
| `apex-omnihub-shadow` CF Pages | Provisioned — shadow deploys active |
| Ops Doc Guard CI check | Active — fails PRs that change runtime contracts without updating `docs/APEX_AGENT_OPERATIONS.md` |

## Authority

| Concern | Authority |
|---|---|
| Certification verdict | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture topology | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` |
| APEX Agent operations | `docs/APEX_AGENT_OPERATIONS.md` |
| CI/release gate | `.github/workflows/release.yml` |
| Ops-doc drift enforcement | `.github/workflows/ops-doc-guard.yml` + `scripts/ci/check-ops-doc-drift.mjs` |
| This document superseded by | `CURRENT_PLATFORM_STATE_<YYYY_MM_DD>.md` when next session produces one |
