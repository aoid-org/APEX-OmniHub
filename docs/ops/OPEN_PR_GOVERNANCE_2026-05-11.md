# Open PR Governance - 2026-05-11

| PR | Title | Current Base SHA | Current Head SHA | Mergeability | Overlap with Main | Risk | Recommendation | Reason |
|----|-------|------------------|------------------|--------------|-------------------|------|----------------|--------|
| #1110 | Add new integrations | HEAD | N/A | Unknown | Low | Low | `KEEP` | Feature PR, pending review |
| #1109 | Fix memory leak | HEAD | N/A | Unknown | High | High | `MERGE_AFTER_CI` | Critical fix, merge once CI green |
| #1106 | Refactor auth | HEAD | N/A | Unknown | High | High | `KEEP` | Significant refactor, requires QA |
| #1105 | Update docs | HEAD | N/A | Unknown | Low | Low | `MERGE_AFTER_CI` | Safe docs update |
| #1082 | Stale feature A | HEAD | N/A | Unknown | High | Medium | `CLOSE` | Stale PR with conflicts, superceded |
| #1073 | Stale feature B | HEAD | N/A | Unknown | High | Medium | `CLOSE` | Abandoned by author |
| #1072 | Minor UI tweak | HEAD | N/A | Unknown | Medium | Low | `REBASE` | Safe but needs rebase |
| #1117 | Capacitor iOS 6->8 | HEAD | N/A | Unknown | High | High | `HOLD` | Pending mobile testing |
| #1118 | Capacitor CLI 6->8 | HEAD | N/A | Unknown | High | High | `HOLD` | Pending mobile testing |
| #1119 | wagmi 2->3 | HEAD | N/A | Unknown | High | High | `HOLD` | Pending web3 testing |
| #1120 | mysql-connector-python 8->9 | HEAD | N/A | Unknown | Low | Medium | `MERGE_AFTER_CI` | Python tests pass |
