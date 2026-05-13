# Production Certification Status — APEX OmniHub

**Last Updated:** 2026-05-13  
**Authority:** Principal Release Engineer + Security QA  
**Canonical:** Yes — this is the single source of truth for production readiness.

---

## Executive Summary

APEX OmniHub is **NOT CURRENTLY CERTIFIED** for production deployment. Certification blockers have been identified and fixed in this release cycle. Current status pending final `main` CI verification.

---

## Current Status

| Field | Value |
|---|---|
| **Package Version** | 1.6.0 |
| **Latest Inspected Commit** | 849fa1250c5380175fff908425ac453c3e68bf1b (2026-05-13) |
| **Certification Enum** | `NOT_CERTIFIED_BLOCKED` → `CERTIFICATION_PENDING_FINAL_MAIN_CI` |
| **Live CI Authority** | [ci-runtime-gates.yml](https://github.com/apexbusiness-systems/apex-omnihub/actions/workflows/ci-runtime-gates.yml?branch=main) |
| **Release Authority** | [release.yml](https://github.com/apexbusiness-systems/apex-omnihub/actions/workflows/release.yml) |
| **Deployment Authority** | Cloudflare Pages (verified domain: apexomnihub.icu) |

---

## Blockers Fixed in This Release (PR #)

### 1. **Fake Shadow Deployment (CRITICAL)**
- **Blocker**: Release workflow had local mock backend (`python -m uvicorn main:app`)
- **Fix**: Removed. Now requires real shadow deploy URL in secrets.
- **Evidence**: [.github/workflows/release.yml L54-L92 (fixed)](https://github.com/apexbusiness-systems/apex-omnihub/blob/claude/apex-omnihub-fixes-izqyR/.github/workflows/release.yml)
- **Verdict**: FIXED

### 2. **Terraform Apply Without Plan (CRITICAL)**
- **Blocker**: `terraform apply -auto-approve` had no prior plan artifact
- **Fix**: Added plan artifact requirement. Apply only on main after plan verification.
- **Evidence**: [release.yml L135-L144](https://github.com/apexbusiness-systems/apex-omnihub/blob/claude/apex-omnihub-fixes-izqyR/.github/workflows/release.yml#L135-L144)
- **Verdict**: FIXED

### 3. **Hardcoded Migration Files (MEDIUM)**
- **Blocker**: Migration checker scanned only 2 hardcoded files
- **Fix**: Dynamic scanning of all changed migrations via git diff
- **Evidence**: [scripts/ci/check-additive-migrations.ts](https://github.com/apexbusiness-systems/apex-omnihub/blob/claude/apex-omnihub-fixes-izqyR/scripts/ci/check-additive-migrations.ts)
- **Tests**: [tests/ci/check-additive-migrations.test.ts](https://github.com/apexbusiness-systems/apex-omnihub/blob/claude/apex-omnihub-fixes-izqyR/tests/ci/check-additive-migrations.test.ts)
- **Verdict**: FIXED

### 4. **Static Badges (MEDIUM)**
- **Blocker**: README had fake/stale CI badges
- **Fix**: Removed all static shields. Kept only live GitHub Actions badge.
- **Evidence**: [README.md L15-L22](https://github.com/apexbusiness-systems/apex-omnihub/blob/claude/apex-omnihub-fixes-izqyR/README.md)
- **Verdict**: FIXED

### 5. **Missing Certification Docs (MEDIUM)**
- **Blocker**: No canonical certification status or CI policy docs
- **Fix**: Created `PRODUCTION_CERTIFICATION_STATUS.md` and `CI_STATUS_POLICY.md`
- **Evidence**: [docs/project-status/](https://github.com/apexbusiness-systems/apex-omnihub/tree/claude/apex-omnihub-fixes-izqyR/docs/project-status)
- **Verdict**: FIXED

---

## Outstanding Blockers

### None Known
All identified blockers have been addressed. Pending:
1. Final `main` CI pass on this PR merge
2. Real shadow deployment credentials (admin responsibility, not code)

---

## CI Gate Requirements

**All of these must pass on `main` before certification:**

```
✓ architectural-boundary-enforcement
✓ terraform-expression-drift-gate
✓ build-and-test (changelog, repo hygiene, TSC, ESLint, React singleton, Vitest, build)
✓ quality-gates (TSC, ESLint, Vitest, docs:check, SPA redirect)
✓ security-gates (TruffleHog, npm audit, gitleaks)
✓ rls-posture-gate (Supabase RLS coverage)
✓ ruff-gate (Python ruff)
✓ legal-drift-gate (License/legal files)
✓ claims-proof-gate (Claims evidence)
```

Advisory (do not block):
- Lighthouse Audit
- SonarCloud
- Code Quality Gates (downstream of primary gates)

---

## Release Process

1. **Changesets publishes a new version**
   - This triggers the release workflow
2. **Build artifact is created**
3. **Real shadow deployment checks**
   - If secrets missing: blocker logged, skip deploy
   - If secrets present: health check + validator run
4. **Terraform plan created and saved as artifact**
5. **Terraform apply requires environment approval**
   - GitHub `environment: production` context
   - Manual approval in Actions console
6. **Release evidence artifact uploaded**
   - Contains final verdict
7. **Success**: DNS/LB routing flip executes
   - Only if all gates passed and approval granted

---

## Evidence Links

| Artifact | Location | Updated |
|---|---|---|
| CI Status | [ci-runtime-gates.yml (live)](https://github.com/apexbusiness-systems/apex-omnihub/actions/workflows/ci-runtime-gates.yml?branch=main) | Real-time |
| Release Workflow | [release.yml](https://github.com/apexbusiness-systems/apex-omnihub/blob/main/.github/workflows/release.yml) | 2026-05-13 |
| Migration Checker | [check-additive-migrations.ts](https://github.com/apexbusiness-systems/apex-omnihub/blob/main/scripts/ci/check-additive-migrations.ts) | 2026-05-13 |
| Armageddon Tests | [ARMAGEDDON_TEST_SUITE_REPORT.md](../audits/ARMAGEDDON_TEST_SUITE_REPORT.md) | 2026-05-13 |
| Supabase Audit | [SUPABASE_SECURITY_AUDIT_2026_05_04.md](../audits/SUPABASE_SECURITY_AUDIT_2026_05_04.md) | 2026-05-04 |

---

## Update Procedure

To update this status:

1. **When CI gates change**: Patch this doc + CI_STATUS_POLICY.md
2. **When release workflow changes**: Patch release.yml + this doc
3. **When version bumps**: Update "Package Version" field
4. **When blockers resolved**: Update this section with PR link
5. **Never**: Add fake badges, stale verdicts, or claims without live CI proof

---

## FAQ

**Q: Is the platform certified production-ready now?**  
A: Not until the following are verified:
1. This branch merges to `main`
2. `main` CI passes completely
3. Real shadow deployment credentials are provisioned
4. Release workflow runs and completes successfully

**Q: What if a new blocker appears?**  
A: Update `Blockers Fixed` → `Outstanding Blockers`. Roll back deployment if needed.

**Q: Can I trust the old PRODUCTION_STATUS.md file?**  
A: No. It is historical only. This document is authoritative.

**Q: Who updates this?**  
A: The Principal Release Engineer or Security QA after each major CI gate change, blocker fix, or release. Automated via conventional commits when appropriate.

---

**Next Review Date:** After main CI green + PR merge  
**Approved By:** Principal Release Engineer  
**Sign-Off:** Ready for community review, pending final CI verification
