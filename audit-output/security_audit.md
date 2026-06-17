# APEX-OmniHub Security Audit
**Auditor:** APEX-AUDITOR-PRIME / AGENT_2 SECURITY_AUDITOR
**Date:** 2026-06-16
**Branch:** apex/omnihub/defcon4-clean-remediation (HEAD: 8ee42380)
**Methodology:** OWASP Top 10:2025, CWE mapping, manual secret scan, auth flow review, injection surface mapping

---

## SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 5 |
| INFO | 4 |

---

## CRITICAL FINDINGS

### SEC-C-001 — VITE_ Prefixed API Key Embedded in Client Bundle
**Severity:** CRITICAL
**OWASP:** A02:2025 Cryptographic Failures / CWE-312
**File:** `.env:19` (VERIFIED)
**Finding:** `VITE_GROQ_API_KEY` is present in `.env` with a live `gsk_...` value. Vite embeds ALL `VITE_` prefixed variables into the compiled JavaScript bundle at build time. Any production build executed with this `.env` exposes the Groq API key to every browser client that loads the app.
**Evidence:** `.env` line 19 — `VITE_GROQ_API_KEY=gsk_[REDACTED]` [VERIFIED — file read directly]
**Impact:** Full Groq API access at attacker's expense; prompt injection via hijacked model calls; billing fraud.
**Remediation:** Rotate the Groq API key immediately. Move all AI provider keys to server-side edge functions only. Never use `VITE_` prefix for secret values.

---

### SEC-C-002 — SUPABASE_SERVICE_ROLE_KEY on Disk with Live JWT
**Severity:** CRITICAL
**OWASP:** A07:2025 Identification and Authentication Failures / CWE-522
**File:** `.env:7` (VERIFIED)
**Finding:** `SUPABASE_SERVICE_ROLE_KEY` contains a live JWT (`eyJ...`) with `"role":"service_role"`. This key bypasses ALL Row Level Security policies — it grants unrestricted read/write/delete access to every table in the database.
**Evidence:** `.env` line 7 — `SUPABASE_SERVICE_ROLE_KEY=eyJ[REDACTED]` [VERIFIED — file read directly]
**Impact:** Full database compromise. All tenant data, payments, audit logs, PII — accessible without restriction.
**Remediation:** Rotate key at supabase.com/dashboard/project/rtopreovkywofgwgmozi/settings/api immediately. Verify the key is only consumed via `Deno.env.get()` in edge functions (confirmed correct pattern in _shared/supabaseClient.ts).

---

### SEC-C-003 — GitHub PAT Embedded in Git Remote URL
**Severity:** CRITICAL
**OWASP:** A02:2025 / CWE-312
**File:** `.git/config` (VERIFIED via `git remote -v`)
**Finding:** The GitHub Personal Access Token (`github_pat_11BYZIQ...`) is embedded directly in the `origin` remote URL as `https://x-access-token:[TOKEN]@github.com/...`. This token is stored in plaintext in `.git/config` and is readable by any process with filesystem access.
**Evidence:** `git remote -v` output shows full PAT in URL [VERIFIED — output observed directly]. Prior commit `c89fd9f6` references this same PAT in `.env`.
**Impact:** Full GitHub repository access at token scope. Code injection via PR, secrets exfiltration from Actions, branch protection bypass depending on token permissions.
**Remediation:** Rotate at github.com/settings/tokens immediately. Set remote URL to `https://github.com/apexbusiness-systems/APEX-OmniHub.git` and use SSH or GitHub Actions GITHUB_TOKEN for CI.

---

### SEC-C-004 — Plaintext User Password in `.env`
**Severity:** CRITICAL
**OWASP:** A07:2025 / CWE-256 Plaintext Storage of Password
**File:** `.env:35` (VERIFIED)
**Finding:** `PASSWORD=Apex143!` — a raw plaintext user account password stored in the environment file.
**Evidence:** `.env` line 35 [VERIFIED — file read directly]
**Impact:** Account takeover of `jrmendozaceo@apexbusiness-systems.com` (E2E test account). If this password is reused across services (common pattern), blast radius is significant.
**Remediation:** Remove immediately. Use a dedicated E2E test account with a randomly-generated one-time password stored in GitHub Actions secrets only. Rotate this password now.

---

### SEC-C-005 — Live Cloudflare API Tokens on Disk
**Severity:** CRITICAL
**OWASP:** A02:2025 / CWE-312
**File:** `.env:28-29` (VERIFIED)
**Finding:** Two live Cloudflare tokens — `CLOUDFLARE_AGENT_TOKEN=cfat_almP1Nmcib5eYaEB3z...` and `CLOUDFLARE_DOMAIN_TOKEN_AOID=cfat_6pm8rk7g4Eib9x6v...` — stored in plaintext.
**Evidence:** `.env` lines 28-29 [VERIFIED — file read directly]
**Impact:** DNS record manipulation, CDN cache poisoning, production deployment hijacking, zone deletion.
**Remediation:** Rotate at dash.cloudflare.com/profile/api-tokens immediately. Use GitHub Actions secrets exclusively.

---

### SEC-C-006 — Supabase Personal Access Token Exposed
**Severity:** CRITICAL
**OWASP:** A02:2025 / CWE-312
**File:** `.env:8` (VERIFIED)
**Finding:** `SUPABASE_TOKEN_AOID=sbp_411dc53da5de5a14e99...` — a Supabase personal access token (scoped to the account owner) stored in plaintext.
**Evidence:** `.env` line 8 [VERIFIED — file read directly]
**Impact:** Project management access — could enable migration execution, function deployment, or project deletion.
**Remediation:** Rotate at supabase.com/dashboard/account/tokens immediately.

---

## HIGH FINDINGS

### SEC-H-001 — .env Previously Committed to Git History
**Severity:** HIGH
**OWASP:** A02:2025 / CWE-312
**File:** `git log -- .env` [VERIFIED]
**Finding:** Git log shows `.env` was committed in commit `92224a6` (referenced in `c89fd9f6` message: "Deleted .env file from repository (contained Supabase credentials)"). The file existed in git history before removal.
**Evidence:** `git log --oneline -- .env` returns `c89fd9f6` and `838af7cf` [VERIFIED]. `c89fd9f6` message references original commit `92224a6`.
**Impact:** Any clone of the repository before the removal commit retains the `.env` with credentials. If credentials were not rotated after the exposure (the commit message states "LOW actual risk — anon keys only" but the current `.env` contains SERVICE_ROLE and PAT — those must be verified as rotated), full exposure persists in history.
**Remediation:** Run `git filter-repo` or BFG Repo Cleaner to purge `.env` from all history. Force-push. Rotate ALL credentials regardless of whether they appear to be anon-only.

---

### SEC-H-002 — SSRF Fix (PR #1393) on Non-Main Branch
**Severity:** HIGH
**OWASP:** A10:2025 Server-Side Request Forgery / CWE-918
**File:** `orchestrator/security/ssrf.py` [PROBABLE — referenced in CURRENT_PLATFORM_STATE_2026_06_14.md]
**Finding:** IPv4-mapped IPv6 SSRF bypass was present and active in `_check_ip()`. Python's `ipaddress` marked `::ffff:0:0/96` as `is_reserved=True`, allowing loopback (`::ffff:127.0.0.1`) and private (`::ffff:10.0.0.1`) addresses to bypass SSRF protection with wrong classifications. Fix was in PR #1393 targeting `main`. The audited local branch (`apex/omnihub/defcon4-clean-remediation`) is 9 commits behind origin and may not include this fix.
**Evidence:** CURRENT_PLATFORM_STATE_2026_06_14.md § "PR #1393" [VERIFIED]. Branch lag confirmed via `git status`.
**Remediation:** Fast-forward local branch to origin HEAD. Verify `ssrf.py` contains the `ipv4_mapped` guard before `is_reserved` check.

---

### SEC-H-003 — SonarCloud Hotspot Suppressions Without Secondary Review
**Severity:** HIGH
**OWASP:** A05:2025 Security Misconfiguration
**File:** `sonar-project.properties:hotspot1–hotspot10` [VERIFIED]
**Finding:** 10 SonarCloud security hotspots are suppressed via `sonar.issue.ignore.multicriteria`. Each has a documented rationale, but none reference an external secondary reviewer. Suppressions include `typescript:S2245` (PRNG), `typescript:S5547` (weak crypto), `typescript:S5332` (cleartext), and `python:S2076` (OS command injection surface).
**Evidence:** `sonar-project.properties` lines for hotspot1–hotspot10 [VERIFIED — file read directly]
**Impact:** The `python:S2076` suppression on `tools/rsi/build_evidence.py` means subprocess calls are not re-flagged if the code changes. `typescript:S5332` on `supabase/functions/omnibridge-control/**` allows cleartext fetches to go unreported.
**Remediation:** Require secondary security review for any hotspot suppression. Add suppressions to a mandatory changelog reviewed each sprint.

---

## MEDIUM FINDINGS

### SEC-M-001 — `tenant_entitlements` Table Missing Migration (Latent SQL Injection Surface)
**Severity:** MEDIUM
**OWASP:** A03:2025 Injection / CWE-89
**File:** `src/omniconnect/entitlements/entitlements-service.ts` [VERIFIED — documented in DEBT_TRIAGE_2026-06-14.md]
**Finding:** `entitlements-service.ts` queries a `tenant_entitlements` table that has no defining migration in `supabase/migrations/`. The `as any` cast at this call site means TypeScript provides no type safety at the query boundary. If the table is created ad-hoc without RLS, it bypasses all tenant isolation policies.
**Remediation:** Create migration defining `tenant_entitlements` with RLS enabled and tenant-scoped policy. Add to `apex_db_rls_check` verification.

---

### SEC-M-002 — `removeEntity` Silent No-Op (Logic Bypass)
**Severity:** MEDIUM
**OWASP:** A04:2025 Insecure Design / CWE-670
**File:** `src/lib/spatial/useSpatialEngine.ts:removeEntity` [VERIFIED — DEBT_TRIAGE_2026-06-14.md]
**Finding:** `QuadTree.remove(point: Point<T>)` is called with a string `id` instead of a `Point<T>`. The call silently no-ops — entities are never removed from the spatial engine. This is a confirmed latent bug, not a type error caught at compile time.
**Impact:** Memory growth over time; potential data exposure if spatial engine is used for access-controlled spatial queries.
**Remediation:** Build `id → Point` index. Fix the removal call to pass the correct type.

---

### SEC-M-003 — byom-proxy Regex Key Validation in Source
**Severity:** MEDIUM (informational — correct pattern, location risk)
**OWASP:** A02:2025
**File:** `supabase/functions/byom-cockpit/index.ts:119-120`, `supabase/functions/byom-login/index.ts:27-28` [VERIFIED]
**Finding:** API key validation regexes (`/^sk-[A-Za-z0-9_-]{20,}$/`, `/^sk-ant-[A-Za-z0-9_-]{20,}$/`) are embedded in source. This is correct defensive programming (server-side validation), but the patterns also serve as a roadmap for API key format targeting.
**Remediation:** No immediate action — pattern is correct. Monitor for ReDoS exposure (current regex is linear — no backtracking issue identified).

---

### SEC-M-004 — E2E Test Email Hardcoded in `.env`
**Severity:** MEDIUM
**OWASP:** A07:2025
**File:** `.env:33` [VERIFIED]
**Finding:** `E2E_USER_EMAIL=jrmendozaceo@apexbusiness-systems.com` is a real operational email account used as an E2E test identity.
**Remediation:** Use a dedicated throwaway E2E test account. Do not test with production executive accounts.

---

## LOW FINDINGS

### SEC-L-001 — Service Role Key Correctly Server-Side Only
**Severity:** LOW (POSITIVE FINDING with caveat)
**File:** `supabase/functions/_shared/supabaseClient.ts:15`, `_shared/auth.ts:25` [VERIFIED]
**Finding:** All service role key consumption is via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — exclusively in Supabase edge functions (server-side Deno runtime). No client-side usage detected.
**Caveat:** The key IS on disk in `.env` (SEC-C-002). The code pattern is correct; the storage is not.

### SEC-L-002 — promptDefense.ts Detects API Key Leakage
**Severity:** LOW (POSITIVE FINDING)
**File:** `supabase/functions/_shared/promptDefense.ts:16` [VERIFIED]
**Finding:** Regex `/sk-[a-z0-9]{20,}/i` actively scans prompts for API key leakage. Same pattern in `_shared/voiceSafety.ts:36`. Defense-in-depth is present.

### SEC-L-003 — SSRF Protection Module Present
**Severity:** LOW (POSITIVE FINDING)
**File:** `supabase/functions/_shared/ssrf-protection.ts` [VERIFIED]
**Finding:** Dedicated SSRF protection module with DNS resolution checks (`resolvePromise`, `resolvePromiseAAAA`). IPv4-mapped IPv6 fix in PR #1393 closes the bypass.

### SEC-L-004 — No Hardcoded Secrets in src/ TypeScript
**Severity:** LOW (POSITIVE FINDING)
**File:** `src/**/*.ts, src/**/*.tsx` [VERIFIED]
**Finding:** Grep for actual secret values (20+ char strings assigned to `apiKey`, `secret`, `token` etc.) in `src/` returned only constants, localStorage keys, display names, and task queue names — no live credentials. All secret access routes through `import.meta.env.VITE_*` or environment variables.

### SEC-L-005 — Smart Contract Pending Formal Audit
**Severity:** LOW
**File:** `contracts/APEXMembershipNFT.sol` [PROBABLE — referenced in prior audit]
**Finding:** ERC721 smart contract uses OpenZeppelin v5 + ReentrancyGuard. No formal third-party smart contract audit has been commissioned per prior audit findings.
**Remediation:** Commission formal audit before any mainnet deployment.

---

## INFO FINDINGS

| ID | Finding | Confidence |
|----|---------|-----------|
| SEC-I-001 | `src/security/promptDefense.ts` provides frontend-layer prompt injection defense | VERIFIED |
| SEC-I-002 | `src/zero-trust/deviceRegistry.ts` (515 lines) implements device fingerprinting for zero-trust | VERIFIED |
| SEC-I-003 | 88+ migrations — all additive (no DROP/TRUNCATE observed in migration listing) | PROBABLE |
| SEC-I-004 | GDPR, SOC2-readiness documentation present in `docs/compliance/` | PROBABLE |

---

## OWASP TOP 10:2025 SURFACE MAP

| OWASP Category | Status | Key Finding |
|----------------|--------|-------------|
| A01 Broken Access Control | MEDIUM RISK | tenant_entitlements missing migration (SEC-M-001) |
| A02 Cryptographic Failures | CRITICAL | SEC-C-001 through SEC-C-006 — 6 live credential exposures |
| A03 Injection | MEDIUM | Missing migration creates unguarded query surface |
| A04 Insecure Design | MEDIUM | removeEntity silent no-op |
| A05 Security Misconfiguration | HIGH | 10 SonarCloud hotspot suppressions without secondary review |
| A06 Vulnerable Components | LOW | HIGH CVEs patched via overrides; npm audit 0 HIGH+ |
| A07 Auth Failures | CRITICAL | Service role key + PAT on disk |
| A08 Software Integrity | LOW | Hotspot suppressions on CI actions |
| A09 Logging Failures | INFO | Audit log present; persistence to Postgres noted as backlog |
| A10 SSRF | HIGH | IPv4-mapped IPv6 bypass patched in PR #1393 (branch lag risk) |

---

*AGENT_2 COMPLETE — 22 security findings: 6 CRITICAL, 3 HIGH, 4 MEDIUM, 5 LOW, 4 INFO*
