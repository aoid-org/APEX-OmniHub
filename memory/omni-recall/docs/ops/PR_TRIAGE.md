---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

> **Current-state note (2026-07-04):** Current branch/head facts defer to `../CURRENT_PLATFORM_STATE_2026_07_04.md`; open PR status requires live GitHub verification and is not certified by this historical triage table alone.


# Open PR Triage — APEX-OmniHub v1.6.0

**Generated:** 2026-05-08
**Open PRs at time of audit:** Requires `gh pr list --state open` with GitHub authentication to verify current live count. The 2026-05-08 audit references 15 open PRs.

## Triage Protocol

Each open PR falls into one of four categories:

| Category | Definition | Action |
|----------|------------|--------|
| 🟢 MERGE | Gates pass, no conflicts, aligns with v1.6.0 | Merge immediately |
| 🟡 REVIEW | Valid work but needs conflict resolution or gate fix | One-session fix |
| 🔵 DEFER | Valid work but scoped to v1.7.0+ | Close and reopen with milestone |
| 🔴 CLOSE | Superseded, duplicate, or abandoned | Close with explanation |

## Triage Checklist (Complete per PR)

For each open PR, apply this checklist:

- [ ] Does `npm run typecheck` pass with this PR's changes?
- [ ] Does `npm run lint` pass?
- [ ] Does `npm test -- --run` pass (baseline: 2,399 pass / 85 skip)?
- [ ] Does `npm run build` pass?
- [ ] Is this PR authored by a human, Claude, Jules, or Codex?
- [ ] Does it conflict with any changes introduced in v1.6.0 hardening?
- [ ] Is it scoped to the current sprint or a future milestone?

## Action Items

1. **Owner (JR):** Run `gh pr list --state open` with an authenticated GitHub CLI session and classify each PR against the triage matrix above.
2. **Merge all 🟢 PRs** before tagging v1.6.0.
3. **Fix and merge all 🟡 PRs** within 5 business days.
4. **Close 🔵 PRs** with comment: `Deferred to v1.7.0 milestone. Re-open there.`
5. **Close 🔴 PRs** with comment: `Superseded by [commit/PR reference].`

## Target State

After triage: 0 open PRs older than 7 days. Merge queue clear before v1.6.0 tag.

---

*This document requires human review to populate PR-specific details.*
*The triage matrix and checklist above are ready to apply.*
