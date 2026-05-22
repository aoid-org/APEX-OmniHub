# Merge Access Checklist

Version: 1.1.0
Engineer: <Name>
Buddy / Reviewer: <Name>
Manager: <Name>
Start date: <YYYY-MM-DD>
Target merge-access date: <YYYY-MM-DD>

A new engineer becomes a merge-rights candidate only after completing this checklist with a Buddy reviewer signing off each section.

---

## Time-Bound Milestones

| Window | Deliverable | Owner |
|---|---|---|
| Day 1 | Read `APEX_BUILD_DOCTRINE.md` end-to-end | engineer |
| Day 1 | Buddy assigned + first 1:1 scheduled | manager |
| Day 1–3 | Required reading complete (see § Required Reading below) | engineer |
| Day 3–5 | First small change shipped through CI gates (typo / test / doc) | engineer + buddy |
| Day 5–10 | Author or co-author one RFC using `RFC_TEMPLATE.md` | engineer + buddy |
| Day 7–14 | Participate as observer in one architecture review | engineer |
| Day 10–20 | Complete the **Architecture Review Exercise** (scored, below) | engineer |
| Day 14–25 | Complete the **Rollback & Observability Exercise** (scored, below) | engineer |
| Day 25–30 | Merge-rights decision meeting | manager + architecture reviewer |

A milestone slipping by > 5 business days triggers a buddy + manager check-in. The window is supportive, not punitive — it exists so the engineer never feels stuck silently.

---

## Required Reading

- [ ] `governance/doctrine/APEX_BUILD_DOCTRINE.md`
- [ ] `governance/rfc/RFC_USAGE_POLICY.md`
- [ ] `governance/architecture/ARCHITECTURE_REVIEW_GATES.md`
- [ ] `governance/architecture/MERGE_RIGHTS_POLICY.md`
- [ ] `governance/ci/CI_POLICY_GATES.md`
- [ ] `governance/ai/AI_AGENT_SYSTEM_PROMPT.md`
- [ ] `governance/observability/SLO_POLICY.md`
- [ ] `governance/release/RELEASE_POLICY.md`
- [ ] `governance/data/DATA_CLASSIFICATION.md`
- [ ] `governance/security/SECURITY_BASELINE.md`

---

## Doctrine Comprehension

The engineer must explain each, verbally, to the buddy in their own words. Buddy marks each only after a clean explanation.

- [ ] workflows-over-features
- [ ] no-god-object rule
- [ ] domain boundaries
- [ ] data classification tiers (P0–P4)
- [ ] service tiers (T1–T4) and what they imply
- [ ] error budgets and burn rate

---

## Architecture Review Exercise (Scored)

Buddy provides a real or synthetic RFC and PR. Engineer reviews them and produces a written architecture review using `ARCHITECTURE_REVIEW_TEMPLATE.md`.

| Criterion | Pts | Pass threshold |
|---|---:|---|
| Identified at least one hidden coupling risk | 15 | ≥ 1 cited with file/line evidence |
| Identified at least one missing or weak rollback path | 15 | ≥ 1 cited with concrete remediation |
| Identified at least one missing or weak observability path | 15 | ≥ 1 cited with metric/log/trace recommendation |
| Identified at least one god-object risk OR confirmed absence with reasoning | 10 | reasoning visible |
| Identified scope-creep risk OR confirmed scope clarity with reasoning | 10 | reasoning visible |
| Identified domain-boundary issue OR confirmed boundary integrity with reasoning | 10 | reasoning visible |
| Identified at least one AI-governance issue (if AI involved) OR confirmed compliance | 10 | reasoning visible |
| Recommendation is actionable (specific changes, not vague) | 15 | buddy judgment |
| **Pass threshold** | **/100** | **≥ 85** |

A score of 70–84 = redo with feedback. < 70 = additional reading + redo with a different exercise.

---

## Rollback & Observability Exercise (Scored)

Engineer picks a real service in the codebase. Produces a one-page document containing:

| Criterion | Pts |
|---|---:|
| Tier classification (T1–T4) with justification | 10 |
| One concrete rollback command (executable, not "redeploy previous version") | 20 |
| Verification step proving the rollback worked (specific dashboard/log query) | 15 |
| Three failure modes the service could exhibit | 15 |
| At least one runbook entry written using `RUNBOOK_TEMPLATE.md` | 20 |
| Three required metrics from `SLO_POLICY.md` naming convention | 10 |
| One log retention class and one trace sampling decision | 10 |
| **Pass threshold** | **≥ 80 / 100** |

---

## CI / CD Comfort

- [ ] Understands required CI gates
- [ ] Knows how to read a failed `apex-policy` JSON report
- [ ] Knows how to respond when secret scanner fires
- [ ] Knows how to update branch protection requirements
- [ ] Knows how to roll back a merged PR via revert PR

---

## Production Safety

- [ ] Can define a rollback path for a real change
- [ ] Can define failure modes
- [ ] Can define audit trail
- [ ] Can define owner / escalation path
- [ ] Knows when an RFC is required vs not

---

## AI Tooling Discipline

- [ ] Reviews AI-generated code with same rigor as human-authored
- [ ] Verifies AI-suggested file paths / column names exist
- [ ] Refuses to merge AI output that bypasses doctrine
- [ ] Knows where the kill switch is for AI features in their domain

---

## Final Approval

Architecture Review Exercise score: ___ / 100
Rollback & Observability Exercise score: ___ / 100
Total: ___ / 200 (must be ≥ 165)

Merge rights approved: Yes | No
Architecture Reviewer: <Name / Date>
Manager: <Name / Date>
Engineer acknowledgement: <Name / Date>
