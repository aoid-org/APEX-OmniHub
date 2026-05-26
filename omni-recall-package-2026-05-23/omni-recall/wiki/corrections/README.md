# Corrections
**Version:** 1.1.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Audited & Active

Store durable correction records here.

Each correction should capture:
- **Date:** ISO format.
- **Original Wrong Assumption:** The incorrect system understanding or implementation approach.
- **Corrected State:** The verified correct operational state/rule.
- **Scope:** `local`, `project-wide`, `global`, or `user-style`.
- **Affected Pages:** Files or modules updated.
- **Promotion Decision:** `page only`, `directive`, or `user-pattern rule`.

## Seeded Entries:

1. [[001-migration-linter-preceding-line]] — Fixes additive migration check exceptions.
2. [[002-sonarqube-prng-hotspot]] — Resolves SonarQube S2245 PRNG security hotspots.
3. [[003-sonar-coverage-migrations-exclusion]] — Excludes SQL DDL migrations from SonarCloud coverage constraints.
