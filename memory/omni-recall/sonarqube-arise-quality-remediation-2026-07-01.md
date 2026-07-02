---
title: SonarQube + A.R.I.S.E. Quality Remediation
date: 2026-07-01
status: active
source: owner-supplied SonarQube / GitHub Actions failure excerpt
---

# Findings addressed

- A.R.I.S.E. `publish-snapshot` attempted to push generated snapshots directly to protected `main`, which GitHub rejected with GH013 branch-protection violations.
- A.R.I.S.E. new-code coverage report showed residual uncovered lines/conditions across structural/propose modules.
- SonarQube issues were reported for landing-page contrast, missing SwiftPM `Package.resolved`, redundant sidebar-widget aliases, super-linear Maestro regexes, a negated condition in OmniBridge event-store config lookup, and MCP client cognitive complexity.

# Remediation applied

1. `.github/workflows/arise.yml` now publishes generated snapshots through an automation branch and pull request instead of pushing to protected `main`.
2. `apps/apex-arise/tests/**` coverage was expanded for structural nesting, policy-loader edge fields, jscpd report edge cases, sandbox error formatting, snapshot degraded fallbacks, and PR error handling.
3. A.R.I.S.E. coverage now reports 100% functions and 100% lines for `apps/apex-arise/src/**` in the local validation run.
4. `apps/omnihub-site/src/styles/landing.css` contrast-sensitive text colors were raised on dark backgrounds.
5. `ios/App/CapApp-SPM/Package.swift` now uses valid POSIX local package paths and Capacitor SwiftPM `6.2.1`, aligned with root Capacitor 6.x dependencies; `Package.resolved` pins the resolved revision.
6. `src/contracts/omnidash-sidebar-widgets.ts` replaces redundant string aliases with direct `string` usage.
7. `src/integrations/maestro/safety/injection-detection.ts` replaces unbounded lazy `.*?` data-exfiltration regexes with bounded token patterns.
8. `src/lib/omnibridge/eventStore.ts` uses a positive `getProcessEnv()` helper instead of an inline negated environment check.
9. `src/omnihub-gateway/mcp-client.ts` splits SSE line parsing, parsed event handling, gateway error reading, and JSON fallback response handling into focused helpers to reduce cognitive complexity.

# Validation notes

- `bun install` was run in `apps/apex-arise` to restore local dev dependencies before typecheck/lint/coverage.
- SwiftPM resolution passed after aligning the generated manifest to Capacitor 6.x.
- Full production certification remains separate from these static-analysis and coverage remediations.
