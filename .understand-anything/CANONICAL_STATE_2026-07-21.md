# Canonical State Record - 2026-07-21 (PR #1644 merge catch-up + PR #1646 merged + fabricated-doc correction)

Authoritative snapshot of repo state as of `main` HEAD `48e8b7e` (PR #1646 squash-merge). Code, `git log`, and direct GitHub API queries are the source of truth for this pass. This file: (1) corrects a documentation gap where PR #1644 merged 2026-07-17 but was never canon-synced, (2) records PR #1646's actual merge with final CI evidence (superseding an earlier draft of this file written while the PR was still open), and (3) documents a fabricated dependency-audit claim found in `docs/APEX_AGENT_OPERATIONS.md` and removed in this same pass.

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File | Canonical behavior after PR #1644 merge |
|---|---|---|
| PWA install trigger | `apps/omnihub-site/dashboard/OmniDashShell.tsx` | PWA install button removed from the OmniDash header (4 lines removed); no longer rendered in the canvas chrome. |
| PWA install trigger (new location) | `apps/omnihub-site/dashboard/components/modules/SettingsModule.tsx` | Imports and renders `<PWAInstallButton inline />` inside the Settings modal instead. |
| PWAInstallButton component | `src/components/PWAInstallButton.tsx` | Gained an `inline` rendering mode (+21 lines) to support embedding inside a modal panel rather than as a floating header trigger. |
| Regression coverage | `tests/lib/PWAInstallButton.spec.tsx` | **NEW** — 57-line spec covering the relocated component's inline mode. |

**Note:** PR #1644's merge commit (`418c4840`) folded an earlier docs-only commit (`f96c744`, "post-merge canon sync for PR #1641 and PR #1642") as its first commit — that docs commit was already reflected in `CANONICAL_STATE_2026-07-17.md`. The PWA-relocation feature itself was never separately canon-synced until this pass.

**Also merged to `main` in this window, out of this doc pass's scope:** `eeb86fc` (`feat(manifesto): brand-unify apex-manifesto, add MAN Mode section, wire ecosystem links`) — touches only `apps/omnihub-site/public/apex-manifesto.html` and `manifesto.html`. Root `CLAUDE.md` explicitly marks these files "already handled elsewhere"; noted here for HEAD-accounting completeness only, not audited further.

## 2. Verified Statistics & Reference (git-verified 2026-07-21, on `main` @ `48e8b7e`)

- **Release Line:** `1.8.3` (`package.json`), App `1.3.10`.
- **HEAD on `main`:** `48e8b7e` (PR #1646 squash-merge, 2026-07-21T22:34:37Z).
- **Source files (`src/`):** 234 `.ts` + 88 `.tsx` = **322 total**, unchanged by PR #1646. (Corrects a pre-existing off-by-one in the `233` figure carried since at least 2026-07-17 — `git diff 5c991065..418c4840 -- src/` shows zero `.ts`/`.tsx` changes, so the count was already 234 then; this was a prior audit error, not new drift.)
- **SQL Migrations:** **108** forward `.sql` files (unchanged since PR #1641) + **4** rollback scripts under `supabase/migrations/rollback/` = **112** total.
- **Edge Function dirs:** **35** (34 functions + `_shared`) — unchanged.
- **CI/CD Workflows:** **22** — unchanged in count; `ci-runtime-gates.yml` content changed under PR #1646 (see §3).
- **Production dependency audit:** `npm audit --omit=dev` → **0 vulnerabilities** of any severity (verified directly against the merged tree).
- **Primary Canonical Reference:** See `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` (Section 6 amended in this pass) and `README.md`.

## 3. PR #1646 — MERGED (`48e8b7e`, 2026-07-21T22:34:37Z)

Branch: `apex/sonarqube-contrast-arise-100-coverage-20260721-125730` → `main` (base `418c4840`). Title: "fix(accessibility): WCAG AA contrast ratios in landing.css & 100% test coverage for apex-arise." 10 commits, 28 changed files.

Scope (verified via `git diff` against the PR's own base):
- `apps/omnihub-site/src/styles/landing.css` — WCAG AA contrast fixes (another agent).
- `apps/apex-arise/tests/**` — coverage/lint fixes for two unused-variable ESLint warnings (another agent).
- `.osv-scanner.toml` / `osv-scanner.toml` (dotless, pre-existing duplicate file) — dev-toolchain CVEs accepted (`GHSA-4c8g-83qw-93j6` fast-uri, `GHSA-xvcm-6775-5m9r` immutable, `GHSA-xcpc-8h2w-3j85` adm-zip, `GHSA-3jxr-9vmj-r5cp` brace-expansion, `GHSA-73rr-hh4g-fpgx` diff, `GHSA-v56q-mh7h-f735` immutable) — another agent.
- `package.json` / `package-lock.json` — `@opentelemetry/*` bumped to `^0.220.0` (resolves `GHSA-45rx-2jwx-cxfr`, propagator-jaeger CVSS 7.5, another agent's commit, verified in this pass via direct OSV API query since the `osv-scanner` binary could not be downloaded in this sandbox); `dompurify` 3.4.11→3.4.12 (this pass — clears `GHSA-c2j3-45gr-mqc4`, published 2026-07-21T19:41Z, *after* the other agent's last push).
- `.github/workflows/ci-runtime-gates.yml` — this pass, twice: an initial attempt to override `JAVA_HOME` at the job level (ineffective — the `SonarSource/sonarqube-scan-action` re-exports `JAVA_HOME` internally to its bundled Java 17 JRE), superseded by setting `SONAR_SCANNER_JAVA_EXE_PATH` (SonarSource's documented override, read by the scanner bootstrapper directly, ahead of the action's internal `JAVA_HOME` reset). Root cause: SonarQube Cloud stopped supporting Java < 21 as of 2026-07-20, one day before this PR's CI ran — unrelated to this PR's actual diff. **Confirmed working**: `sonarqubecloud[bot]` posted "Quality Gate Passed" (0 new issues, 0 security hotspots, 100% coverage on new code, 0% duplication) on both `777f289` and `a9015b1`.
- Documentation fidelity pass (this session): `README.md`, this file, `CURRENT_PLATFORM_STATE_2026_07_16.md`, `DOCUMENTATION_RELEASE_INDEX.md`, `start-here.md` — catching up the undocumented PR #1644 merge.

**Final CI evidence** (all required checks, HEAD `a9015b1` — the commit that was merged):
| Required check | Conclusion |
|---|---|
| `CI Runtime Gates / build-and-test` | success |
| `apex-governance / Governance gate` | success |
| `apex-governance / Dependency vulnerability scan` | success |
| `Security Regression Guard / Dependency Security Audit` | success |

PR merged by `apexbusiness-systems` at `2026-07-21T22:34:37Z`, `merged: true`. No CODEOWNERS-review blocker materialized despite `.github/workflows/` and `*.md`/`/docs/` both being touched and both CODEOWNERS-protected paths.

## 4. Fabricated documentation claim found and corrected (this pass)

`docs/APEX_AGENT_OPERATIONS.md` carried a `### 9.13 Production dependency security audit updates — 2026-07-21 (PR #1646)` section (added in commit `4db5a5e`, already on the branch before this session started) claiming `npm audit fix --omit=dev` resolved vulnerabilities in `axios`, `brace-expansion`, `hono`, and `protobufjs`. **This never happened** — `4db5a5e` made zero changes to `package-lock.json`, and no commit on this PR's branch touched those packages. The section also collided in heading level/number with an unrelated pre-existing `## 9.13 Audit readiness closure — 2026-06-23 (PR #1483)` further down the same file, and was inserted out of chronological order ahead of `### 9.12.2`. It was squash-merged into `main` via PR #1646 before being caught. Removed in this pass; full writeup at `memory/omni-recall/wiki/corrections/005-fabricated-dependency-audit-claim.md`.

## 5. Documentation Sync (2026-07-21)

| File | Change |
|---|---|
| `README.md` | version `1.3.7`→`1.3.8`; `last_audited`→`2026-07-21`; HEAD note → `48e8b7e` (PR #1646, merged), `eeb86fc` (manifesto, out of scope) noted; `.ts` count `233`→`234`; migrations clarified as `108` forward + `4` rollback = `112`; stale ASCII repository-layout block reconciled; canonical state link → `CANONICAL_STATE_2026-07-21.md`. |
| `.understand-anything/CANONICAL_STATE_2026-07-21.md` | This file — rewritten from an earlier same-day draft (written while PR #1646 was still open) to record the actual merge, final CI evidence, and the fabricated-doc correction. |
| `docs/APEX_AGENT_OPERATIONS.md` | Removed the fabricated `### 9.13` section (see §4). |
| `memory/omni-recall/wiki/corrections/005-fabricated-dependency-audit-claim.md` | **NEW** — writeup of the fabricated-claim finding. |
| `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` | Section 6: PR #1644 Merged, PR #1646 Merged with final SHA. |
| `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` | Facts table + sync section updated to merged state. |
| `memory/omni-recall/start-here.md` | 2026-07-21 session block outcome appended. |
