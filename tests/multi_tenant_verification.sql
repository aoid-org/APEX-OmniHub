-- Multi-Tenant Verification Tests
-- Tests for APEX-OmniHub Multi-Tenant Genesis migration

-- Test 1: Privilege Escalation (Armageddon Battery 11)
-- Verify RLS policies prevent cross-tenant data access

-- Setup: Create two tenants with different users
INSERT INTO tenants (id, name) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B');

INSERT INTO tenant_members (user_id, tenant_id, role) VALUES
  ('user-a-uuid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('user-b-uuid', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin');

-- Insert test data
INSERT INTO audit_logs (tenant_id, actor_id, action, resource_type)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user-a-uuid', 'CREATE', 'document'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b-uuid', 'CREATE', 'document');

-- Test: User A attempts to read Tenant B's data (should return 0 rows)
-- This test simulates JWT claims injection
SET request.jwt.claims = '{"app_metadata": {"tenants": [{"tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}]}}';

SELECT COUNT(*) AS accessible_rows 
FROM audit_logs 
WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Test 2: Idempotency Chaos (Armageddon Battery 02)
-- Verify same idempotency_key can exist in different tenants

-- Insert identical idempotency keys in different tenants
INSERT INTO idempotency_receipts (idempotency_key, tenant_id, correlation_id, event_type)
VALUES 
  ('test-key-123', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corr-a', 'workflow_start'),
  ('test-key-123', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'corr-b', 'workflow_start');

-- Verify both records exist (no collision)
SELECT COUNT(*) as total_records
FROM idempotency_receipts 
WHERE idempotency_key = 'test-key-123';

-- Test 3: Tenant Data Backfill
-- Verify personal tenant generation for existing users

-- Create test user without tenant membership
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('test-user-123', 'test@example.com', '{"full_name": "Test User"}');

-- Run backfill logic (simulated)
-- This would normally be done by the migration script
INSERT INTO tenants (id, name)
SELECT gen_random_uuid(), 
       COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User ' || u.id::text) || '''s Personal Workspace'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_members tm 
  WHERE tm.user_id = u.id
)
AND u.id = 'test-user-123';

INSERT INTO tenant_members (user_id, tenant_id, role)
SELECT u.id, t.id, 'admin'
FROM auth.users u
CROSS JOIN tenants t
WHERE u.id = 'test-user-123'
AND t.name LIKE '%Test User%';

-- Verify user now has personal tenant
SELECT COUNT(*) as tenant_count
FROM tenant_members tm
JOIN tenants t ON tm.tenant_id = t.id
WHERE tm.user_id = 'test-user-123';

-- Test 4: JWT Hook Verification
-- Verify custom_access_token_hook function exists and is properly configured

-- Check function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook';

-- Check function has SECURITY DEFINER
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook'
AND prosecdef = true;

-- Test 5: RLS Policy Verification
-- Verify JWT-based RLS policies are active

-- Check RLS is enabled on tables
SELECT relname, relrowsecurity
FROM pg_class 
WHERE relname IN ('idempotency_receipts', 'audit_logs', 'man_tasks', 'omnitrace_runs', 'omnitrace_events')
AND relkind = 'r';

-- Check policy names
SELECT schemaname, tablename, policyname, permissive, roles
FROM pg_policies 
WHERE tablename IN ('idempotency_receipts', 'audit_logs', 'man_tasks', 'omnitrace_runs', 'omnitrace_events')
ORDER BY tablename, policyname;

-- Test 6: Composite Key Constraint
-- Verify idempotency composite key prevents cross-tenant collisions

-- Test constraint violation within same tenant
INSERT INTO idempotency_receipts (idempotency_key, tenant_id, correlation_id, event_type)
VALUES ('duplicate-key', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corr-1', 'test');

-- This should fail with unique constraint violation
INSERT INTO idempotency_receipts (idempotency_key, tenant_id, correlation_id, event_type)
VALUES ('duplicate-key', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corr-2', 'test');

-- But this should succeed (different tenant)
INSERT INTO idempotency_receipts (idempotency_key, tenant_id, correlation_id, event_type)
VALUES ('duplicate-key', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'corr-3', 'test');

-- Test 7: Tenant Enforcement
-- Verify NOT NULL constraints are enforced

-- Test inserting NULL tenant_id (should fail)
INSERT INTO idempotency_receipts (idempotency_key, tenant_id, correlation_id, event_type)
VALUES ('null-test', NULL, 'corr-4', 'test');

-- Test 8: MAN Task Tenant Isolation
-- Verify MAN tasks are properly scoped to tenants

INSERT INTO man_tasks (workflow_id, step_id, status, intent, tenant_id)
VALUES 
  ('wf-tenant-a', 'step-1', 'PENDING', '{"tool": "test"}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('wf-tenant-b', 'step-1', 'PENDING', '{"tool": "test"}', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Verify tasks are isolated
SELECT COUNT(*) as tenant_a_tasks
FROM man_tasks 
WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT COUNT(*) as tenant_b_tasks  
FROM man_tasks 
WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Test 9: Zero-Downtime Validation
-- Verify no blocking operations during migration

-- Check for long-running locks (should be 0)
SELECT count(*) as blocking_queries
FROM pg_stat_activity 
WHERE wait_event_type = 'Lock' 
  AND query NOT LIKE '%pg_stat_activity%';

-- Test 10: Sentinel Tenant Handling
-- Verify orphaned data handling

-- Create orphaned data (simulated)
INSERT INTO idempotency_receipts (idempotency_key, tenant_id, correlation_id, event_type)
VALUES ('orphaned-key', NULL, 'orphaned-corr', 'test');

-- Verify sentinel tenant exists
SELECT COUNT(*) as sentinel_exists
FROM tenants 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Cleanup test data
DELETE FROM man_tasks WHERE workflow_id LIKE 'wf-tenant-%';
DELETE FROM idempotency_receipts WHERE idempotency_key LIKE 'test-key-%' OR idempotency_key LIKE 'duplicate-%';
DELETE FROM audit_logs WHERE actor_id LIKE 'user-%-uuid';
DELETE FROM tenant_members WHERE user_id = 'test-user-123';
DELETE FROM tenants WHERE name LIKE '%Personal Workspace%';
DELETE FROM tenants WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
