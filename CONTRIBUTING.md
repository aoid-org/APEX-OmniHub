<!-- VALUATION_IMPACT: Codifies contribution standards to eliminate bus factor risk -->
<!-- Generated: 2026-02-03 -->
# APEX-DEV Naming Conventions
| Element | Convention |
| --- | --- |
| React components | PascalCase |
| Functions and variables | camelCase |
| Files | kebab-case |
| Constants | SCREAMING_SNAKE_CASE |

# Single Port Rule
All external API calls must go through `src/lib/adapters/*`. Business logic never calls `fetch` or `axios` directly.

# PR Submission Checklist
- Tests added for new logic
- Documentation updated (README/runbooks)
- Lint passes (`npm run lint`)
- Changelog entry added to `CHANGELOG.md`
- Commits remain atomic

# Code Review Standards
- Approval required from at least one maintainer
- Resolve every review comment before merging
- CI status must be green before merge

# Verify:
markdownlint CONTRIBUTING.md
