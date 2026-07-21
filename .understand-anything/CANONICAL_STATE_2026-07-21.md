# Canonical State Record - 2026-07-21 (PR #1644 merge catch-up + PR #1646 CI remediation, in progress)

Authoritative snapshot of repo state as of `main` HEAD `418c4840` (PR #1644 squash-merge), plus the live status of open PR #1646. Code, `git log`, and direct GitHub check-run queries are the source of truth for this pass — this file corrects a documentation gap (PR #1644 was merged 2026-07-17 but never canon-synced) and records PR #1646 honestly as **not yet merged**.

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File | Canonical behavior after PR #1644 merge |
|---|---|---|
| PWA install trigger | `apps/omnihub-site/dashboard/OmniDashShell.tsx` | PWA install button removed from the OmniDash header (4 lines removed); no longer rendered in the canvas chrome. |
| PWA install trigger (new location) | `apps/omnihub-site/dashboard/components/modules/SettingsModule.tsx` | Imports and renders `<PWAInstallButton inline />` inside the Settings modal instead. |
| PWAInstallButton component | `src/components/PWAInstallButton.tsx` | Gained an `inline` rendering mode (+21 lines) to support embedding inside a modal panel rather than as a floating header trigger. |
| Regression coverage | `tests/lib/PWAInstallButton.spec.tsx` | **NEW** — 57-line spec covering the relocated component's inline mode. |

**Note:** PR #1644's merge commit (`418c4840`) folded an earlier docs-only commit (`f96c744`, "post-merge canon sync for PR #1641 and PR #1642") as its first commit — that docs commit was already reflected in `CANONICAL_STATE_2026-07-17.md`. The PWA-relocation feature itself was never separately canon-synced until this pass.

## 2. Verified Statistics & Reference (git-verified 2026-07-21, on `main` @ `418c4840`)

- **Release Line:** `1.8.3` (`package.json`), App `1.3.10`.
- **HEAD on `main`:** `418c4840` (PR #1644 squash-merge, 2026-07-17).
- **Source files (`src/`):** 234 `.ts` + 88 `.tsx` = **322 total**. (Corrects a pre-existing off-by-one in the `233` figure carried since at least 2026-07-17 — `git diff 5c991065..418c4840 -- src/` shows zero `.ts`/`.tsx` changes, so the count was already 234 then; this was a prior audit error, not new drift.)
- **SQL Migrations:** **108** forward `.sql` files (unchanged since PR #1641) + **4** rollback scripts under `supabase/migrations/rollback/` = **112** total. The Platform Statistics table in `README.md` reports the 108 forward-only figure; the ASCII repository-layout block now shows both components consistently.
- **Edge Function dirs:** **35** (34 functions + `_shared`) — unchanged.
- **CI/CD Workflows:** **22** — unchanged in count; `ci-runtime-gates.yml` content changed under PR #1646 (see §3).
- **Primary Canonical Reference:** See `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` (Section 6 amended in this pass) and `README.md`.

## 3. PR #1646 — OPEN, NOT MERGED (live status as of this snapshot)

**Do not treat any of the below as landed on `main`.** Branch: `apex/sonarqube-contrast-arise-100-coverage-20260721-125730` → `main` (base `418c4840`). Title: "fix(accessibility): WCAG AA contrast ratios in landing.css & 100% test coverage for apex-arise."

Scope actually touched (verified via `git diff` against the PR's own base, not assumed):
- `apps/omnihub-site/src/styles/landing.css` — WCAG AA contrast fixes (pre-existing work by another agent, not this pass).
- `apps/apex-arise/tests/**` — coverage/lint fixes for two unused-variable ESLint warnings (pre-existing work by another agent, not this pass).
- `.osv-scanner.toml` — two dev-toolchain CVEs accepted (`GHSA-4c8g-83qw-93j6` fast-uri, `GHSA-xvcm-6775-5m9r` immutable), pre-existing work by another agent.
- `package.json` / `package-lock.json` — `@opentelemetry/*` bumped to `^0.220.0` (resolves `GHSA-45rx-2jwx-cxfr`, propagator-jaeger CVSS 7.5, another agent's commit, verified by this pass via direct OSV API query since the `osv-scanner` binary could not be downloaded in this sandbox); `dompurify` 3.4.11→3.4.12 (this pass — clears `GHSA-c2j3-45gr-mqc4`, published 2026-07-21T19:41Z, *after* the other agent's last push, so neither prior agent could have known about it).
- `.github/workflows/ci-runtime-gates.yml` — this pass, twice: an initial attempt to override `JAVA_HOME` at the job level (ineffective — the `SonarSource/sonarqube-scan-action` re-exports `JAVA_HOME` internally to its bundled Java 17 JRE), superseded by setting `SONAR_SCANNER_JAVA_EXE_PATH` (SonarSource's documented override, read by the scanner bootstrapper directly, ahead of the action's internal `JAVA_HOME` reset). Root cause: SonarQube Cloud stopped supporting Java < 21 as of 2026-07-20, one day before this PR's CI ran — unrelated to this PR's actual diff.

**CI status, last directly queried** (commit `ff9955f`, one commit prior to the current HEAD `777f289`):
| Required check | Conclusion |
|---|---|
| `apex-governance / Governance gate` | success |
| `apex-governance / Dependency vulnerability scan` | success |
| `Security Regression Guard / Dependency Security Audit` | success |
| `CI Runtime Gates / build-and-test` | failure (Sonar/Java 21 issue above) |

Commit `777f289` (the `SONAR_SCANNER_JAVA_EXE_PATH` fix) is pushed; re-verification of `build-and-test` was in progress at the time this file was written. **Update this section — do not assume success — once the check-run result for `777f289` is confirmed.**

## 4. Documentation Sync (2026-07-21)

| File | Change |
|---|---|
| `README.md` | version `1.3.7`→`1.3.8`; `last_audited`→`2026-07-21`; HEAD note → `418c4840` (PR #1644, merged) + PR #1646 (open, not merged) explicitly called out; `.ts` count `233`→`234`; migrations line clarified as `108` forward + `4` rollback = `112`; stale ASCII repository-layout block (previously showing an unrelated older `328`/`102`/`33` snapshot) reconciled to match the Platform Statistics table; canonical state link → `CANONICAL_STATE_2026-07-21.md`. |
| `.understand-anything/CANONICAL_STATE_2026-07-21.md` | **NEW** — this file; catches up the undocumented PR #1644 merge and records PR #1646's live (unmerged) status honestly. |
| `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` | Section 6 amended: PR #1644 added as Merged; PR #1646 added as Open/pending with CI summary. |
| `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` | Facts table updated (HEAD, `.ts` count, migration count clarified); 2026-07-21 sync section added. |
| `memory/omni-recall/start-here.md` | 2026-07-21 session block appended (doc-fidelity catch-up + PR #1646 CI remediation in progress). |
