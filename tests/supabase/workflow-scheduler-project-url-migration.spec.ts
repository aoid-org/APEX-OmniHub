/**
 * Workflow scheduler project URL migration — contract tests.
 *
 * No Supabase Postgres instance is available in this runner, so these tests
 * statically assert that the forward migration removes the scheduler's baked-in
 * production project URL and reads the Edge Function base URL from Vault.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/20260704230000_workflow_scheduler_vault_project_url.sql',
);

const sql = readFileSync(MIGRATION, 'utf8');

describe('workflow scheduler project_url migration', () => {
  it('replaces the dispatch function without editing the applied migration', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.dispatch_scheduled_workflows\(\)/);
    expect(sql).toMatch(/COMMENT ON FUNCTION public\.dispatch_scheduled_workflows/);
  });

  it('reads project_url from Supabase Vault at execution time', () => {
    expect(sql).toMatch(/SELECT decrypted_secret INTO project_url[\s\S]*FROM vault\.decrypted_secrets[\s\S]*WHERE name = 'project_url'/);
    expect(sql).toMatch(/project_url := rtrim\(btrim\(project_url\), '\/'\)/);
    expect(sql).toMatch(/url := project_url \|\| '\/functions\/v1\/execute-workflow'/);
  });

  it('fails closed when project_url is missing', () => {
    expect(sql).toMatch(/IF project_url IS NULL OR btrim\(project_url\) = '' THEN/);
    expect(sql).toMatch(/RAISE WARNING 'dispatch_scheduled_workflows: project_url not found in vault, skipping this run'/);
    expect(sql).toMatch(/RETURN;/);
  });

  it('preserves cron_shared_secret Vault lookup and X-Cron-Secret auth', () => {
    expect(sql).toMatch(/WHERE name = 'cron_shared_secret'/);
    expect(sql).toMatch(/'X-Cron-Secret', cron_secret/);
  });

  it('does not contain the production Supabase project URL literal', () => {
    expect(sql).not.toContain('https://rtopreovkywofgwgmozi.supabase.co');
    expect(sql).not.toMatch(/project_url TEXT := 'https:\/\//);
    expect(sql).not.toMatch(/url := 'https:\/\//);
  });

  it('normalizes the existing cron job command with cron.alter_job instead of unscheduling it', () => {
    expect(sql).toMatch(/FROM cron\.job[\s\S]*WHERE jobname = 'workflow-scheduler'/);
    expect(sql).toMatch(/cron\.alter_job\(/);
    expect(sql).toMatch(/command := \$\$SELECT public\.dispatch_scheduled_workflows\(\);\$\$/);
    expect(sql).not.toMatch(/cron\.unschedule\('workflow-scheduler'\)/);
    expect(sql).not.toMatch(/cron\.schedule\(/);
  });
});
