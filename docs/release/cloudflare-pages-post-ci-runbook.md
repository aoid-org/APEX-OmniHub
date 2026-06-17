# Cloudflare Pages Post-CI Runbook

Version: 1.0.0  
Date: 2026-06-17

## Scope

This runbook covers Cloudflare Pages deploy failures that occur after repository CI/release checks have produced a valid `dist/` artifact for APEX-OmniHub.

## Observed Incident

Observed commit SHA: `0b9cedbadd4a78c1e0d2ffa78236a7fefaf6477d`

Observed Cloudflare log:

```text
No Wrangler configuration file found. Continuing.
Failed: an internal error occurred.
```

## Repository Contract

- No root `wrangler.toml` is expected or allowed for this monorepo.
- The canonical repository build command is `bun run build`.
- The expected output directory is `dist`.
- A valid build must produce `dist/index.html`.
- The local contract guard is `bun run verify:cloudflare-pages-contract` after `bun run build`.

## Expected Cloudflare Pages Settings

- Root directory: repository root unless Cloudflare project documentation is updated to state otherwise.
- Build command: `bun run build`.
- Output directory: `dist`.
- Wrangler configuration: no root `wrangler.toml`; Cloudflare may continue without one.

## Operator Retry Procedure

1. Confirm the latest release commit passed repository release verification.
2. Confirm `bun run build` and `bun run verify:cloudflare-pages-contract` pass for the same commit.
3. Retry the Cloudflare Pages deployment from the dashboard or deployment workflow.
4. If the same `Failed: an internal error occurred.` message repeats after a valid artifact is available, treat the remaining failure as provider-side.

## Escalation

Escalate to Cloudflare support with:

- Project name.
- Deployment ID.
- Commit SHA `0b9cedbadd4a78c1e0d2ffa78236a7fefaf6477d` or the current failing SHA.
- The exact log lines shown above.
- Confirmation that `dist/index.html` exists and no root `wrangler.toml` is expected.

Repository gates must not be weakened, skipped, or bypassed to work around Cloudflare provider-internal errors.
