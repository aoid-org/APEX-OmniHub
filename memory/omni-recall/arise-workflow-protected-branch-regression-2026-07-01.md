# A.R.I.S.E. Workflow Protected-Branch Regression Shield — 2026-07-01

## Trigger

The `Publish dated snapshot` GitHub Actions job failed with `GH013` because a snapshot publication path attempted to push a generated commit directly to protected `main`. GitHub correctly rejected the write because repository rules require changes to land through pull requests and required checks.

## Root cause

The unsafe failure mode is any A.R.I.S.E. snapshot publisher that commits generated `CURRENT_ARISE_*` documents and runs a direct push to `main`/`master` (or to the current protected ref). Protected branches must remain authoritative and must not be bypassed by automation.

## Remediation

The live workflow now publishes generated snapshots by:

1. downloading scan artifacts into `memory/omni-recall/docs`,
2. creating a unique `automation/arise-snapshot-${{ github.run_id }}-${{ github.run_attempt }}` branch,
3. pushing only `HEAD:$branch`, and
4. opening a pull request back to the protected base branch with `gh pr create`.

A regression test now reads `.github/workflows/arise.yml` and verifies the workflow keeps PR publishing semantics while rejecting direct `git push origin main`, `git push origin master`, or push-to-current-ref patterns.

## Validation

- `cd apps/apex-arise && bun run test tests/workflows/arise-workflow.test.ts` — passed.

## Rollback

If this workflow needs rollback, do not restore direct protected-branch pushes. Prefer disabling the publish job or keeping artifact upload only until a compliant PR-based publisher is repaired.
