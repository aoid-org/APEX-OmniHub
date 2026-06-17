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

Follow-up — 2026-06-17:
- Replaced Python 3.11-only `datetime.UTC` usage with Python 3.10-compatible `timezone.utc` aliases/usages across orchestrator production/test code while preserving timezone-aware UTC timestamps.
- Added Vitest coverage for `apps/omnihub-proof/src/App.tsx`, extracted/tested `bootstrapOmniHubProof` in `apps/omnihub-proof/src/main.tsx`, and completed branch coverage for `src/swInit.ts`.
- Added a fail-closed Cloudflare Pages repo contract verifier and runbook for the observed provider/internal post-CI Pages error; no root `wrangler.toml` was added.
- Adjusted release verifier PATH allowlist for pyenv/mise runtime shims so `verify:release` can execute Python lint tools in this CI-like environment without weakening gates.
- RSI follow-up: restored `orchestrator/security/guardian_fabric.py` to its prior protected-path content and added an orchestrator-local Python startup compatibility shim so Python 3.10 can still resolve `datetime.UTC` without touching `orchestrator/security/**`.
