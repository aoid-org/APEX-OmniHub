# Canonical State Record - 2026-07-22 (PR #1654 merged — Armageddon attestation re-verified; PR #1655 open/draft — release-gate audit)

Authoritative snapshot of repo state as of `main` HEAD `1048eb5225ac2ff39355bf66a39023813cd673bd` (PR #1654 squash-merge). Direct `git log`/`git show` against the live tree and direct GitHub API queries (`pull_request_read`) are the source of truth for this pass — no numbers are carried forward from `CANONICAL_STATE_2026-07-21.md` without independent re-verification.

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File | Canonical behavior after PR #1654 merge |
|---|---|---|
| Armageddon Level 7 certification data | `apps/omnihub-site/dashboard/components/ArmageddonCertificationPlaque.tsx`, `apps/omnihub-site/public/certificates/certificatereport.{json,md}`, `.../ARMAGEDDONLevel7CERTIFIEDeb989339.pdf` | Plaque's hardcoded `ARMAGEDDON_CERT_DATA` and the certificate files now reflect run `eb989339…`, covering all 5 batteries (previously the shipped evidence doc described an unrelated run — different run ID, signing algorithm, and only 2 batteries). |
| Attestation evidence doc | `docs/release/claim-evidence/armageddon-report.md` | Rewritten to document the real `eb989339` run and a reproducible independent-verification methodology (fetch live Ed25519 public key from `https://armageddontest.icu/api/attestation/pubkey`, re-derive the Merkle root/digest from the certificate's raw battery data, verify the signature). |
| Release gate: `verify:claim-hygiene` | `scripts/ci/verify-release.mjs`, `docs/release/approved-claims.json` | 20 previously-unbacked CERTIFIED/attestation claim lines are now registered under category `internally_aligned`, each pointing at the rewritten evidence doc — no self-referential entries. |
| **New** forward guard | `scripts/ci/verify-armageddon-attestation.mjs` | Wired into `verify:release`. Re-verifies the shipped certificate's Ed25519 signature against a pinned known-good public key on every release check; fails if the plaque's display data ever drifts from the signed `certificatereport.json`. |

**Important distinction (verify before citing elsewhere):** this was **not** a fabricated claim like the PR #1646 incident documented in `CANONICAL_STATE_2026-07-21.md` §4. The attestation itself was independently confirmed genuine — signed by Armageddon-Core's real, separately-deployed signing service. The defect was that the *evidence doc already on `main`* (added with PR #1652's certification-plaque feature) described a different, stale run than the one actually shipped, which is what tripped `verify:claim-hygiene`. PR #1654 replaced it with a freshly re-verified, matching run. Source: PR #1654 body and commit `1048eb5` message (both fetched via `pull_request_read`/`git show`).

**Also merged to `main` in this window (2026-07-21T22:34Z → 2026-07-22, 17 commits across PR #1648–#1653), out of this doc pass's scope** (per root `CLAUDE.md` §"Execution Loop" — one task per session; these were other sessions'/agents' work, noted here only for HEAD-accounting completeness, not audited further):
- PR #1648 `543909a` — SonarQube code-smell fixes + 100% coverage for `apex-arise`.
- PR #1649 `7217102`/`bd72978` — `bun.lock` sync for post-CI release workflows.
- PR #1650/#1651 `5bd693e`,`d86b222`,`62f2599`,`9bd6abe` — supply-chain security audit (prod-dependency audit parity fix, SonarQube readonly-field fix).
- PR #1652 `e68b686`,`5574c54`,`33f6bfc` (+ duplicate lint/typecheck fixup commits `796dde2`,`014bd1b`,`42cae28`) `f6551bf` — **new feature**: Armageddon Level 7 Certification Plaque surfaced in `AuditsModule` and the marketing site (this is the feature whose evidence doc PR #1654 then had to correct).
- PR #1653 `203c0a9` — resolved 15 Dependabot vulnerabilities across npm and Python ecosystems.

## 2. Verified Statistics & Reference (git-verified 2026-07-22, on `main` @ `1048eb5`)

- **Release Line:** `1.8.3` (`package.json`, confirmed unchanged — `grep -m1 '"version"' package.json`).
- **HEAD on `main`:** `1048eb5225ac2ff39355bf66a39023813cd673bd` (PR #1654 merge, `2026-07-22T20:04:10Z` per GitHub API `merged_at`). Advances from the prior canonical snapshot's `48e8b7e` by 17 commits / 7 merged PRs (#1648–#1654 — #1654 is this pass's primary subject, §3; #1648–#1653 are out of scope, §1).
- **Source files (`src/`):** 234 `.ts` + 88 `.tsx` = **322 total** — unchanged since 2026-07-21 (`find src -type f -name '*.ts' | wc -l` / `-name '*.tsx'`).
- **SQL Migrations:** **108** forward `.sql` files + **4** rollback scripts = **112** total — unchanged (`find supabase/migrations -maxdepth 1 -type f -name '*.sql'`; `find supabase/migrations/rollback -type f -name '*.sql'`).
- **Edge Function dirs:** **35** (34 functions + `_shared`) — unchanged (`find supabase/functions -mindepth 1 -maxdepth 1 -type d`).
- **CI/CD Workflows:** **22** — unchanged (`find .github/workflows -maxdepth 1 -type f | wc -l`).
- **Production dependency audit:** `npm audit --omit=dev --json` → `{info:0, low:0, moderate:0, high:0, critical:0, total:0}`, independently re-run and confirmed in this pass (corroborates PR #1653's claim).
- **Primary Canonical Reference:** See `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md` and `README.md` (README's "Latest repo-history note" still points at `CANONICAL_STATE_2026-07-21.md` / HEAD `48e8b7e` as of this pass — now one canonical snapshot behind; see §5).

## 3. PR #1654 — MERGED (`1048eb5`, 2026-07-22T20:04:10Z)

Branch: `claude/post-ci-workflow-error-9mcg2i` → `main` (base `203c0a9`, i.e. immediately after PR #1653). Title: "fix(ci): resolve verify:claim-hygiene with verified Armageddon evidence." 2 commits, 10 files changed, +511/−73 (`git show --stat 1048eb5`).

Scope (verified via `git show --numstat 1048eb5`, insertions/deletions per file):
- `apps/omnihub-site/dashboard/components/ArmageddonCertificationPlaque.tsx` (+12/−9)
- `apps/omnihub-site/public/certificates/ARMAGEDDONLevel7CERTIFIED*.pdf` (binary rename+replace: `...e982d187.pdf` → `...eb989339.pdf`)
- `apps/omnihub-site/public/certificates/certificatereport.json` (+75/−12)
- `apps/omnihub-site/public/certificates/certificatereport.md` (+19/−7)
- `docs/APEX_AGENT_OPERATIONS.md` (+9/−0) — new entry recording the operational-impact statement (CI-only change, no service/env/DB/start-command change).
- `docs/release/approved-claims.json` (+102/−1) — 20 claim lines allowlisted under `internally_aligned`.
- `docs/release/claim-evidence/armageddon-report.md` (+92/−44) — rewritten evidence doc.
- `package.json` (+1/−0) — new `verify:armageddon-attestation` script entry.
- `scripts/ci/verify-armageddon-attestation.mjs` (**new**, +200/−0) — the forward guard described in §1.
- `scripts/ci/verify-release.mjs` (+1/−0) — wires the new script into the release gate chain.

**CI evidence** (check runs on head commit `c46568c`, fetched via `pull_request_read get_check_runs`): `build-and-test` — success; `Governance gate (required for branch protection)` — success; `SonarCloud` / `SonarCloud Code Analysis` — success; `Mobile Build Gate`, `Android Build (Debug)` — success; `iOS Build (Simulator)` — skipped (expected, no macOS runner in this lane). PR merged by `apexbusiness-systems`, `merged: true`.

## 4. PR #1655 — OPEN / DRAFT, NOT MERGED (base `1048eb5`, current `main` HEAD)

Branch: `claude/post-ci-workflow-error-9mcg2i` → `main`. Title: "fix(ci): remediate release-gate audit findings — dedup + 4 orphaned gates wired in + ops-doc claim-integrity check." State at time of this pass (`pull_request_read`): `state: open`, `draft: true`, `merged: false`, `mergeable_state: blocked`. 3 commits, 7 files changed, +214/−4.

**Do not treat any of this as merged/canonical — it is in-progress work.** Verified diff scope (via `pull_request_read get_files`):
- `.github/workflows/ci-runtime-gates.yml` (+14) — adds 3 new pre-install steps to `build-and-test` (`guard-agent-destructive-actions.mjs`, `check-lockfile-sync.mjs`, `check-edge-fn-manifest.mjs`) and 1 non-blocking diagnostic step (`verify-supabase-env-alignment.mjs`).
- `.github/workflows/ops-doc-guard.yml` (+3) — adds a `check-ops-doc-claim-integrity.mjs` step alongside the existing `check-ops-doc-drift.mjs`.
- `docs/APEX_AGENT_OPERATIONS.md` (+12) — new §9.36 entry.
- `package.json` (+4) — 4 new `check:*` script aliases.
- `scripts/ci/check-ops-doc-claim-integrity.mjs` (**new**, +180) — a forward guard that cross-checks `APEX_AGENT_OPERATIONS.md` sections citing an inline commit SHA next to a `**Changed files:**` line against that commit's real `git diff`. Per the PR's own description it is conservative and currently cross-checks **0** existing sections (all cite PR numbers, not inline SHAs) — it would not have caught the PR #1646 fabrication retroactively; it is additive prevention only.
- `scripts/ci/release-lattice.mjs` (+1/−3) — collapses 3 duplicate-command stages (all invoking the same spec file) into 1 accurately-labeled stage.
- `scripts/ci/verify-release.mjs` (−1) — removes a duplicate `verify:cloudflare-pages-contract` gate registration.

**CI status at time of this pass** (`pull_request_read get_check_runs`, head `b2f05d2`): 33 check runs total; `build-and-test` — **in_progress**; all other completed runs so far (`Governance gate`, `Security Invariant Checks`, `Dependency Security Audit`, `Compliance Gates`, `Operations doc drift guard`, `OmniSkin Engine token contract`, `Architectural Boundary Enforcement`, etc.) — success. `mergeable_state: blocked` is consistent with the PR still being a draft, not a check failure. **Re-check this before citing PR #1655 as merged in any future doc** — it was not merged as of `2026-07-22T20:46Z`.

## 5. Documentation Sync (2026-07-22) — scope of this pass

This pass is scoped to `.understand-anything/` only (per this session's own task boundary). No edits were made to `README.md`, `CLAUDE.md`, or `APEX_SURFACE_REGISTRY.md`.

| File | Change |
|---|---|
| `.understand-anything/CANONICAL_STATE_2026-07-22.md` | **NEW** — this file. |

**Flag for the `README.md`-owning agent:** `README.md`'s "Latest repo-history note" (line 79) still says "current audited baseline for this documentation sync is `48e8b7e`" and links `CANONICAL_STATE_2026-07-21.md` as the canonical-state pointer. Both are now one snapshot behind this file (`main` HEAD is `1048eb5`, and PR #1655 is open/draft on top of it). Recommend updating the pointer to this file once README ownership picks it up — not done here, out of this pass's file scope.
