# APEX-OmniHub Release Gate Audit — 2026-07-03

**Artifact audited:** `APEX-OmniHub-main (1).zip` (main snapshot, root `package.json` v1.8.3, CHANGELOG backfilled through PR #1567)
**Auditor environment:** isolated Linux sandbox, Node v22.22.3. No `.git` metadata in the zip (branch/HEAD SHA UNVERIFIED — evidence: `git log` unavailable in an exported zip).

---

## DECISION: NO-GO — for full production release certification
### (Code-quality lane: GREEN / READY FOR OWNER REVIEW)

The codebase itself passed every gate executable in this environment with zero failures. The NO-GO is driven by the repository's **own canonical certification authority**: `docs/release/release-validation-matrix.json` records `decision: NO_GO_FOR_FULL_PRODUCTION_CERTIFICATION__HARNESS_READY_LIVE_GAPS_HONEST` (generated 2026-06-26), and this snapshot contains **no superseding evidence** that the 13 open live-validation items were closed.

---

## 1. VERIFIED FACTS (executed in this audit)

| Gate | Result | Evidence |
|---|---|---|
| Secrets scan (repo's `scripts/secret-scan.mjs`) | PASS | "No obvious secrets found" |
| Deep manual secret grep (Anthropic/OpenAI/Groq/AWS/GitHub/Slack keys, private keys) | PASS | Only doc placeholders in `NATIVE_PUSH_SETUP.md`; only `.env.example` files present |
| Root `wrangler.toml` prohibition | PASS | Absent |
| `check:omnidash` (Canonical Layout Law) | PASS | 37/37 invariants |
| `check:omni-skin` (OSE guard) | PASS | 6/6 invariants |
| `check:react` (singleton) | PASS | |
| `check:pwa` | PASS | "Install banner is live-ready" |
| `guard-agent-destructive-actions` | PASS (exit 0) | git-metadata warning only, zip artifact |
| `docs:check` (links + code pointers) | PASS | 0 broken links, 0 broken pointers |
| Unit tests `tests/lib` | **38 files, 401 tests — all pass** | vitest 4.1.9 |
| Integration `tests/integration` | 4 files pass, 2 skipped (backend-gated); 76 pass / 40 skipped | |
| `tests/security` + `tests/release` + `tests/rsi` + `tests/guardian` | 15 files, 114 pass / 1 skipped | |
| `tests/omnidash` (all 87 files, run in 4 shards) | **78 files pass, 9 skipped; 714 tests pass, 0 fail** | |
| `tests/unit` + `tests/api` + `tests/core` + `tests/contracts` | 574 tests pass, 0 genuine failures | see note below |

**Total executed: ~1,880 tests, 0 genuine failures.**

**Typecheck (completed after initial report):**
- `tsc -p tsconfig.node.json --noEmit` — **PASS** (exit 0).
- `tsc -p tsconfig.app.json --noEmit` — **PASS except exactly 1 error**, `TS7016` on `apps/omnihub-site/src/ssg-websocket.ts:9` (`import WebSocket from 'ws'` has no declaration file). Root cause verified: `@types/ws` is **not declared in any package.json** — under npm hoisting (canonical CI) it arrives transitively and typecheck goes green; under a strict installer it disappears. Environment-sensitive phantom type dependency, not a code defect. **Recommended fix (2-line, non-blocking):** add `"@types/ws"` to `apps/omnihub-site` devDependencies.

Note: 2 initial failures in `tests/unit/ssg-websocket.test.ts` were an audit-environment artifact — the sandbox forced a pnpm-strict install (npm reify was incompatible with the sandbox filesystem), which does not hoist `ws`. `ws@^8.21.0` **is** correctly declared in `apps/omnihub-site/package.json:60`; with the module linked, both tests pass. Not a repo defect. Same class of artifact required manually linking `undici` (used by `tests/setup.ts`).

## 2. UNVERIFIED (could not execute in this sandbox — 45s process ceiling)

- `npm run lint` (full eslint) — exceeds the sandbox process time limit. UNVERIFIED locally. Carried-forward evidence: 28/28 CI checks green on main at `c5d8acc` (2026-07-02) include lint — carried forward, not re-proven against this zip. (Typecheck was subsequently completed locally — see §1.)
- `test:e2e` (Playwright), `perf:k6:smoke` — require browser/k6 install; out of sandbox scope.
- Branch/HEAD identity of the zip vs. GitHub `main` — no `.git` directory.

## 3. FAILING / OPEN RELEASE GATES (from the repo's own matrix, 2026-06-26 — none closed in this snapshot)

- **BLOCKED (1):** `PERFORMANCE_LOAD_K6` — k6 smoke never actually executed; "skipped placeholders are not accepted."
- **REQUIRES_MANUAL_VALIDATION (9):** CF_DEPLOY_ENV, AUTH_EMAIL_PASSWORD, OAUTH_CALLBACKS, PASSKEY_WEBAUTHN, OMNIDASH_LIVE_PERSISTENCE, SUPABASE_RLS_MULTI_TENANT, BYOM_PROVIDER_KEYS, BILLING_PAYMENT_SANDBOX, BRANCH_PROTECTION_RELEASE_GATES — all blocked on live credentials/owner evidence.
- **HONESTLY_GATED (3):** BROWSER_PUBLIC_ROUTES, REQUEST_ACCESS_PROOF, PWA_MOBILE_WEB.
- Per canonical BYOM truth: BYOM must not be claimed certified until a real provider-backed prompt succeeds through the BYOM route — matrix confirms this is still open.

## 4. RISKS / GOVERNANCE FLAGS

1. **Direct commits to `main`** — CHANGELOG records A.R.I.S.E. Phase 1a/1b landed as direct commits (`ac611ca`–`180eb7d`, 2026-07-01), not PRs. Deviation from the PR-gated release workflow; owner should confirm these passed equivalent gates.
2. **Stale matrix** — certification authority is dated 2026-06-26; ~15 PRs have merged since (through #1567). The matrix should be regenerated before any certification claim either way.
3. **PAT rotation** — flagged 2026-07-02, no evidence of completion. Rotate before release.
4. **Loose root artifacts** (`prompt_dump.txt`, `scratch_fix.cjs`, `test.json`, `validation_out.txt`, screenshots) — no secrets found in them, but they are working-session debris in a release snapshot; hygiene cleanup recommended.

## 5. NEXT EXECUTABLE STEP

Run the live production-validation harness with owner credentials (starting with `PERFORMANCE_LOAD_K6` — the only hard BLOCKED item — then AUTH/RLS/BYOM), regenerate `release-validation-matrix.json`, and re-issue the gate decision. Code-side, nothing in this snapshot blocks that: every executable gate is green.
