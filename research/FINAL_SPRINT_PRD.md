# APEX OmniHub — Final 25% Sprint PRD

## Objective

Close all Tier 1-4 gaps identified in the APEX-QA extended audit to make the platform production-ready for Series A due diligence.

## Scope

20 tasks across 4 tiers:

### Tier 1 — Credibility (5 tasks)
- T1.1: Auto-generate INSTITUTIONAL_READINESS.json from CI metrics
- T1.2: Dependabot for npm, pip, GitHub Actions
- T1.3: Auto-install git hooks via postinstall
- T1.4: Rename supabase_healthcheck to platform-health
- T1.5: PR template with engineering checklist

### Tier 2 — Engineering Excellence (7 tasks)
- T2.1: Bundle size budget with CI enforcement
- T2.2: Lighthouse CI gate with accessibility enforcement
- T2.3: Conventional commits via commitlint
- T2.4: Playwright mobile/tablet/Firefox projects
- T2.5: Route-level React error boundaries
- T2.6: i18next resolution (already configured with 7 locales)
- T2.7: Docker Compose for one-command local dev

### Tier 3 — Product Excellence (3 tasks)
- T3.1: OmniDash demo mode with seeded data
- T3.2: Edge Functions API reference documentation
- T3.3: SEO meta tags, sitemap, robots.txt

### Tier 4 — Series A Signals (4 tasks)
- T4.1: CODEOWNERS file
- T4.2: SBOM published to GitHub Releases
- T4.3: Changesets for automated changelog/releases
- T4.4: Branch protection documentation

## Success Criteria

- All files exist per the final gate checklist
- `bun run typecheck` — zero errors
- `bun run build` — clean build
- No false metrics in INSTITUTIONAL_READINESS.json
- All commits follow conventional commit format
