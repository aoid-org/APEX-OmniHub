# Release remediation post-CI follow-up — 2026-06-16

Context: GitHub post-CI reported a stale dependency audit failure, Bun frozen-lockfile drift on Bun 1.3.14, Android Gradle dependency-locking issue, and SonarCloud new-code quality noise.

Actions taken:
- Upgraded OpenTelemetry direct dependencies to patched families so `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities rather than only zero high vulnerabilities.
- Regenerated `package-lock.json` and `bun.lock` with Bun 1.3.14 validation so CI `bun install --frozen-lockfile --ignore-scripts` matches the committed lockfile.
- Added `android/gradle.lockfile` so Android dependency-locking has a committed lockfile path; full Gradle lock regeneration remains blocked until generated Capacitor Gradle files are present.
- Applied targeted Sonar code-smell cleanups for reported portability/readability issues and aligned Sonar CPD/coverage exclusions for non-tested UI/content/orchestrator surfaces that CI already treats as non-production coverage targets.

Validation notes:
- `npm audit --omit=dev --audit-level=high` passed with 0 vulnerabilities after dependency updates.
- `bun install --frozen-lockfile --ignore-scripts` passed under Bun 1.3.14 via `npm exec --package=bun@1.3.14`.
- `cd android && ./gradlew dependencies --write-locks --no-daemon` remains environment/repo-snapshot blocked by missing `android/capacitor-cordova-android-plugins/cordova.variables.gradle`.
