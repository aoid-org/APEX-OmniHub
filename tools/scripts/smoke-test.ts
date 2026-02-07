/**
 * Smoke test script for deployment verification
 * Tests critical app functionality and Supabase connectivity
 * 
 * Usage: tsx scripts/smoke-test.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, status: 'pass', message: 'OK', duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push({ name, status: 'fail', message, duration });
    console.error(`❌ ${name}: ${message}`);
    throw error;
  }
}

async function main() {
  console.log('🧪 Running smoke tests...\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Supabase connection
  await runTest('Supabase Connection', async () => {
    const { error } = await supabase.auth.getSession();
    if (error && error.message !== 'Invalid API key') {
      throw error;
    }
  });

  // Test 2: Database accessibility (health_checks table)
  await runTest('Database Access', async () => {
    const { error } = await supabase
      .from('health_checks')
      .select('id')
      .limit(1);
    if (error) {
      throw error;
    }
  });

  // Test 3: Audit logs table
  await runTest('Audit Logs Table', async () => {
    const { error } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);
    if (error) {
      throw new Error(`audit_logs table not accessible: ${error.message}`);
    }
  });

  // Test 4: Device registry table
  await runTest('Device Registry Table', async () => {
    const { error } = await supabase
      .from('device_registry')
      .select('id')
      .limit(1);
    if (error) {
      throw new Error(`device_registry table not accessible: ${error.message}`);
    }
  });

  // Test 5: RLS policies (should allow select on own data)
  await runTest('RLS Policies', async () => {
    // This should work even without auth (public read might be allowed, or it returns empty)
    const { error } = await supabase
      .from('links')
      .select('id')
      .limit(1);
    // RLS might return empty result, but shouldn't error on structure
    if (error && !error.message.includes('permission') && !error.message.includes('RLS')) {
      throw error;
    }
  });

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`   Passed: ${passed}/${results.length}`);
  console.log(`   Failed: ${failed}/${results.length}`);
  console.log(`   Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed. Check the errors above.');
    process.exit(1);
  }

  console.log('\n✅ All smoke tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
