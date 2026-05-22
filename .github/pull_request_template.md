## Summary
<!-- One sentence: what does this PR do and why? -->

## Type of Change
- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — no functional change
- [ ] `ci` — CI/CD change
- [ ] `docs` — documentation only
- [ ] `chore` — maintenance

## Pre-Submit Checklist

### Required (automated gates will catch these — fix before requesting review)
- [ ] `bun run typecheck` — zero errors
- [ ] `bun run lint` — zero warnings
- [ ] `bun run test` — all pass
- [ ] `bun run build` — clean build

### Manual verification
- [ ] No secrets, credentials, or PII in code or commit history
- [ ] New SQL migrations are idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- [ ] New SQL tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] New React components have error boundary coverage (or N/A noted below)
- [ ] CHANGELOG.md updated if this is a user-visible change

### Security
- [ ] No `@ts-ignore` or `@ts-expect-error` added without inline justification
- [ ] No `any` types added without justification
- [ ] No direct SQL string concatenation (use parameterized queries)
- [ ] No new dependencies added without security review (check `npm audit`)

## Testing
<!-- What did you test? How? Include test file names if new tests were added. -->

## Screenshots / Evidence
<!-- UI changes: before/after screenshots. API changes: curl examples. -->

## Notes for Reviewer
<!-- Anything they should pay special attention to, or known limitations. -->

---
*Submitting this PR confirms you have read and followed the [APEX Engineering Standards](../docs/onboarding/DEVELOPER_ONBOARDING.md).*

---

## APEX Build Governance

# PR Checklist

## User / Workflow

- [ ] Exact user identified
- [ ] Workflow improved
- [ ] Pain removed or reduced
- [ ] Success metric defined

## Scope

- [ ] IN SCOPE defined
- [ ] OUT OF SCOPE defined
- [ ] No unapproved scope expansion

## Architecture

- [ ] No god object introduced
- [ ] Domain boundaries preserved
- [ ] No cross-domain database writes
- [ ] Contracts documented
- [ ] Ownership clear
- [ ] Failure modes documented

## Production Safety

- [ ] Rollback path defined
- [ ] Observability added or preserved
- [ ] Security impact reviewed
- [ ] Performance impact reviewed
- [ ] Regression risk addressed
- [ ] Overload risk addressed

## Governance

RFC required: Yes | No
RFC link: <link>
Architecture review required: Yes | No
Architecture review link: <link>

## AI Usage

AI assisted: Yes | No
If yes:
- [ ] AI output reviewed by human
- [ ] No uncontrolled autonomous behavior introduced
- [ ] AI-generated changes preserve doctrine
