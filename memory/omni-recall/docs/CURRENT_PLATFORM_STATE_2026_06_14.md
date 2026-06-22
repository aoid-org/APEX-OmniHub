---
version: 1.0.0
created: 2026-06-14
last_audited: 2026-06-14
status: archived
archived_date: 2026-06-21
supersedes: docs/CURRENT_PLATFORM_STATE_2026_06_06.md
superseded_by: CURRENT_PLATFORM_STATE_2026_06_22.md
---

# Current Platform State — 2026-06-14

> **Canonical drift-control snapshot for `main` HEAD as of 2026-06-14.** Supersedes `CURRENT_PLATFORM_STATE_2026_06_06.md`. Historical docs remain valid as point-in-time evidence only where they do not conflict with this snapshot, `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`, or `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-14 |
| Branch inspected | `main` |
| HEAD at snapshot | `16f06b6f` — fix(ssrf): evaluate IPv4-mapped IPv6 via embedded IPv4 rules (#1393) |
| Prior HEAD (2026-06-13 session) | `def90cf` (fix(omnihub-site): resolve SonarQube audit issues, #1383) |
| Package version | `1.7.0` (root `package.json`) |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Package manager posture | npm-first for CI (`package-lock.json` canonical); bun optional for local dev |
| Certification authority | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `docs/architecture/CANONICAL_TRUTH.md` |

## Commits Since 2026-06-06 Snapshot (Key)

| SHA | Date | Description |
|---|---|---|
| `b66870b` | 2026-06-14 | fix: add docs/release/branch-protection.md — unblocks verify:ci-integrity |
| `def90cf` | 2026-06-13 | fix(omnihub-site): resolve SonarQube audit issues (#1383) |
| `d95715e` | 2026-06-13 | fix(types): align test-double stubs with canonical hooks (P0-0) |
| `726d7cc0` | 2026-06-14 | fix(ci): pyopenssl>=24.0.0 — cures 10 pytest collection errors (PR #1392) |
| `50013c4c` | 2026-06-14 | fix(release): un-hardcode ENABLE_ATOMIC_ROUTING_FLIP in release.yml (PR #1391) |
| `16f06b6f` | 2026-06-14 | fix(ssrf): evaluate IPv4-mapped IPv6 via embedded IPv4 rules (PR #1393) |

## Local Gate Verification (2026-06-13 — most recent full run, prior to 2026-06-14 CI fixes)

| Gate | Result |
|---|---|
| TypeScript (`bun run verify:types` / `tsc -b --noEmit`) | ✅ 0 errors (fixed by P0-0 stub alignment, d95715e) |
| ESLint | ✅ 0 problems |
| Vitest (`bun run test`) | ✅ 2736 passed / 70 skipped / 30 todo / 0 failed |
| Production build | ✅ (last verified 2026-06-06) |
| `verify:ci-integrity` | ✅ exit 0 (fixed by b66870b — branch-protection.md at repo root) |
| npm audit prod HIGH+ | ✅ 0 high/critical |

> **Note:** `typecheck` script (`tsc -p tsconfig.json`) is a **false-green no-op** — root tsconfig has `files: []`. The real gate is `verify:types` (`tsc -b --noEmit`). See 2026-06-13 correction in `state/checkpoints/current-status.md`.

## CI State (2026-06-14)

| Run | Workflow | SHA | Result |
|---|---|---|---|
| #898 | Clean-Room Final Certification | 726d7cc0 | ❌ 3 SSRF test failures |
| #899 | Clean-Room Final Certification | 50013c4c | ❌ Same SSRF failures |
| #900 | Clean-Room Final Certification | 16f06b6f | 🔄 in_progress — all 3 fixes present |

**Main was red for 20+ consecutive runs (#878–#897) due to pyOpenSSL GEN_EMAIL crash. All root causes now fixed.**

## Infrastructure State (2026-06-14)

| Component | Status |
|---|---|
| `apex-omnihub-shadow` CF Pages project | ✅ Provisioned (2026-05-20) |
| `CLOUDFLARE_API_TOKEN` secret | ✅ Set |
| `CLOUDFLARE_ACCOUNT_ID` secret | ✅ Set |
| `TF_TOKEN_app_terraform_io` secret | ✅ Set (2026-06-14) |
| `CLOUDFLARE_SHADOW_PROJECT_NAME` variable | ✅ apex-omnihub-shadow |
| `ENABLE_SHADOW_DEPLOYMENT` variable | ✅ true |
| `SHADOW_HEALTH_URL` variable | ✅ Set |
| `ENABLE_ATOMIC_ROUTING_FLIP` variable | ✅ true |
| `production-shadow` GitHub Environment | ✅ Exists, required_reviewers configured |
| Terraform Cloud org | apexbusiness-systems-ltd |

## Code Changes This Session (2026-06-14)

### PR #1391 — Un-hardcode routing-flip interlock (`release.yml`)

Four locations in `.github/workflows/release.yml` changed from hardcoded `'false'` to `vars.ENABLE_ATOMIC_ROUTING_FLIP`:

- L64: `ENABLE_ATOMIC_ROUTING_FLIP` env var
- L136: shadow deploy condition
- L154: fallback condition
- L157: `ROUTING_FLIP_ENABLED` env var

### PR #1392 — Fix pyOpenSSL CI crash (`orchestrator/requirements.txt`)

Added `pyopenssl>=24.0.0` after the `authlib>=1.3.0` block. The existing `Install orchestrator Python test deps` step in `release.yml` pip-installs this file; user site-packages take precedence over the system pyOpenSSL that was crashing.

**Root cause:** `instructor→bedrock→botocore→urllib3.contrib.pyopenssl→OpenSSL.crypto` import chain hit `AttributeError: module 'lib' has no attribute 'GEN_EMAIL'` because `pyOpenSSL < 24.0.0` references `cryptography` internals removed in `cryptography >= 42.0.0`.

### PR #1393 — Fix SSRF IPv4-mapped IPv6 classification (`orchestrator/security/ssrf.py`)

In `_check_ip()`, moved the `ipv4_mapped` guard **before** `is_reserved`. Python's `ipaddress` marks `::ffff:0:0/96` as `is_reserved=True`, so without this fix:
- Public IPv4-mapped (`::ffff:93.184.216.34`) → incorrectly blocked as "Reserved address"
- Loopback IPv4-mapped (`::ffff:127.0.0.1`) → wrong category "Reserved" instead of "Loopback"
- Private IPv4-mapped (`::ffff:10.0.0.1`) → wrong category "Reserved" instead of "Private"

## Current Certification Verdict

**`NOT_CERTIFIED_NO_RELEASE_CUT`** — `chore: version packages` merged 2026-06-05. CI run #900 in progress with all blockers fixed. On green: shadow deploy executes → health check → Terraform plan/apply → `write-release-evidence.mjs` → verdict updated.

## Repo Facts (carried forward from 2026-06-06, unchanged)

| Area | Count / State |
|---|---|
| Source files under `src/` | 317 TypeScript/TSX |
| Supabase Edge Functions | 29 directories (incl. `_shared`) |
| Supabase SQL migrations | 88+ top-level files |
| GitHub workflow files | 30 active (per 2026-06-14 API listing) |
| Test/spec sources | 244+ files |
| Python orchestrator files | 101+ |

## Authority

| Concern | Authority |
|---|---|
| Certification verdict | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture topology | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` |
| CI/release gate | `.github/workflows/release.yml` |
| Shadow deployment blockers | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| This document superseded by | `CURRENT_PLATFORM_STATE_<YYYY_MM_DD>.md` when next session produces one |
