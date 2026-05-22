<!-- APEX_DOC_STAMP: VERSION=v1.0-SERIALIZE-JAVASCRIPT-90 | LAST_UPDATED=2026-05-20 -->

# Security Advisory Handling

- **Document Version:** 1.0.0
- **Platform Version:** 1.6.0
- **Last Updated:** 2026-05-20
- **Owner:** APEX Engineering / Security
- **Status:** Active

---

## Current Advisory Disposition

| Advisory | Package | Affected range | Fixed version | Current repo disposition |
| --- | --- | --- | --- | --- |
| Dependabot alert #90 — CPU exhaustion DoS in crafted array-like serialization | `serialize-javascript` | `<7.0.5` | `7.0.5` | **Resolved** in `apps/omnihub-site` by pinning the local override and lockfiles to `7.0.5`. |

## Verification Evidence — 2026-05-15

| Check | Evidence |
| --- | --- |
| Transitive source | `vite-plugin-pwa@1.3.0` → `workbox-build@7.4.1` → `@rollup/plugin-terser@1.0.0` → `serialize-javascript` |
| Direct app override | `apps/omnihub-site/package.json` sets `overrides.serialize-javascript` to `7.0.5` |
| npm lockfile | `apps/omnihub-site/package-lock.json` resolves `node_modules/serialize-javascript` to `7.0.5` |
| Bun lockfile | `apps/omnihub-site/bun.lock` resolves `serialize-javascript` to `7.0.5` |
| Local audit | `npm audit --package-lock-only --omit=dev` in `apps/omnihub-site` reports zero production vulnerabilities |

## Advisory Response Standard

1. Confirm whether the vulnerable package is present in every package manager lockfile used by the affected workspace.
2. Identify the dependency path with `npm why <package> --package-lock-only` or the equivalent package-manager command.
3. Prefer a patched direct dependency upgrade. If no upstream dependency release exists, use the narrowest package-manager override that pins only the vulnerable package to the fixed version.
4. Regenerate every committed lockfile for the affected workspace.
5. Run the affected workspace's audit, typecheck, lint, and build gates before closing the advisory.
6. Record the result in this advisory log and in the applicable changelog.

## Production Risk Notes

- The vulnerable code path is most dangerous when untrusted or polluted objects are passed into `serialize()`.
- The application still treats the package as security-sensitive because the vulnerable package is in the build/PWA tooling dependency graph.
- Prototype-pollution defenses and input validation remain mandatory controls even after this dependency remediation.
