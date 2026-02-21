<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# GDPR Data workflows

## Summary

APEX-OmniHub provides self-service tools and support workflows to comply with GDPR "Right to Access" (Export) and "Right to Erasure" (Deletion).

## 1. Data Export (Right to Access)

**User Action:**

1.  Navigate to **Settings > Account**.
2.  Click **"Export My Data"**.
3.  System generates a JSON/ZIP archive containing:
    - User Profile
    - Stored Resources/Entities
    - Audit Logs associated with User

**Technical Workflow:**

1.  Trigger `user-export-workflow` (Temporal).
2.  Collect data from Supabase (Auth, Public tables).
3.  Package into secure ZIP.
4.  Upload to secure Storage Bucket with short-lived (1h) download URL.
5.  Email URL to user.

## 2. Data Deletion (Right to Erasure)

**User Action:**

1.  Navigate to **Settings > Account**.
2.  Click **"Delete Account"** (Danger Zone).
3.  Confirm with password/2FA.

**Technical Workflow:**

1.  Trigger `user-deletion-workflow` (Temporal).
2.  **Soft Delete** (Immediate): Flag account as `deleted`, revoke access tokens.
3.  **Grace Period** (30 Days): Data retained for recovery.
4.  **Hard Delete** (Final):
    - Remove Auth User from Supabase.
    - Cascading delete on `public.users` and related tables.
    - Scrub logs of PII (keep anonymized metrics).
5.  Send "Goodbye" email confirmation.

## 3. Requesting Manual Assistance

If the self-service tools are unavailable, users may email `privacy@apexomnihub.icu`. Requests are processed within 30 days.
