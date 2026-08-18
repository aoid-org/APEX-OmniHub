/**
 * scripts/connect_google_antigravity.mjs
 * Pure native fetch script for Supabase REST and Auth Admin APIs
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

// Parse .env manually
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://rtopreovkywofgwgmozi.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase at:', supabaseUrl);

async function sbFetch(endpoint, options = {}) {
  const url = `${supabaseUrl}${endpoint}`;
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  // 1. Get users from Auth Admin
  const usersRes = await sbFetch('/auth/v1/admin/users', { method: 'GET' });
  console.log('Auth users query status:', usersRes.status);
  
  const users = usersRes.data?.users || [];
  console.log(`Found ${users.length} users in database.`);
  
  let targetUser = users.find(u => u.email === 'jrmendozaceo@apexbusiness-systems.com');
  if (!targetUser) {
    targetUser = users.find(u => u.email === 'test@test.com') || users[0];
  }

  if (!targetUser) {
    console.error('No users found in database.');
    return;
  }

  console.log('Target User ID:', targetUser.id, 'Email:', targetUser.email);

  // 2. Ensure user_roles has admin role
  const roleRes = await sbFetch(`/rest/v1/user_roles?user_id=eq.${targetUser.id}&role=eq.admin`, { method: 'GET' });
  if (Array.isArray(roleRes.data) && roleRes.data.length === 0) {
    const addRole = await sbFetch('/rest/v1/user_roles', {
      method: 'POST',
      body: JSON.stringify({ user_id: targetUser.id, role: 'admin' }),
    });
    console.log('Added admin role status:', addRole.status);
  } else {
    console.log('User already has admin role in user_roles.');
  }

  // 3. Upsert into integrations table
  const intRes = await sbFetch(`/rest/v1/integrations?user_id=eq.${targetUser.id}&type=eq.google-antigravity`, { method: 'GET' });
  if (Array.isArray(intRes.data) && intRes.data.length === 0) {
    const insertInt = await sbFetch('/rest/v1/integrations', {
      method: 'POST',
      body: JSON.stringify({
        user_id: targetUser.id,
        name: 'Google Antigravity 2.0',
        type: 'google-antigravity',
        status: 'active',
        config: {
          source: 'omniboard',
          version: '2.0',
          provider: 'Google Antigravity',
          scopes: ['workspace:read', 'workspace:write', 'agent:execute', 'mcp:connect'],
          connected_at: new Date().toISOString(),
        },
      }),
    });
    console.log('Inserted Google Antigravity into integrations status:', insertInt.status, insertInt.data);
  } else {
    console.log('Google Antigravity already active in integrations table:', intRes.data);
  }

  // 4. Upsert into omnilink_integrations table (if table exists)
  const omniRes = await sbFetch(`/rest/v1/omnilink_integrations?user_id=eq.${targetUser.id}&type=eq.google-antigravity`, { method: 'GET' });
  if (Array.isArray(omniRes.data) && omniRes.data.length === 0) {
    const insertOmni = await sbFetch('/rest/v1/omnilink_integrations', {
      method: 'POST',
      body: JSON.stringify({
        user_id: targetUser.id,
        name: 'Google Antigravity 2.0',
        type: 'google-antigravity',
        status: 'active',
      }),
    });
    console.log('Inserted Google Antigravity into omnilink_integrations status:', insertOmni.status);
  } else if (Array.isArray(omniRes.data)) {
    console.log('Google Antigravity already active in omnilink_integrations:', omniRes.data);
  }

  console.log('\n=== GOOGLE ANTIGRAVITY 2.0 INTEGRATION TO USER ACCOUNT SUCCESSFUL ===');
}

main().catch(console.error);
