---
version: 1.0.0
last_audited: 2026-06-24
status: verified
---

# RFC 2026-06-24 — Post-Merge Security + CI Remediation (PR #1484)

## 1. Context

Eight open `aiohttp` Dependabot alerts (ecosystem pip) plus residual post-CI
defects required remediation with minimal blast radius. Investigation against
authoritative sources (OSV.dev + PyPI; the live GitHub Dependabot API was
policy-denied for the session) proved the 8 alerts map 1:1 to advisories that
affect `aiohttp 3.14.0` and are all fixed in `3.14.1`. The only repo artifact
still pinned to a vulnerable version was `orchestrator/requirements.lock`
(`3.13.3`); `uv.lock` and `local-agents/requirements.txt` were already patched.
Root cause of the stale lock: `uv pip compile` / `pip-compile` treat the existing
output lock as version *preferences* and never re-resolve a package without an
explicit `--upgrade-package`.

This change touches `supabase/migrations/*` (a duplicate-version deletion) and
deployed-runtime dependency locks, so it is architecture-impacting and carries
this RFC as durable review evidence.

## 2. Architecture Impact

- **Dependency security floor.** `aiohttp` is raised to the patched floor
  `3.14.1` across the repo. A new CI/pre-commit guard makes the floor and
  cross-lock parity an enforced invariant, not an ad-hoc fix.
- **Supply-chain determinism.** The Bun toolchain is pinned
  (`bun-version: latest → 1.3.14`, `packageManager: bun@1.3.14`), and the
  Bun-unsupported nested `protobufjs` overrides are replaced with a flat
  `^7.6.4` override (tree unifies on a patched 7.6.4).
- **Migration ordering integrity.** A duplicate migration version prefix
  (`20260621000000`) is removed and made an enforced uniqueness invariant.
- **Defensive posture.** New guards run both locally (pre-commit) and as
  unbypassable server-side CI invariants, including an agent-led
  destructive-action guard. No existing security gate is weakened or bypassed;
  this RFC and the ops-doc note are added to *satisfy* the governance gates.

## 3. Implementation Details

- `orchestrator/requirements.lock`: `aiohttp 3.13.3 → 3.14.1` (format-preserving;
  dependency closure already satisfied, zero transitive churn).
- `orchestrator/uv.lock`: confirmed `3.14.1` via `uv lock --upgrade-package
  aiohttp` (only a `revision 2 → 3` lock-format bump).
- `package.json`: flat `"protobufjs": "^7.6.4"` in `overrides` + `resolutions`;
  removed nested per-package override objects. Regenerated `bun.lock` and
  `package-lock.json` (both resolve protobufjs to 7.6.4).
- Removed duplicate `supabase/migrations/20260621000000_omnitrace_audit_read_contract.sql`
  (byte-identical to the canonical `...20260621000002_...`).
- Added `scripts/ci/check-python-dependency-security.py`,
  `scripts/ci/check-supabase-migration-versions.mjs`, and
  `.githooks/pre-commit.d/{20-dependency-security,30-destructive-action-guard}.sh`;
  wired into `.github/workflows/security-regression-guard.yml`.
- Operations note recorded in `docs/APEX_AGENT_OPERATIONS.md` §9.14.

## 4. Verification

- `python3 scripts/ci/check-python-dependency-security.py` — PASS (proven neg+pos).
- `node scripts/ci/check-supabase-migration-versions.mjs` — PASS (96 unique; proven neg+pos).
- `bun install --frozen-lockfile --ignore-scripts` — PASS (no changes; protobufjs 7.6.4).
- `uv lock --check` — PASS.
- `pytest tests/omniboard -q` — 38 passed.

## 5. Rollback Plan

All changes are dependency-lock / CI-config / migration-dedup / doc + guard
additions. To roll back, revert PR #1484: restoring the prior `requirements.lock`
re-pins `aiohttp 3.13.3` (re-opening the 8 alerts), and removing the guards
restores the prior CI surface. No data migration or service-topology change is
involved, so rollback is a pure git revert with no runtime cutover.

**Status:** Approved & Implemented.
