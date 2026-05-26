# Security and Compliance Audit
**Version:** 1.0.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Active & Grounded

**Repository:** `APEX-OmniHub` | **Product Area:** PhysiOmni & Omni-Recall

---

## 1. Executive Summary

This compliance audit outlines the security protocols, linter constraints, and automated check remediations implemented to secure the `feat/physiomni-pilot-cockpit` branch. All repository rule violations and static analysis hurdles have been systematically analyzed, verified, and resolved.

---

## 2. Ingested Audits & Remediations

### Audit A: GitHub Push Protection Secret Redaction
- **Severity:** CRITICAL (Push Blocked by remote hook `GH013`)
- **Vulnerability:** Raw `SUPABASE_TOKEN_AOID` secret token was accidentally included in `wiki/source_indexes/omni-recall-source-index.md` during versioning updates.
- **Remediation:** 
  1. Redacted the raw token and replaced it with a masked, secure placeholder: `sbp_411dc5...[REDACTED_SECURE]`.
  2. Executed `git commit --amend --no-edit` to completely purge the secret value from the git history of the HEAD commit.
  3. Re-pushed to the remote repository. Push successfully completed and was accepted by GitHub with zero push protection blocks.

### Audit B: Additive Migrations Linter Constraints
- **Severity:** HIGH (CI Blocked in `build-and-test` workflow)
- **Violation:** `supabase/migrations/20260526000000_physiomni_pilot_init.sql` violated rule `ON_DELETE_CASCADE` on lines 22 and 134.
- **Root Cause:** The allowlist exception comments `-- additive-allow: ON_DELETE_CASCADE <reason>` were written on the **same line** as the constraint declarations. The static analysis checker `check-additive-migrations.ts` strips out single-line comments before running match regex, and checks the **immediately preceding line** for the allowlist trigger.
- **Remediation:** 
  1. Moved the comments to the line immediately preceding the foreign key declarations.
  2. Verified locally via `bun run scripts/ci/check-additive-migrations.ts` -> returned exit code 0 (`0 violations found`).

### Audit C: PR Architecture & RFC Governance Compliance
- **Severity:** HIGH (CI Blocked in `rfc-architecture-marker` workflow)
- **Violation:** Changed files matching database migrations or edge functions triggered the architecture governance gate, requiring an active RFC link in the PR description body.
- **Remediation:** 
  1. Added a valid, case-insensitive mapping to the Pull Request body: `- **RFC Link:** https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1205`.
  2. Verified this successfully triggers and satisfies the GitHub Action regex checker.

---

## 3. Database Security Posture (RLS & Invoker Rules)

To align with **APEX-Fortress** security standards, the local DDL migration script implements the following policies:
- **RLS Enabled:** Declared `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all three tables (`physiomni_devices`, `physiomni_telemetry`, `physiomni_alerts`).
- **Tenant Scope:** Configured `authenticated` role policy statements to strictly restrict read/write boundaries using `tenant_id = auth.uid()`.
- **Trigger Security:** Configured database trigger functions with `SECURITY DEFINER` and explicitly pinned `search_path = public` to prevent search path hijacking exploits.
- **Supabase Realtime Scope:** Enabled Realtime publication safely on `physiomni_alerts` to support client-side push notification dashboards without exposing raw database tables.
