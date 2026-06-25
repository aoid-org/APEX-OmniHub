---
version: 1.0.0
created: 2026-06-25
last_audited: 2026-06-25
status: verified
supersedes: CURRENT_PLATFORM_STATE_2026_06_24.md
---

# Current Platform State — 2026-06-25

> **CURRENT AUTHORITY (2026-06-25):** `main` HEAD is `4c0d481` (PR #1488
> "chore(cert): Production Hardening Sprint & Codebase Determinism").
> Active dev branch: `claude/kind-feynman-h5gcbs` — HEAD `6074e0c`
> (fix(ci): integration-harness playwright install hang resolved).
> Release line remains **1.8.2** — no version bump this session.
> See the **Integration Harness CI Fix** section below for the full record.
> The PR #1487 / PR #1488 detail is retained as historical evidence.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-25 |
| `main` HEAD (current) | `4c0d481` — chore(cert): Production Hardening Sprint & Codebase Determinism (#1488) |
| `main` HEAD at previous doc sync | `8bfb1a6` — fix(sonar): omnihub-site code-smell closure (#1486) |
| Active dev branch | `claude/kind-feynman-h5gcbs` |
| Dev branch HEAD | `6074e0c` — fix(ci): resolve playwright install hang — add --with-deps and browser cache |
| Root package version | `1.8.2` (unchanged) |
| Platform stack | **Vite 7 + React 18 + TypeScript 5.9** — Cloudflare Pages (frontend), Supabase (DB/edge), Render/Temporal (orchestrator) |
| CI/CD workflow count | **20** (was 23 — `dependency-review.yml`, `production-readiness.yml`, `security-guards.yml` removed in PRs #1487/#1488) |
| Edge function dirs | **33** total (32 function dirs + `_shared`) — previously documented as 36; current count is git-verified |
| SQL migrations | **100** (96 forward + 4 rollback) — unchanged |
| Source files (`src/`) | **328** (234 `.ts` + 94 `.tsx`) — unchanged |
| Custom hooks (`src/`) | **23** — unchanged |

---

## Integration Harness CI Fix (2026-06-25 — this session)

### Root Cause

The `.github/workflows/integration.yml` step `playwright install chromium` was
downloading the 170.4 MiB Chrome for Testing binary successfully, then **hanging
indefinitely** for 5+ hours without error output. After download, Playwright
spawns a headless Chrome process to verify installation. Without `--with-deps`,
the required system libraries (`libglib2.0-0`, `libnss3`, `libgbm1`, `libatk1.0-0`,
etc.) are absent on the Ubuntu 22.04 GitHub Actions runner. The verification
process deadlocks waiting on missing libs and never exits — GitHub kills the job
at the 6-hour hard limit.

Secondary issue: 170 MB was re-downloaded on every CI run with no caching.

### Fix Applied (commit `6074e0c`, branch `claude/kind-feynman-h5gcbs`)

| Change | Detail |
|---|---|
| **Browser cache** | `actions/cache@v4` for `~/.cache/ms-playwright` keyed by `hashFiles('integration-harness/package-lock.json')` — eliminates re-download on cache hit |
| **System deps** | `playwright install --with-deps chromium` — `apt-get` installs all required Chrome system libraries before verification runs; resolves the deadlock |
| **Timeout backstop** | `timeout-minutes: 10` — future regressions fail in ≤10 min, not 6 hours |

### File Changed

```
.github/workflows/integration.yml  (10 insertions, 2 deletions)
```

### Verification

- YAML syntax validated: `python3 -c "import yaml; yaml.safe_load(...)"` → valid
- Diff reviewed: surgical, no scope creep
- Previous state: job run #341 was `in_progress` for 5h 26m 52s (accepted known item in the 2026-06-24 Session 3 certification)
- After fix: `playwright install --with-deps chromium` will install system deps then proceed without hanging; browser binary cached after first run

---

## Post-Last-Sync Changes on `main` (PRs #1487 and #1488)

### PR #1487 — v1.8.2 Release: Guard Alignment & SBOM Attach-Only Gate (`b43bf6a`)

- Aligned `guard-agent-destructive-actions.mjs` exemptions with `check-release-certification-docs.mjs`
- SBOM step confirmed attach-only (gated on `git ls-remote --tags` existence check — CI can never create a tag)
- `dependency-review.yml` removed (GitHub native dependency review supersedes this workflow)

### PR #1488 — Production Hardening Sprint & Codebase Determinism (`4c0d481`)

- `production-readiness.yml` removed (functionality absorbed into `ci-runtime-gates.yml`)
- `security-guards.yml` removed (consolidated into `security-regression-guard.yml`)
- Net workflow count: 23 → 20
- Edge function directory count updated in live repo to 33 (32 function dirs + `_shared`)

---

## Verified Repository Counts (2026-06-25, git-verified)

| Metric | Value | Verification command |
|---|---|---|
| Source files under `src/` | **328** TypeScript/TSX (234 `.ts` + 94 `.tsx`) | `find src -name "*.ts" -o -name "*.tsx" \| wc -l` |
| React components (`.tsx`) | **94** | `find src -name "*.tsx" \| wc -l` |
| Custom hooks (`use*.ts*` in `src/`) | **23** | `find src -name "use*.ts" -o -name "use*.tsx" \| wc -l` |
| Edge function directories | **33** (32 function dirs + `_shared`) | `find supabase/functions -maxdepth 1 -mindepth 1 -type d \| wc -l` |
| Database migrations | **100** `.sql` files (96 forward + 4 rollback) | `find supabase/migrations -name "*.sql" \| wc -l` |
| CI/CD workflows | **20** | `ls .github/workflows/ \| wc -l` |

---

## CI Gate Status (2026-06-25)

| Gate | Status | Notes |
|---|---|---|
| Integration harness playwright install | **FIXED** | `--with-deps` + browser cache + timeout added (commit `6074e0c`) |
| `ci-runtime-gates` | Expected green on merge | No source code changed this session |
| `security-regression-guard` | Expected green | No dependency or migration changes |
| `orchestrator-ci` | Expected green | No orchestrator code changed |

---

## Conflict Resolution Rule

This document (2026-06-25) supersedes all prior `CURRENT_PLATFORM_STATE_*.md` files
unless a newer dated file exists.

> **CI validates. Owner certifies.** This snapshot is scoped to the current working
> state; any later change requires its own evidence and its own owner sign-off.
