---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Dependabot Major Upgrade Review

**Date:** 2026-05-13
**Branch:** `claude/harden-production-certification-NVFOQ`
**Scope:** PRs #1117, #1118, #1119, #1120 — all opened 2026-05-11 by Dependabot

---

## Summary Table

| PR | Dependency | Version Bump | Scope | Recommendation |
|----|-----------|-------------|-------|----------------|
| [#1117](#pr-1117) | `@capacitor/ios` | 6.2.1 → 8.3.3 | `ios/` native layer | **HOLD** |
| [#1118](#pr-1118) | `@capacitor/cli` (dev) | 6.2.1 → 8.3.3 | Build tooling (devDep) | **HOLD** |
| [#1119](#pr-1119) | `wagmi` | 2.19.5 → 3.6.14 | Web3 / wallet layer | **HOLD** |
| [#1120](#pr-1120) | `mysql-connector-python` | >=8.3.0 → >=9.7.0 | Python orchestrator only | **MERGE_AFTER_GATES** |

---

## PR #1117 — `@capacitor/ios` 6.2.1 → 8.3.3 {#pr-1117}

| Field | Value |
|-------|-------|
| **PR number** | #1117 |
| **Title** | `chore(deps): bump @capacitor/ios from 6.2.1 to 8.3.3` |
| **State** | Open |
| **Base SHA** | `42844610e3d2bfca404d0260783597057ae2009e` (main) |
| **Head SHA** | `679b03426d94486a7354e4511d0f12fda6a2a29b` |
| **Labels** | `dependencies` |
| **Changed files** | 1 (`package.json`) |
| **Author** | `dependabot[bot]` |
| **Created** | 2026-05-11 |

**Affected dependency and version bump:** `@capacitor/ios` production dependency, 6.2.1 → 8.3.3 (two major versions: 6 → 7 → 8).

**Affected code paths:**
- `package.json` (dependency declaration)
- `ios/` — Capacitor iOS wrapper and native bridge layer
- Any Capacitor plugin integrations in the iOS project that may be affected by SPM/CocoaPods API changes introduced in v7 and v8

**Breaking-change risk:** HIGH
- This is a two-major-version jump (6 → 8). Capacitor v7 introduced Swift Package Manager (SPM) as the primary package manager alongside CocoaPods, with significant changes to the Capacitor iOS bridge API and plugin system. Capacitor v8 extended these SPM changes (Package.swift generation, cSettings support, binaryTarget support).
- Breaking changes include: Swift/Objective-C plugin API surface changes, CocoaPods-to-SPM migration requirements, system bars API changes (`SystemBars` padding behavior changed in v8), and potential binary-target xcframework handling changes.
- The Dependabot compatibility score is visible in the PR but not guaranteed to capture native iOS runtime behavior.

**Migration notes (from PR body):**
- v8.3.x includes multiple CLI fixes for SPM Package.swift generation (resource entries, binary targets, framework linking, Cordova plugin support).
- v7.x introduced SPM as default; CocoaPods projects may need `cap sync` re-run.
- Requires coordinated update with `@capacitor/android`, `@capacitor/core`, `@capacitor/device`, and `@capacitor/push-notifications` (all still pinned at v6) to avoid cross-version incompatibility.

**Smoke tests required:**
- Full iOS device/simulator build via `ios/` Capacitor wrapper
- `cap sync ios` must complete without errors
- Push notification registration must succeed on device
- All Capacitor bridge calls in the app layer must function correctly
- Review `ios/App/Podfile` and `ios/App/Package.swift` for migration artifacts

**Recommendation: HOLD**
Two-major-version jump on a native iOS library requires manual device testing. The sibling packages `@capacitor/android`, `@capacitor/core`, `@capacitor/device`, and `@capacitor/push-notifications` are still at v6 — merging this PR alone creates a cross-major-version mismatch in the Capacitor ecosystem. All Capacitor packages must be upgraded in a coordinated, tested release. Do not merge until the full Capacitor v8 migration is validated on physical iOS hardware.

---

## PR #1118 — `@capacitor/cli` 6.2.1 → 8.3.3 {#pr-1118}

| Field | Value |
|-------|-------|
| **PR number** | #1118 |
| **Title** | `chore(deps-dev): bump @capacitor/cli from 6.2.1 to 8.3.3` |
| **State** | Open |
| **Base SHA** | `42844610e3d2bfca404d0260783597057ae2009e` (main) |
| **Head SHA** | `3a5ccf8c885b03683eb9978b8f5fb7bbc2b0eaa1` |
| **Labels** | `dependencies` |
| **Changed files** | 1 (`package.json` — devDependencies) |
| **Author** | `dependabot[bot]` |
| **Created** | 2026-05-11 |

**Affected dependency and version bump:** `@capacitor/cli` dev dependency, 6.2.1 → 8.3.3 (two major versions: 6 → 7 → 8).

**Affected code paths:**
- `package.json` devDependencies (build tooling only)
- `capacitor.config.ts` — CLI reads this to drive `cap sync`, `cap build`, `cap open`
- `ios/` and `android/` — output of `cap sync` may differ under CLI v8

**Breaking-change risk:** HIGH (despite being a devDependency)
- The CLI v7 and v8 changes to SPM Package.swift generation, CocoaPods integration, and plugin handling directly affect the output of `cap sync`. A mismatch between `@capacitor/cli` v8 and the runtime packages `@capacitor/ios` / `@capacitor/android` (still at v6) would produce incompatible sync artifacts.
- This PR is tightly coupled to #1117. Running CLI v8 against a v6 iOS runtime is unsupported.

**Migration notes (from PR body):**
- Same changelog as #1117. CLI v8 SPM changes require the iOS and Android runtimes to also be at v8.
- `cap sync` behavior changes in v7+ include new SPM Package.swift generation that CocoaPods projects must accommodate.

**Smoke tests required:**
- `npx cap sync ios` and `npx cap sync android` must complete without errors
- Must be tested jointly with #1117 (and the corresponding Android upgrade if applicable)
- `bun run build` followed by `cap sync` end-to-end

**Recommendation: HOLD**
Coupled to #1117. A CLI-v8 / runtime-v6 mismatch is a known unsupported configuration. Both PRs must be merged together as part of a coordinated Capacitor v8 ecosystem upgrade, validated on physical devices. Do not merge in isolation.

---

## PR #1119 — `wagmi` 2.19.5 → 3.6.14 {#pr-1119}

| Field | Value |
|-------|-------|
| **PR number** | #1119 |
| **Title** | `chore(deps): bump wagmi from 2.19.5 to 3.6.14` |
| **State** | Open |
| **Base SHA** | `42844610e3d2bfca404d0260783597057ae2009e` (main) |
| **Head SHA** | `53b44f2a6010c9c1a1e8abae4c4df66aa41b0c98` |
| **Labels** | `dependencies` |
| **Changed files** | 1 (`package.json`) |
| **Author** | `dependabot[bot]` |
| **Created** | 2026-05-11 |

**Affected dependency and version bump:** `wagmi` production dependency, 2.19.5 → 3.6.14 (one major version: 2 → 3).

**Affected code paths:**
- `package.json` (production dependency)
- All Web3 wallet connection surfaces in the app (wallet connect flows, `useAccount`, `useConnect`, `useReadContracts`, `useWriteContract` hook usage throughout the frontend)
- `apps/omnihub-site/src/` — any components using wagmi hooks
- `@wagmi/core` and `@wagmi/connectors` are also bumped (to v3.4.11 and v8.0.13 respectively as sub-dependencies)

**Breaking-change risk:** HIGH
- wagmi v3 is a major release that changes the connector API, configuration shape, and several hook signatures relative to v2. The `createConfig` API, connector initialization, and `WagmiProvider` setup changed between v2 and v3.
- `@wagmi/connectors` jumped from the v5 range (for wagmi v2) to v8.0.13 — a 3-major-version jump on connectors alone.
- `useReadContracts` chainId behavior changed (v3.6.13 fix notes an explicit chainId preference change that could affect existing contract reads).
- The `wagmi/tempo` entrypoint is new in v3.6.10 — existing imports must be audited.

**Migration notes (from PR body):**
- v3.6.13 fixed `useReadContracts` to prefer explicit `chainId` over inferred values — existing code relying on implicit chain inference may behave differently.
- v3.6.10 added `wagmi/tempo` Actions and Hooks for `viem/tempo#wallet` actions — new surface but not breaking.
- Full wagmi v3 migration guide at https://wagmi.sh/react/guides/migrate-from-v2 (referenced externally; not in PR body).

**Smoke tests required:**
- `bun run test:integration` covering all Web3 wallet flows
- Manual wallet connection testing (MetaMask, WalletConnect) in browser
- Contract read/write operations must be validated end-to-end
- Verify all existing wagmi hook imports resolve correctly under v3 API
- Run `bun run typecheck` — wagmi v3 TypeScript types differ from v2

**Recommendation: HOLD**
Major version bump for a production Web3 library that touches wallet connection and on-chain interactions. The connector sub-dependency jumped 3 major versions. Manual integration testing on all supported wallet providers is required before merge. The current hardening sprint (`claude/harden-production-certification-NVFOQ`) is not the appropriate time to absorb a Web3 library major upgrade.

---

## PR #1120 — `mysql-connector-python` >=8.3.0 → >=9.7.0 {#pr-1120}

| Field | Value |
|-------|-------|
| **PR number** | #1120 |
| **Title** | `chore(deps): update mysql-connector-python requirement from >=8.3.0 to >=9.7.0 in /orchestrator` |
| **State** | Open |
| **Base SHA** | `42844610e3d2bfca404d0260783597057ae2009e` (main) |
| **Head SHA** | `a97cb836dbcb7a616bc400803b1eb3dbded2760c` |
| **Labels** | `dependencies` |
| **Changed files** | 2 (`orchestrator/requirements.in`, `orchestrator/requirements.txt`) |
| **Author** | `dependabot[bot]` |
| **Created** | 2026-05-11 |

**Affected dependency and version bump:** `mysql-connector-python` Python package, >=8.3.0 → >=9.7.0 (one major version: 8 → 9). The `requirements.txt` is fully regenerated (pinned to 9.7.0).

**Affected code paths:**
- `orchestrator/requirements.in` — lower bound constraint change
- `orchestrator/requirements.txt` — full regenerated lockfile (148 additions, 53 deletions — many other packages also updated as transitive deps)
- `orchestrator/` — Python Temporal worker using mysql-connector-python for TiDB Vector Persistence (secondary: Hybrid C6 embeddings, as noted in requirements)
- This dependency is isolated to the Python orchestrator layer; it does not touch the TypeScript/React frontend or Supabase edge functions.

**Breaking-change risk:** LOW-MEDIUM
- v9.x changelog from PR body: v9.3.0 removed `Cursors Prepared Raw and Named Tuple` and deprecated class methods for instance data access (WL#16327, WL#16752). v9.3.0 also changed host wildcard behavior (WL#16754). v9.5.0 removed Python 3.9 support.
- v9.3.0 fixed an arbitrary file read vulnerability (BUG#37418436) — security improvement.
- The connector is used for TiDB vector persistence only (secondary storage path), not the primary Supabase/Postgres connection.
- Risk is mitigated by the Python-only scope and the fact that the `requirements.txt` regeneration also updates many other orchestrator dependencies to current versions.
- The regenerated `requirements.txt` includes significant dependency tree changes beyond just mysql-connector-python (torch, cuda bindings, transformers, sentence-transformers all updated). This broadens the scope beyond a single dependency change.

**Migration notes (from PR body):**
- v9.3.0: Deprecated `Cursors Prepared Raw` and `Named Tuple` cursor classes — audit orchestrator code for usage.
- v9.3.0: Host wildcard no longer applies to localhost — verify TiDB connection strings.
- v9.5.0: Removed Python 3.9 support — repo uses Python 3.11+ (safe).
- v9.5.0 added HeatWave GenAI and ML SDK support — not a concern for current usage.
- The security fix for arbitrary file read (BUG#37418436 in v9.3.0) is a compelling reason to upgrade.

**Smoke tests required:**
- `bun run ci:py` (ruff lint + pytest) must pass
- `bun run test:py` — full Python orchestrator pytest suite
- Verify TiDB vector persistence operations in orchestrator still function (connection, read, write)
- Confirm no usage of deprecated cursor classes (`Cursors Prepared Raw`, `Named Tuple`) in `orchestrator/`
- Verify `requirements.lock` is consistent after merge

**Recommendation: MERGE_AFTER_GATES**
The mysql-connector-python change is scoped entirely to the Python orchestrator layer, does not touch the frontend or edge functions, and the v9.x series contains a security fix (arbitrary file read). The Python 3.11+ runtime requirement is already met. The deprecated cursor classes should be audited before merge, but if not used, the risk is low. The broad `requirements.txt` regeneration warrants careful review of the full diff, but the CI Python gate (`bun run ci:py`) must pass before merge. Do not merge until `bun run test:py` passes cleanly.

---

*Generated by Claude Code agent on 2026-05-13 for branch `claude/harden-production-certification-NVFOQ`.*
