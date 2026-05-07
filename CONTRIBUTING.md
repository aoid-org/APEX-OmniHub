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

## Lockfiles

**`bun.lock`** is the authoritative lockfile for all human-driven installs (`bun install`).

**`package-lock.json`** is generated exclusively by Dependabot (`.github/dependabot.yml` uses
`package-ecosystem: npm`) to enable automated security updates. Do not edit or commit
`package-lock.json` manually — let Dependabot manage it. Run `bun install` for local development.

The release workflow will automatically:
- Create a "Version Packages" PR accumulating changesets
- Generate `CHANGELOG.md` entries
- Create a GitHub Release with SBOM attached
- Publish the package when the PR is merged
