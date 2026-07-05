# A.R.I.S.E. Workflow Protected-Branch Regression Shield — 2026-07-01

## Trigger

The `Publish dated snapshot` GitHub Actions job failed with `GH013` because a snapshot publication path attempted to push a generated commit directly to protected `main`. GitHub correctly rejected the write because repository rules require changes to land through pull requests and required checks.

## Root cause

The unsafe failure mode is any A.R.I.S.E. snapshot publisher that commits generated `CURRENT_ARISE_*` documents and runs a direct push to `main`/`master` (or to the current protected ref). Protected branches must remain authoritative and must not be bypassed by automation.

## Remediation

The live workflow now publishes generated snapshots by:

1. downloading scan artifacts into `memory/omni-recall/docs`,
2. updating the single rolling `automation/arise-snapshot-current` branch,
3. fail-closing unless the target is exactly `automation/arise-snapshot-current`,
4. pushing only `HEAD:refs/heads/$branch`,
5. searching for an existing open snapshot PR from that branch before creating one, and
6. opening a pull request back to the protected base branch with `gh pr create` only when no matching open PR exists.

A regression test now reads `.github/workflows/arise.yml` and verifies the workflow keeps rolling-PR publishing semantics, dedupes existing open snapshot PRs, avoids `[skip ci]`, and rejects direct `git push origin main`, `git push origin master`, or push-to-current-ref patterns.

## Validation

- `cd apps/apex-arise && bun run test tests/workflows/arise-workflow.test.ts` — passed.

## Rollback

If this workflow needs rollback, do not restore direct protected-branch pushes. Prefer disabling the publish job or keeping artifact upload only until a compliant PR-based publisher is repaired.

## Ops-doc drift guard follow-up

The repository's `ops-doc-guard` treats `.github/workflows/**` as critical-path operational source-of-truth. Because `.github/workflows/arise.yml` changed, `docs/APEX_AGENT_OPERATIONS.md` must be updated in the same PR. The operations doc now records the protected-branch-safe A.R.I.S.E. publisher contract: scan and diagnosis jobs upload artifacts with read-only permissions, while `publish-snapshot` uses `contents: write` plus `pull-requests: write` only to update the single rolling automation branch, dedupe the existing open PR, and avoid writing directly to `main`/`master`.

## Fail-closed hardening follow-up

The publisher now validates the computed target before checkout/push. It refuses `main`, `master`, `refs/heads/main`, `refs/heads/master`, `origin/main`, `origin/master`, and any target other than `automation/arise-snapshot-current`; the push destination is fully qualified as `HEAD:refs/heads/$branch` so the job cannot degrade into `HEAD -> main` publication.
