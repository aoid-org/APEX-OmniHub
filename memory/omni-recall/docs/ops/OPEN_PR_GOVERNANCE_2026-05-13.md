---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Open PR Governance & Triage — 2026-05-13

**Date:** 2026-05-13  
**Authority:** Principal Release Engineer  
**Purpose:** Audit all open PRs for safety, risk, and merge readiness  
**Policy:** No merging without explicit safety confirmation + CI green

---

## Summary

This document provides a live inventory of open PRs on `main` and their merge safety status. It is updated whenever a new PR is opened or a blocker emerges.

---

## Merge Decision Matrix

| Condition | Recommendation |
|---|---|
| `CI green` + `≥1 approval` + `no blockers` | SAFE TO MERGE |
| `CI red` + `known transient failure` | HOLD (retry CI, then decide) |
| `CI red` + `code defect` | DO NOT MERGE (fix blocker first) |
| `Changes main release workflow` + `no PR test run` | REQUIRE TEST RUN (staging or shadow) |
| `Changes Terraform` + `no plan artifact` | DO NOT MERGE (requires plan review) |
| `Adds dependency` + `no security audit` | HOLD (run security gate locally) |
| `Removes static content/docs` + `stale links exist` | HOLD (verify no broken refs) |

---

## Current Open PRs

*This section is a template. Replace with actual PR data.*

### PR #1125 (Superseded — Closed)
| Field | Value |
|---|---|
| **Title** | fix(release): incomplete production certification blocker fixes |
| **Author** | claude-code |
| **Base** | main |
| **Status** | CLOSED — Superseded by new PR #[NEXT] |
| **Blockers** | Incomplete migration checker, fake shadow deploy still present |
| **Action** | Closed; work continued in claude/apex-omnihub-fixes-izqyR |

### PR #[NEW] (Current Branch)
| Field | Value |
|---|---|
| **Title** | fix(release): complete remaining production certification blockers |
| **Author** | claude-code |
| **Base** | main |
| **Head** | claude/apex-omnihub-fixes-izqyR |
| **Status** | PENDING CI & REVIEW |
| **Changes** | Release workflow fix, dynamic migration checker, certification docs |
| **CI Status** | Awaiting first run post-commit |
| **Blockers** | None known (awaiting CI) |
| **Recommendation** | MERGE after CI green + 1 approval |
| **Action** | Wait for CI, then request review |

---

## Policy: PR Merge Gates

**No PR shall merge to `main` unless:**

1. ✅ **CI passes completely**
   - All required gates in `.github/workflows/` must be green
   - No skipped or exempt checks
   
2. ✅ **≥1 approving review**
   - From someone who understands the change
   - Auto-approval (e.g., Dependabot) counts for minor/patch only
   
3. ✅ **No unresolved blockers**
   - All conversations resolved or explicit override
   - If overriding a concern, document why in PR body
   
4. ✅ **Branch up to date with main**
   - No stale merge commits
   - Rebase or merge-commit as appropriate
   
5. ✅ **Signed commits** (enforced on `main`)
   - GitHub requires signed commits
   - Configure GPG key if not already done

---

## PR Review Checklist (For Reviewers)

- [ ] Does the PR title follow `<type>(<scope>): <desc>` format?
- [ ] Is the description clear on *why* this change?
- [ ] Does this break any architectural invariants (see CLAUDE.md §5)?
- [ ] Are there new dependencies? (verify security audit passed)
- [ ] Does this change CI/release workflows? (require test run before merge)
- [ ] Do any links/docs reference the right files? (run `bun run docs:check`)
- [ ] Are there any TODOs left in the code?
- [ ] Would this change require new tests? (check test coverage)

---

## Recent Closed PRs (For Context)

*Template for closed PRs that affected main.*

| PR | Title | Merged | Key Changes |
|---|---|---|---|
| #1141 | fix(rsi): professionalize governance docs and remove `any` from integration-harness | 2026-05-13 | Docs refactor, type fix |
| #1125 | fix(release): incomplete blockers | 2026-05-13 | Superseded (incomplete) |

---

## FAQ

**Q: A Dependabot PR is waiting. Can it auto-merge?**  
A: Minor/patch: Yes (auto-merge enabled). Major: No (requires manual approval + this doc update).

**Q: The CI is slow. Can I merge with CI still running?**  
A: No. Wait for complete CI pass or explicitly approve failure if known transient (rare).

**Q: I need to merge this PR today. CI is blocking. What do I do?**  
A: File an issue documenting the blocker, request override from Release Engineer with reasoning. Do not force-merge without approval.

**Q: This PR changes Terraform. Is it safe to merge?**  
A: Only if `terraform plan` artifact is reviewed and approved. Never `terraform apply -auto-approve`.

---

## Standing Instructions

1. **Weekly Review**: Every Monday, audit open PRs and update this doc
2. **Auto-Merge Policy**: Dependabot minor/patch only (configured in .dependabot/)
3. **Major Versions**: Require DEPENDABOT_MAJOR_UPGRADE_REVIEW.md approval
4. **Release Blocking**: Any red CI on main blocks release until fixed
5. **Cleanup**: Close PRs that stale (>30 days without activity) with notification

---

**Last Updated:** 2026-05-13  
**Next Review:** 2026-05-20 (or when new major PR arrives)  
**Maintained By:** Principal Release Engineer
