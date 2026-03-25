<!-- APEX_DOC_STAMP: VERSION=v1.5.1-LOGIN-HOTFIX | LAST_UPDATED=2026-03-25 -->
# Incident Response Playbook

**Version:** 1.1.0
**Last Updated:** 2026-03-25

## 1. Severity Levels

| Level     | Severity | Criteria                                  | Response Time |
| --------- | -------- | ----------------------------------------- | ------------- |
| **SEV-1** | Critical | Service Down, Data Loss, Security Breach  | < 15 mins     |
| **SEV-2** | High     | Core Feature Broken, Performance Degraded | < 1 hour      |
| **SEV-3** | Medium   | Minor Bug, UI Issue, Non-Blocking         | < 4 hours     |
| **SEV-4** | Low      | Documentation, Typos, Suggestions         | < 24 hours    |

## 2. Response Workflow

### Phase 1: Detection & Triage

1.  **Alert Received**: OmniSentry, User Report, or Automated Monitoring.
2.  **Verify**: Confirm the issue is real (not a false positive).
3.  **Classify**: Assign Severity Level (SEV-1 to SEV-4).
4.  **Declare**: Open an Incident Ticket (Jira/Linear) and Slack Channel (`#inc-YYYYMMDD-name`).

### Phase 2: Containment & Mitigation

1.  **Rollback**: If caused by a recent deploy, immediate rollback (`vercel rollback`).
2.  **Isolate**: If security breach, revoke tokens, block IPs, or enable Maintenance Mode.
3.  **Communicate**: Update Status Page (`status.apexomnihub.icu`) with "Investigating".

### Phase 3: Resolution

1.  **Debug**: Use "One-Pass-Debug" protocol.
2.  **Fix**: Apply surgical fix.
3.  **verify**: Test in staging, then deploy to production.

### Phase 4: Post-Mortem

1.  **Review**: What happened? Why? How to prevent recurrence?
2.  **Action Items**: Create tasks to fix root cause and improve monitoring.
3.  **Report**: Publish internal (and external if public impact) report within 24 hours.

## 3. Contacts

- **Incident Commander**: CTO / Lead Engineer
- **Security Lead**: Security Officer
- **Support**: support@apexomnihub.icu

---

## 4. Incident Log

### INC-20260325-LOGIN — Login Permanently Unavailable (SEV-1)

| Field | Value |
|-------|-------|
| **Severity** | SEV-1 (Critical — Service Down) |
| **Status** | RESOLVED |
| **Detected** | 2026-03-25 |
| **Resolved** | 2026-03-25 (PR #920) |
| **Impact** | All user authentication blocked — email sign-in, Google OAuth, Apple OAuth |
| **Affected URL** | `apexomnihub.icu/login` |
| **Error Displayed** | "Login is unavailable. Trace: cfg-u2tyaegy" |

#### Root Cause Analysis

Three independent failures converged:

1. **`wrangler.toml` env var scoping (PRIMARY):** Empty `[env.production]` and `[env.preview]` sections in `wrangler.toml` caused Cloudflare Pages to not inject dashboard environment variables into the Vite build process. `import.meta.env.VITE_SUPABASE_URL` compiled to empty string `""`, causing `hasSupabaseConfig` to evaluate as `false` permanently. **Evidence:** Production JS bundle (`index-C6yqaWwt.js`) contained `placeholder.supabase.co` instead of `rtopreovkywofgwgmozi.supabase.co`. CF Pages build logs showed `Build environment variables: (none found)`.

2. **Missing `icon.png` in root `public/` (SECONDARY):** Cloudflare Pages builds from the monorepo root (`root_dir: ""`), so Vite serves static assets from `/public/` at root. The `icon.png` only existed in `apps/omnihub-site/public/`, resulting in a 404 and broken image on the login page.

3. **Cryptic error message (UX):** The error "Login is unavailable. Trace: cfg-xxx" gave users and administrators zero actionable guidance.

#### Fix Applied

- Removed empty `[env.*]` sections from `wrangler.toml` to restore CF Pages env var injection
- Copied `icon.png` to root `public/` directory
- Added inline SVG fallback with `onError` handler
- Added proactive `role="alert"` banner showing exact env var names and Cloudflare Pages setup instructions
- Added 43 regression tests (`tests/login-page-fixes.test.ts`)

#### Prevention Measures

- `tests/login-page-fixes.test.ts` now asserts `wrangler.toml` has no `[env.production]` or `[env.preview]` sections
- `tests/login-page-fixes.test.ts` asserts no real Supabase credentials in `wrangler.toml`
- Login page proactively shows missing config banner (doesn't wait for user to click Sign In)
- Developer Onboarding doc updated with `wrangler.toml` warning
