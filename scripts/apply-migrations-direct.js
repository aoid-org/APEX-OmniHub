#!/usr/bin/env node

/**
 * Apply Migrations Directly to Supabase
 * Uses Supabase REST API to execute SQL migrations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://rtopreovkywofgwgmozi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0b3ByZW92a3l3b2Znd2dtb3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQzNDE5MCwiZXhwIjoyMDgxMDEwMTkwfQ.Lk6rjfJsenqw0QctpVlxPqjZkFOkoIwxQz1NigW7d-k';

/**
 * Execute SQL via Supabase SQL endpoint (if available)
 */
function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'rtopreovkywofgwgmozi.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/query_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting migration process...');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  const migrations = [
    '20260205000000_unify_admin_system.sql',
    '20260205000001_omnidash_paid_access.sql'
  ];

  for (const migrationFile of migrations) {
    const filePath = path.join(migrationsDir, migrationFile);

    console.log('======================================================================');
    console.log(`Applying migration: ${migrationFile}`);
    console.log('======================================================================');

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 Size: ${sqlContent.length} bytes`);

    try {
      const result = await executeSQL(sqlContent);
      console.log('✅ Migration applied successfully');
      console.log('');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('');
      console.log('💡 Fallback: Apply manually via Supabase Dashboard SQL Editor');
      console.log(`   1. Go to: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`);
      console.log(`   2. Copy contents of: ${filePath}`);
      console.log('   3. Paste and click "Run"');
      console.log('');
      process.exit(1);
    }
  }

  console.log('======================================================================');
  console.log('✅ All migrations applied successfully!');
  console.log('======================================================================');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run diagnostic script: scripts/diagnose-production-issue.sql');
  console.log('2. Grant yourself access: scripts/emergency-access-fix.sql');
  console.log('3. Test the application');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
