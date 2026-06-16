// Tests for containsServiceRoleJwt helper in scripts/secret-scan.mjs
// Uses Node.js built-in assert — no vitest, no external dependencies.

import assert from 'node:assert/strict';
import { containsServiceRoleJwt } from '../../scripts/secret-scan.mjs';

/**
 * Build a synthetic JWT with the given payload object.
 * Header is a fixed non-real value; signature is a fixed placeholder.
 * These tokens are NOT real credentials — they are constructed only for unit testing.
 */
function makeSyntheticJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .toString('base64url');
  const body = Buffer.from(JSON.stringify(payload))
    .toString('base64url');
  // Signature is a synthetic fixed value — not a valid HMAC
  const sig = Buffer.from('synthetic-test-signature').toString('base64url');
  return `${header}.${body}.${sig}`;
}

// Test 1: JWT with role=service_role must be detected
{
  const jwt = makeSyntheticJwt({ iss: 'supabase', role: 'service_role', iat: 1 });
  const content = `const serviceRoleKey = "${jwt}";`;
  assert.equal(
    containsServiceRoleJwt(content),
    true,
    'Test 1 failed: should detect service_role JWT'
  );
  console.log('Test 1 passed: service_role JWT correctly detected');
}

// Test 2: JWT with role=anon must NOT be flagged
{
  const jwt = makeSyntheticJwt({ iss: 'supabase', role: 'anon', iat: 1 });
  const content = `const anonKey = "${jwt}";`;
  assert.equal(
    containsServiceRoleJwt(content),
    false,
    'Test 2 failed: should NOT detect anon JWT as service_role'
  );
  console.log('Test 2 passed: anon JWT correctly ignored');
}

console.log('All secret-scan self-tests passed.');
