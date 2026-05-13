# Dependabot Major Upgrade Review — 2026-05-13

**Date:** 2026-05-13  
**Scope:** Open Dependabot pull requests with major version bumps  
**Authority:** Security QA + Release Engineering  
**Status:** Pending human review and approval

---

## Summary

This document audits all open Dependabot PRs with major version bumps. Human approval is required before merging major dependency changes. No automatic merge for majors.

---

## Major Dependency PRs Under Review

### 1. Capacitor iOS 6 → 8 (Proposed)
| Field | Value |
|---|---|
| **Library** | @capacitor/ios |
| **Current** | 6.x |
| **Proposed** | 8.x |
| **PR Number** | (Pending — check dependabot dashboard) |
| **Risk Level** | HIGH |
| **Breaking Changes** | Yes — major plugin API changes |
| **iOS Minimum** | 14 → 15+ |
| **Our Usage** | Mobile wrapper (secondary to web) |
| **Recommendation** | **HOLD** until test results on staging |
| **Action** | Assign to mobile team, require `bun run test:e2e` on device |

### 2. Capacitor CLI 6 → 8 (Proposed)
| Field | Value |
|---|---|
| **Library** | @capacitor/cli |
| **Current** | 6.x |
| **Proposed** | 8.x |
| **PR Number** | (Pending — check dependabot dashboard) |
| **Risk Level** | HIGH |
| **Breaking Changes** | Yes — native build toolchain |
| **Our Usage** | Build/device bridge |
| **Recommendation** | **HOLD** until iOS 6→8 settled |
| **Action** | Coordinate with iOS PR |

### 3. wagmi 2 → 3 (Proposed)
| Field | Value |
|---|---|
| **Library** | wagmi |
| **Current** | 2.x |
| **Proposed** | 3.x |
| **PR Number** | (Pending — check dependabot dashboard) |
| **Risk Level** | MEDIUM |
| **Breaking Changes** | Yes — React 19 API, viem upgrade |
| **Our Usage** | Web3 wallet integration (OmniPort layer) |
| **Recommendation** | **MERGE** after security audit + test pass |
| **Action** | Run full test suite, verify OmniPort connector tests |

### 4. mysql-connector-python 8 → 9 (Proposed)
| Field | Value |
|---|---|
| **Library** | mysql-connector-python |
| **Current** | 8.x |
| **Proposed** | 9.x |
| **PR Number** | (Pending — check dependabot dashboard) |
| **Risk Level** | MEDIUM |
| **Breaking Changes** | Yes — connection pooling API |
| **Our Usage** | Orchestrator's legacy DB bridge (rarely used) |
| **Recommendation** | **HOLD** pending code review |
| **Action** | Review breaking changes; required if actively maintained |

---

## Review Checklist for Each Major PR

When a major Dependabot PR arrives:

- [ ] Security advisory summary (any CVEs fixed?)
- [ ] Breaking changes documented by upstream?
- [ ] Do we actively use the affected API surface?
- [ ] Can we test on staging without blocking main?
- [ ] Are there downstream projects affected?
- [ ] Has the dependency been released for ≥3 months (stability)?
- [ ] Do we have capacity to fix integration issues?

If all boxes checked → **SAFE TO MERGE**  
If any box unchecked → **REQUIRE HUMAN APPROVAL + TEST RESULTS**

---

## Policy

- **Minor/patch updates**: Automatic merge (Dependabot enabled in .dependabot/config.yml)
- **Major updates**: Manual review, human approval required
- **Critical security**: Fast-track review (≤24h target)
- **Staging-only tests**: Allowed to merge if main CI would fail
- **No forced merges**: If CI red, hold the PR open for human decision

---

## Next Steps

1. Check GitHub Dependabot alerts: [Settings → Code security](https://github.com/apexbusiness-systems/apex-omnihub/security/dependabot)
2. For each major PR:
   - Verify it's not already merged
   - Document findings in this doc
   - Assign to owner team
   - Wait for CI + manual approval

---

**Last Verified:** 2026-05-13  
**Next Review:** Weekly or when new major Dependabot PRs arrive
