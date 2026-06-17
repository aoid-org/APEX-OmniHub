# Cloudflare Pages Post-CI Internal Error Runbook

## Observed incident

- Commit cloned by Cloudflare Pages: `0b9cedbadd4a78c1e0d2ffa78236a7fefaf6477d`.
- Cloudflare Pages log sequence: `No Wrangler configuration file found. Continuing.` followed by `Failed: an internal error occurred.`

## Repo-side deployment contract

The production Pages deployment is intentionally governed by CI and Cloudflare dashboard settings, not by a monorepo-root `wrangler.toml`.

- Root directory: repository root.
- Build command: `bun run build`.
- Build output directory: `dist`.
- Root `wrangler.toml`: must be absent.
- Pre-deploy verification: run `bun run build && bun run verify:cloudflare-pages-contract`.

The verifier fails closed if `dist/index.html` is missing, if a root `wrangler.toml` appears, or if the governed GitHub Actions deployment contract drifts.

## Operator checklist

1. Confirm the latest repo-side gates passed, especially `bun run build`, `bun run verify:build`, and `bun run verify:cloudflare-pages-contract`.
2. In Cloudflare Dashboard, open Pages → the production project → Settings → Build & deployments and confirm:
   - root directory is the repository root;
   - build command is `bun run build`;
   - output directory is `dist`;
   - no root Wrangler configuration is expected.
3. Retry the failed deployment from Pages → Deployments → Retry deployment.
4. If the retry fails with the same `Failed: an internal error occurred.` message after the repo contract verifier passes, treat it as Cloudflare provider/internal. Escalate to Cloudflare Support with the deployment ID, this runbook, and the failing commit SHA: <https://support.cloudflare.com/>.

Do not weaken release gates, branch protection, security checks, coverage requirements, or the no-root-`wrangler.toml` invariant to work around a provider-owned internal error.
