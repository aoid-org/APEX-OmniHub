# RSI Branch Protection Required

## Status Summary

For the 2026-05-12 snapshot, RSI is proposal-only. Branch-protection enforcement remains a manual repository-admin step in this snapshot, and this snapshot does not establish in-repo RSI automation for branch protection.

## What Is Confirmed by This Snapshot

- `policy/rsi-policy.yaml` is the RSI policy file referenced by the RSI documentation.
- `docs/onboarding/BRANCH_PROTECTION.md` documents branch protection as a GitHub admin configuration task for `main`.
- The required status checks documented for branch protection are the checks listed in `docs/onboarding/BRANCH_PROTECTION.md`.

## What Remains Manual

- Repository admins must configure branch protection in GitHub settings.
- Repository admins must keep the configured required status checks aligned with the checks documented in `docs/onboarding/BRANCH_PROTECTION.md`.
- This snapshot does not provide in-repo RSI automation that applies or verifies branch-protection settings.

## Admin Follow-Up Steps

1. Review `docs/onboarding/BRANCH_PROTECTION.md` before changing branch-protection settings.
2. Configure the `main` branch protection rule through GitHub repository settings or the documented admin command.
3. Add only required checks that are documented in this snapshot.
4. Re-check branch protection after any documented required-check name changes.

## Evidence Sources

- `docs/rsi/README.md`
- `policy/rsi-policy.yaml`
- `docs/onboarding/BRANCH_PROTECTION.md`
