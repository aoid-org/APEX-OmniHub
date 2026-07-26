---
version: 1.0.0
last_audited: 2026-07-21
status: verified
---

# Correction 005: Fabricated dependency-audit claim in APEX_AGENT_OPERATIONS.md §9.13

Date: 2026-07-21
Scope: `docs/APEX_AGENT_OPERATIONS.md`

## What was wrong

Commit `4db5a5e` ("fix(ci): update APEX_AGENT_OPERATIONS.md for ops-doc guard & configure osv-scanner exemptions") added a section claiming:

> "Updated production dependencies via `npm audit fix --omit=dev` to resolve vulnerabilities in `axios`, `brace-expansion`, `hono`, and `protobufjs`."

**This never happened.** `4db5a5e` itself made zero changes to `package-lock.json` (`git show --stat 4db5a5e` shows only `docs/APEX_AGENT_OPERATIONS.md`, 11 lines). No commit on the `apex/sonarqube-contrast-arise-100-coverage-20260721-125730` branch (merged as PR #1646, commit `48e8b7e`) touched `axios`, `hono`, or `protobufjs` in `package-lock.json` — the only production-dependency lockfile changes across the entire PR were an `@opentelemetry/*` bump (a different commit, `7455c634`) and a `dompurify` patch (`54893c7`). The claimed section also had a structural defect: it was inserted as a `###` sub-heading numbered "9.13" directly ahead of the existing `### 9.12.2` subsection, colliding with an unrelated pre-existing `## 9.13 Audit readiness closure — 2026-06-23 (PR #1483)` heading further down the same file.

## Root cause

An agent (not identifiable from git metadata beyond the commit author string `APEX Engineer <engineering@apexbusinesssystems.com>`) wrote a documentation entry describing intended or template dependency-remediation work without verifying it against the actual lockfile diff, then committed it directly to a shared feature branch. It sat unnoticed through several subsequent commits and CI runs (docs prose isn't covered by `docs:check`'s link/pointer validation, only broken links/pointers) and was squash-merged into `main` as part of PR #1646 before being caught.

## Corrected state

The fabricated `### 9.13 Production dependency security audit updates — 2026-07-21 (PR #1646)` section has been removed from `docs/APEX_AGENT_OPERATIONS.md` (follow-up commit after PR #1646 merged). No corresponding functional change existed to document in its place — `axios`/`hono`/`protobufjs` were never modified by this PR.

## Prevention note

`docs:check` (`check_docs_links.mjs` + `check_doc_code_pointers.mjs`) validates links and file pointers, not the truthfulness of prose claims. There is no automated gate that catches a documentation entry describing a code change that didn't happen. Any agent adding an "audit"/"remediation" section to `APEX_AGENT_OPERATIONS.md` should diff the claim against `git show <commit> --stat` before committing, per the omni-recall doctrine: "do not mix uploaded audit claims with independently verified operational truth."
