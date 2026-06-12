---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

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

## APEX Bible Contribution Rules

# Contributing to the APEX Bible

The APEX Bible is canonical. Changes ship through the same governance the
Bible itself prescribes.

## Change Categories

| Change | Required artifact |
|---|---|
| Typo, broken link, formatting | PR only |
| Clarification (no policy change) | PR only |
| Tightening an existing policy | PR + 1 architecture reviewer + 1 leadership reviewer |
| Loosening or relaxing a policy | RFC + architecture review + leadership approval |
| New policy document | RFC + architecture review + leadership approval |
| Doctrine principle add/remove/edit | RFC + architecture review + leadership approval + ADR |
| CI script change | PR + 1 architecture reviewer + green policy report attached |

## PR Hygiene

- one logical change per PR
- title prefix:
  - `docs:` for doc-only
  - `policy:` for policy doc additions/edits
  - `ci:` for CI policy or workflow changes
  - `doctrine:` for doctrine edits (rare)
- the PR template `Governance` section must be completed
- if architecture-impacting, include RFC link

## Local Validation

Before pushing:

```sh
make apex-verify
```

This runs the full local validation suite: policy check (human + JSON
report), markdown link check (if installed), and gitleaks dry-run (if
installed).

## Style

- terse, decision-tree-driven prose
- prefer tables over paragraphs for policies
- every policy file starts with: `Version`, `Owner`, `Applies To`
- no marketing language; no hedging
- examples must be runnable or specific
- forbidden words inside policy docs: "should consider", "might want to",
  "in some cases" (be definitive; if optional, say "optional:")

## Versioning

- governance package follows SemVer
- bump PATCH for doc edits without policy change
- bump MINOR for new policy or expanded scope
- bump MAJOR for breaking removal or backward-incompatible policy change
- update `CHANGELOG.md` on every bump
- update `package_manifest.json` version on every bump and run
  `make apex-manifest` to refresh SHA-256 hashes
