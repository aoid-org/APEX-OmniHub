---
date: 2026-06-24
source: in-session repo + tool evidence (OSV.dev, PyPI, npm, uv, bun)
type: remediation-record
project: APEX-OmniHub
context: post-merge security (aiohttp Dependabot) + post-CI stabilization
verification: verified
status: verified
---

# Post-Merge Security + CI Remediation — 2026-06-24

Branch: `claude/bold-archimedes-apgm34`. One surgical fix per defect class, each
proven against authoritative evidence before patching. No source code changed —
only dependency locks, CI config, migrations, guards, and docs.

## 1. aiohttp Dependabot alerts (8 open, ecosystem pip)

**Root cause (proven).** The 8 alerts map 1:1 to the advisories that affect
aiohttp **3.14.0** and are all fixed in **3.14.1**. `orchestrator/uv.lock` and
`local-agents/requirements.txt` were already on 3.14.1, but
`orchestrator/requirements.lock` was stale at **3.13.3** (vulnerable). The lock
went stale because `uv pip compile` / `pip-compile` treats the existing output
lock as version *preferences* and never re-resolved aiohttp without an explicit
`--upgrade-package`.

**Evidence.** OSV.dev (live, 2026-06-24): aiohttp 3.14.1 → 0 advisories; 3.14.0
→ exactly 8, all `fixes=3.14.1`. PyPI: 3.14.1 is the latest release (no newer
fix exists). Mapped GHSAs:

| Alert class | GHSA | CVE |
| --- | --- | --- |
| WebSocket memory bypass | GHSA-xcgm-r5h9-7989 | CVE-2026-54274 |
| HTTP parser fragmentation bypass | GHSA-63hw-fmq6-xxg2 | CVE-2026-54277 |
| Unbounded pipelined request queue | GHSA-4fvr-rgm6-gqmc | CVE-2026-54273 |
| Compressed body cleanup bypass | GHSA-g3cq-j2xw-wf74 | CVE-2026-54278 |
| DigestAuth cross-origin credential leak | GHSA-hpj7-wq8m-9hgp | CVE-2026-54276 |
| TLS hostname override ignored | GHSA-4m7w-qmgq-4wj5 | CVE-2026-54275 |
| Resource leak on disconnect | GHSA-9x8q-7h8h-wcw9 | CVE-2026-54280 |
| Cookie scope escalation | GHSA-2fqr-mr3j-6wp8 | CVE-2026-54279 |

**Fix.** Bumped `orchestrator/requirements.lock` aiohttp `3.13.3 → 3.14.1`
(surgical, format-preserving — this lock carries no hashes; aiohttp 3.14.1's
runtime deps were already satisfied by the pinned closure, so zero transitive
changes). `uv lock --upgrade-package aiohttp` confirmed uv.lock stays at 3.14.1
(only a `revision 2 → 3` lock-format bump). No vulnerable aiohttp remains.

**Live Dependabot API note.** Direct GitHub Dependabot API was policy-denied for
this session (403 — GitHub App not connected at session scope). Ground truth was
established from OSV.dev + PyPI instead. No advisory IDs or fixed versions were
fabricated.

## 2. Bun / package.json post-CI fixes

- **Nested overrides removed.** `@opentelemetry/otlp-transformer` (which declares
  no protobufjs dependency in 0.219.0 — the override was inert) and
  `@temporalio/client` nested protobufjs overrides are Bun-unsupported. Replaced
  with a single flat `"protobufjs": "^7.6.4"` (mirrored in `resolutions`). The
  whole tree is protobufjs 7.x; 7.6.4 is the patched 7.x ceiling and clears
  CVE-2026-48712 / CVE-2026-54269 (resolved 7.5.5/7.5.8 were vulnerable).
  protobufjs now unifies to **7.6.4** in both bun.lock and package-lock.json.
- **Bun pinned.** `packageManager` `bun@1.x → bun@1.3.14`; all 7 workflow
  occurrences of floating `bun-version: latest → 1.3.14`.
- **Frozen lockfile.** Regenerated bun.lock; `bun install --frozen-lockfile
  --ignore-scripts` passes with no changes.

## 3. Duplicate Supabase migration

Deleted `supabase/migrations/20260621000000_omnitrace_audit_read_contract.sql`
(byte-identical to the canonical `20260621000002_omnitrace_audit_read_contract.sql`;
its `20260621000000` prefix collided with `..._fix_new_user_subscription_status_cast.sql`).
All 96 migration version prefixes are now unique.

## 4. Regression + defensive guards (new)

- `scripts/ci/check-python-dependency-security.py` — enforces per-package
  security floors (aiohttp ≥ 3.14.1) and cross-lock version parity; prints exact
  source line. Proven: fails on a reintroduced 3.13.3, passes when consistent.
- `scripts/ci/check-supabase-migration-versions.mjs` — fails on duplicate
  migration version prefixes. Proven positive + negative.
- `.githooks/pre-commit.d/20-dependency-security.sh` — runs both guards locally.
- `.githooks/pre-commit.d/30-destructive-action-guard.sh` — blocks agent-led
  destructive actions: hard-blocks root `wrangler.toml`, floating
  `bun-version: latest`, and Bun nested overrides; gates (override via
  `APEX_ALLOW_DESTRUCTIVE=1`) migration/security-gate deletion and mass deletion.
- Wired into `.github/workflows/security-regression-guard.yml` as unbypassable
  server-side invariants (Python floor guard, migration uniqueness, forbidden
  platform regressions).

## 5. Drift cleanup

Removed tracked stale duplicate manifest `package.json.bak` (committed in #1467,
unreferenced) — a hallucination/drift hazard.

## Validation (all real, this session)

| Command | Result |
| --- | --- |
| `python3 scripts/ci/check-python-dependency-security.py` | PASS (aiohttp≥3.14.1; locks consistent) |
| `node scripts/ci/check-supabase-migration-versions.mjs` | PASS (96 unique versions) |
| `bun install --frozen-lockfile --ignore-scripts` | PASS (no changes) |
| `uv lock --check` (orchestrator) | PASS |
| `pytest tests/omniboard -q` (orchestrator) | 38 passed |
| destructive-action guard (neg/override) | blocks without override; passes with |

## Residual risk

- protobufjs CVE-2026-54270 (memory amplification) has a fix only in 8.5.0; the
  temporalio/grpc stack constrains this tree to protobufjs 7.x, so it is not
  remediable without a major-version migration of those packages. Tracked, not
  introduced here.
- Orchestrator full pytest suite beyond `tests/omniboard` was not run (heavy
  runtime deps absent in the ephemeral sandbox); the Python change is lock-only,
  so behavioral risk is limited to dependency resolution, which is validated.
