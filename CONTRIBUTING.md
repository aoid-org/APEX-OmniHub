# Contributing to APEX OmniHub

## Commit Format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope?): subject

body (optional — explain WHY, not WHAT)
```

Types: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore`

## Releasing Changes

1. After merging a PR, add a changeset: `bun run changeset`
2. Select the change type (major/minor/patch)
3. Write a human-readable summary of the change
4. Commit the generated `.changeset/*.md` file

## Package Manager Policy

**npm** is the authoritative package manager for CI, releases, and the canonical lockfile.

- Use `npm ci` for installing dependencies in CI and for clean installs.
- bun is optional for local development only — `bun install` or `bun run` may be used for speed if preferred, but never commit `bun.lock` changes unless you are explicitly working on lockfile maintenance.

## Lockfiles

**`package-lock.json`** is the canonical CI lockfile. It is managed by both `npm ci` (CI installs) and Dependabot (`.github/dependabot.yml` uses `package-ecosystem: npm`) for automated security updates. Do not edit `package-lock.json` manually.

**`bun.lock`** is maintained for local bun users. It is committed so bun users have a consistent local experience, but it is **not relied on by CI**. Do not treat `bun.lock` as the authoritative lockfile.

The release workflow will automatically:
- Create a "Version Packages" PR accumulating changesets
- Generate `CHANGELOG.md` entries
- Create a GitHub Release with SBOM attached
- Publish the package when the PR is merged
