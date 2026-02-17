/**
 * SSRF Protection Tests
 *
 * Tests defense against various SSRF attack vectors:
 * - Private IP ranges (IPv4 & IPv6)
 * - Alternative IP encodings
 * - DNS rebinding attacks
 * - Cloud metadata endpoints
 * - Blocked domain suffixes
 */

import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { validateUrlForSsrf, assertUrlSafe, isUrlPotentiallySafe } from './ssrf-protection.ts';

// ============================================================================
// Valid URLs (Should ALLOW)
// ============================================================================

Deno.test('SSRF: allows valid public HTTP URL', async () => {
  const result = await validateUrlForSsrf('http://example.com/webhook');
  assertEquals(result.allowed, true);
});

Deno.test('SSRF: allows valid public HTTPS URL', async () => {
  const result = await validateUrlForSsrf('https://api.stripe.com/webhooks');
  assertEquals(result.allowed, true);
});

Deno.test('SSRF: allows URL with custom port', async () => {
  const result = await validateUrlForSsrf('https://example.com:8443/callback');
  assertEquals(result.allowed, true);
});

Deno.test('SSRF: allows allowlisted private IP', async () => {
  const result = await validateUrlForSsrf('http://192.168.1.100/webhook', {
    allowlist: ['192.168.1.100'],
  });
  assertEquals(result.allowed, true);
});

// ============================================================================
// Invalid Protocols (Should BLOCK)
// ============================================================================

Deno.test('SSRF: blocks file:// protocol', async () => {
  const result = await validateUrlForSsrf('file:///etc/passwd');
  assertEquals(result.allowed, false);
  // @ts-ignore: string property
  assertEquals(result.reason?.includes('Protocol'), true);
});

Deno.test('SSRF: blocks ftp:// protocol', async () => {
  const result = await validateUrlForSsrf('ftp://internal.server/file');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks gopher:// protocol', async () => {
  const result = await validateUrlForSsrf('gopher://127.0.0.1:1234/_GET');
  assertEquals(result.allowed, false);
});

// ============================================================================
// IPv4 Private Ranges (Should BLOCK)
// ============================================================================

Deno.test('SSRF: blocks 127.0.0.1 (loopback)', async () => {
  const result = await validateUrlForSsrf('http://127.0.0.1:8080/');
  assertEquals(result.allowed, false);
  // @ts-ignore: string property
  assertEquals(result.reason?.includes('blocked range'), true);
});

Deno.test('SSRF: blocks localhost', async () => {
  const result = await validateUrlForSsrf('http://localhost:3000/', {
    resolveDns: true,
  });
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks 10.0.0.0/8', async () => {
  const result = await validateUrlForSsrf('http://10.1.2.3/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks 172.16.0.0/12', async () => {
  const result = await validateUrlForSsrf('http://172.16.5.10/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks 172.31.255.255 (end of range)', async () => {
  const result = await validateUrlForSsrf('http://172.31.255.255/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks 192.168.0.0/16', async () => {
  const result = await validateUrlForSsrf('http://192.168.100.50/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks 169.254.0.0/16 (link-local)', async () => {
  const result = await validateUrlForSsrf('http://169.254.1.1/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks 100.64.0.0/10 (carrier-grade NAT)', async () => {
  const result = await validateUrlForSsrf('http://100.64.0.1/');
  assertEquals(result.allowed, false);
});

// ============================================================================
// Cloud Metadata Endpoints (Should BLOCK)
// ============================================================================

Deno.test('SSRF: blocks AWS metadata endpoint', async () => {
  const result = await validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
  assertEquals(result.allowed, false);
  // @ts-ignore: string property
  assertEquals(result.reason?.includes('blocked range'), true);
});

Deno.test('SSRF: blocks AWS ECS metadata', async () => {
  const result = await validateUrlForSsrf('http://169.254.170.2/v2/metadata');
  assertEquals(result.allowed, false);
});

// ============================================================================
// Alternative IP Encodings (Should BLOCK)
// ============================================================================

Deno.test('SSRF: blocks hex-encoded 127.0.0.1', async () => {
  // 0x7f000001 = 127.0.0.1
  const result = await validateUrlForSsrf('http://0x7f000001/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks decimal-encoded 127.0.0.1', async () => {
  // 2130706433 = 127.0.0.1
  const result = await validateUrlForSsrf('http://2130706433/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks octal-encoded 127.0.0.1', async () => {
  // 017700000001 = 127.0.0.1
  const result = await validateUrlForSsrf('http://017700000001/');
  assertEquals(result.allowed, false);
});

// ============================================================================
// IPv6 Addresses (Should BLOCK private/loopback)
// ============================================================================

Deno.test('SSRF: blocks ::1 (IPv6 loopback)', async () => {
  const result = await validateUrlForSsrf('http://[::1]:8080/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks fc00::/7 (IPv6 unique local)', async () => {
  const result = await validateUrlForSsrf('http://[fc00::1]/');
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks fe80::/10 (IPv6 link-local)', async () => {
  const result = await validateUrlForSsrf('http://[fe80::1]/');
  assertEquals(result.allowed, false);
});

// Note: IPv6 resolution might fail in some test environments without IPv6 support.
// We only test that if it DOES resolve to public, it's allowed.
Deno.test('SSRF: allows public IPv6 (if resolvable/valid)', async () => {
  // This might be tricky if the environment has no IPv6, but the logic allows it.
  // Using an explicit public IPv6 literal.
  // 2001:4860:4860::8888 is Google DNS
  const result = await validateUrlForSsrf('http://[2001:4860:4860::8888]/', {
    resolveDns: false,
  });
  assertEquals(result.allowed, true);
});

// ============================================================================
// Blocked Domain Suffixes (Should BLOCK)
// ============================================================================

Deno.test('SSRF: blocks .local domains', async () => {
  const result = await validateUrlForSsrf('http://server.local/', {
    resolveDns: false,
  });
  assertEquals(result.allowed, false);
  // @ts-ignore: string property
  assertEquals(result.reason?.includes('blocked suffix'), true);
});

Deno.test('SSRF: blocks .internal domains', async () => {
  const result = await validateUrlForSsrf('http://api.internal/', {
    resolveDns: false,
  });
  assertEquals(result.allowed, false);
});

Deno.test('SSRF: blocks .test domains (RFC 6761)', async () => {
  const result = await validateUrlForSsrf('http://example.test/', {
    resolveDns: false,
  });
  assertEquals(result.allowed, false);
});

// ============================================================================
// Utility Functions
// ============================================================================

Deno.test('assertUrlSafe: throws on blocked URL', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://127.0.0.1/'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe: succeeds on valid URL', async () => {
  // Should not throw
  await assertUrlSafe('https://example.com/webhook');
});

Deno.test('isUrlPotentiallySafe: quick validation works', () => {
  assertEquals(isUrlPotentiallySafe('https://example.com/'), true);
  assertEquals(isUrlPotentiallySafe('http://127.0.0.1/'), false);
  assertEquals(isUrlPotentiallySafe('file:///etc/passwd'), false);
  assertEquals(isUrlPotentiallySafe('http://server.local/'), false);
});

// ============================================================================
// Options Testing
// ============================================================================

Deno.test('SSRF: allowPrivate option works', async () => {
  const result = await validateUrlForSsrf('http://192.168.1.1/', {
    allowPrivate: true,
    resolveDns: false,
  });
  assertEquals(result.allowed, true);
});

Deno.test('SSRF: allowLoopback option works', async () => {
  const result = await validateUrlForSsrf('http://127.0.0.1/', {
    allowLoopback: true,
  });
  assertEquals(result.allowed, true);
});
