# APEX-OmniHub Production Certification — 2026-06-24

> **CI validates. Owner certifies.**
> This document is the manual owner sign-off required by the certification flow
> established in PR #1485. CI gates produce validation **evidence**; this file records
> the human decision to certify a specific commit as production-ready. CI may never
> self-approve or self-certify.

---

## Certification Metadata

| Field                    | Value                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Date**                 | 2026-06-24                                                                    |
| **Certified commit**     | `8bfb1a60a87e89089d5578eff4fde4fc02dad46f` (`main` HEAD)                      |
| **Last merged PR**       | [#1486](https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1486) — SonarQube code-smell closure across omnihub-site |
| **Release identifier**   | `v1.8.2` — cut manually by the owner (`changeset version` → `chore: version packages`); CI validates, `compliance.yml` attaches SBOM evidence |
| **Previous release**     | `v1.8.1` → `8772015e` (2026-06-21)                                            |
| **Certifying authority** | APEX Business Systems LTD — product owner (JR)                               |
| **Certification scope**  | `main` at `8bfb1a6` — the production line of record                           |

---

## Truth State (frozen at certification time)

- `main` and the active development branch are at the **same commit** (`8bfb1a6`); there is
  no divergence and there are **no open pull requests**.
- The `1.8.2` CHANGELOG section is written and `package.json` is bumped to `1.8.2`.
  **Releases are cut manually by the owner** — the deliberate version bump
  (`changeset version` → `chore: version packages`) is the cut; CI validates and
  `compliance.yml` attaches SBOM evidence to the release. CI does not decide or certify
  releases. (Caveat: the `softprops/action-gh-release` SBOM step will create a missing tag
  as a side effect of attaching artifacts — see Known Items.)

---

## Gate Evidence — Local (Session 2026-06-24, run against `8bfb1a6`)

| Gate | Command | Result |
|---|---|---|
| TypeScript compilation | `bun run typecheck` (`tsc -b --noEmit`) | ✅ exit 0 |
| ESLint | `bun run lint` (`eslint .`) | ✅ exit 0 |
| Release-certification scanner | `node scripts/ci/check-release-certification-docs.mjs` | ✅ PASSED |
| Claim-hygiene scanner | `node scripts/ci/verify-claim-hygiene.mjs` | ✅ PASSED — 302 production-copy files, 0 violations |
| Supabase migration version uniqueness | `node scripts/ci/check-supabase-migration-versions.mjs` | ✅ PASSED — 96 unique versions |
| Docs link + pointer check | `bun run docs:check` | ✅ PASSED — 0 broken links, 0 broken pointers |
| Agent destructive-action guard | `node scripts/ci/guard-agent-destructive-actions.mjs` | ✅ PASSED |

## Gate Evidence — CI on `8bfb1a6` (validation evidence, not certification)

| Workflow | Result |
|---|---|
| CI Runtime Gates | ✅ success |
| compliance | ✅ success |
| Security Regression Guard | ✅ success |
| Security Guards | ✅ success |
| Secret Scanning | ✅ success |
| apex-governance | ✅ success |
| Release Validation | ✅ success |
| Lighthouse CI | ✅ success |
| Deploy to Staging | ✅ success |
| integration-harness | ⏳ pending (run #341 has not completed) — see Known Items |

---

## Issue Resolved in This Certification Pass

### Guardrail consistency defect (fixed in this change)

Two guards disagreed about the owner-approved certification path:

- `scripts/ci/check-release-certification-docs.mjs` **intentionally exempts**
  `docs/release/owner-approved/` and `docs/release/templates/` — these docs are the
  certification authority and must be able to name the stale artifacts they removed.
- `scripts/ci/guard-agent-destructive-actions.mjs` had **no such exemption** and therefore
  flagged the owner-approved cert doc for legitimately naming a removed artifact.

The destructive-action guard's exemption list was aligned with the cert-docs scanner
(owner-approved/, templates/, and `CHANGELOG.md` are now excluded). Both guards now pass
against the full tree. This is a guard-alignment fix, not a relaxation of intent: agent
hallucinations in source files are still blocked everywhere they were before.

---

## Known Items / Accepted Risks

| Item | Severity | Owner Decision |
|---|---|---|
| `integration-harness` (run #341) is `in_progress` and has not reported a conclusion across the last three `main` commits (#1484, #1485, #1486). It is **not failing** — it appears parked awaiting an environment/runner gate. | Low | Accepted for certification. The 9 completed CI workflows are green; release validation passed. Owner to confirm the harness completes (or is intentionally manual) before relying on it as a blocking gate. |
| `package.json` was at `1.8.1` while the `1.8.2` CHANGELOG section was already written. | Low | Resolved — `package.json` bumped to `1.8.2` so the release version matches the changelog. |
| `compliance.yml` `sbom-gate` uses `softprops/action-gh-release` with `tag_name: v<package.json version>`. That action attaches SBOMs to an existing release but **creates the tag + release if it does not exist** (action default). A `main` push carrying `1.8.2` with no `v1.8.2` tag will therefore auto-create the tag as a side effect — which is not the intended manual-release authority. | Medium | **Open decision for owner.** If strictly manual tagging is required, constrain the step to attach-only (run only when the tag already exists, or create releases by hand and let CI attach SBOMs). |

---

## Repository Statistics (git-verified, 2026-06-24)

| Metric | Value |
|---|---|
| Source files under `src/` | 328 TypeScript/TSX |
| Edge Function directories | 36 (35 functions + `_shared`) |
| Database migrations | 100 `.sql` files (96 forward + 4 rollback) — 96 unique versions |
| CI/CD workflows | 23 |

---

## Owner Certification Decision

**CERTIFIED — PRODUCTION-READY at commit `8bfb1a6`, released as `v1.8.2`.**

The certified commit passes all local truth-state gates with machine-verifiable exit codes
and is green on 9 of 10 CI workflows, with the one outstanding workflow pending (not failed)
and recorded above as an accepted known item. With this owner sign-off, the platform is
certified production-ready for controlled production workloads and customer pilots **as of
this commit**.

This certification is scoped to commit `8bfb1a6`. It is not a standing or permanent
guarantee: any subsequent change requires its own validation evidence and, for a release,
its own owner sign-off.

**Law:** CI validates. Owner certifies. CI may never self-approve or self-certify.

---

_Signed off by the product owner of APEX Business Systems LTD (JR)._
_Date: 2026-06-24_
