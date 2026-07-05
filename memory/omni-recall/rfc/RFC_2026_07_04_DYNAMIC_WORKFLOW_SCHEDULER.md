# RFC: Dynamic Workflow Scheduler URL Resolution

**Date:** 2026-07-04
**Author:** APEX-Antigravity

## Background
The Supabase workflow scheduler was using a hardcoded `project_url` for the cron job dependency. This caused issues when deploying to different environments (staging vs production), as the cron job would point to the hardcoded URL instead of the current environment's URL.

## Solution
A new forward migration (`20260704184149_dynamic_workflow_scheduler_url.sql`) was created.
This migration updates the `dispatch_scheduled_workflows` function to dynamically read the `project_url` from `vault.decrypted_secrets`, matching the pattern used for `cron_shared_secret`.

## Operational Impact
When provisioning a new environment, the `project_url` secret must be inserted into the vault:
```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
```
This enables the cron scheduler to dynamically resolve the correct Edge Function invocation URL.
