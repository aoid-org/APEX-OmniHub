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
// Table-Driven Tests (Reduces Duplication)
// ============================================================================

interface TestCase {
  name: string;
  url: string;
  shouldAllow: boolean;
  options?: Record<string, unknown>;
  errorReason?: string;
  skip?: boolean;
}

const testCases: TestCase[] = [
  // --- Valid URLs ---
  { name: 'valid public HTTP URL', url: 'http://example.com/webhook', shouldAllow: true },
  { name: 'valid public HTTPS URL', url: 'https://api.stripe.com/webhooks', shouldAllow: true },
  { name: 'URL with custom port', url: 'https://example.com:8443/callback', shouldAllow: true },
  {
    name: 'allowlisted private IP',
    url: 'http://192.168.1.100/webhook',
    shouldAllow: true,
    options: { allowlist: ['192.168.1.100'] },
  },
  {
    name: 'allowed private IP (option enabled)',
    url: 'http://192.168.1.1/',
    shouldAllow: true,
    options: { allowPrivate: true, resolveDns: false },
  },
  {
    name: 'allowed loopback (option enabled)',
    url: 'http://127.0.0.1/',
    shouldAllow: true,
    options: { allowLoopback: true },
  },
  // --- Invalid Protocols ---
  { name: 'blocks file:// protocol', url: 'file:///etc/passwd', shouldAllow: false, errorReason: 'Protocol' },
  { name: 'blocks ftp:// protocol', url: 'ftp://internal.server/file', shouldAllow: false },
  { name: 'blocks gopher:// protocol', url: 'gopher://127.0.0.1:1234/_GET', shouldAllow: false },

  // --- IPv4 Private Ranges (RFC 1918 & Special) ---
  { name: 'blocks 127.0.0.1 (loopback)', url: 'http://127.0.0.1:8080/', shouldAllow: false, errorReason: 'blocked range' },
  {
    name: 'blocks localhost',
    url: 'http://localhost:3000/',
    shouldAllow: false,
    options: { resolveDns: true },
  }, // Typically resolves to 127.0.0.1
  { name: 'blocks 10.0.0.0/8', url: 'http://10.1.2.3/', shouldAllow: false },
  { name: 'blocks 172.16.0.0/12', url: 'http://172.16.5.10/', shouldAllow: false },
  { name: 'blocks 172.31.255.255', url: 'http://172.31.255.255/', shouldAllow: false },
  { name: 'blocks 192.168.0.0/16', url: 'http://192.168.100.50/', shouldAllow: false },
  { name: 'blocks 169.254.0.0/16 (link-local)', url: 'http://169.254.1.1/', shouldAllow: false },
  { name: 'blocks 100.64.0.0/10 (carrier-grade NAT)', url: 'http://100.64.0.1/', shouldAllow: false },

  // --- Cloud Metadata ---
  { name: 'blocks AWS metadata', url: 'http://169.254.169.254/latest/meta-data/', shouldAllow: false, errorReason: 'blocked range' },
  { name: 'blocks AWS ECS metadata', url: 'http://169.254.170.2/v2/metadata', shouldAllow: false },

  // --- Alternative Encodings ---
  { name: 'blocks hex-encoded 127.0.0.1', url: 'http://0x7f000001/', shouldAllow: false }, // 0x7f000001
  { name: 'blocks decimal-encoded 127.0.0.1', url: 'http://2130706433/', shouldAllow: false }, // 2130706433
  { name: 'blocks octal-encoded 127.0.0.1', url: 'http://017700000001/', shouldAllow: false }, // 017700000001

  // --- IPv6 ---
  { name: 'blocks ::1 (IPv6 loopback)', url: 'http://[::1]:8080/', shouldAllow: false },
  { name: 'blocks fc00::/7 (IPv6 unique local)', url: 'http://[fc00::1]/', shouldAllow: false },
  { name: 'blocks fe80::/10 (IPv6 link-local)', url: 'http://[fe80::1]/', shouldAllow: false },
  {
    name: 'allows public IPv6 (Google DNS)',
    url: 'http://[2001:4860:4860::8888]/',
    shouldAllow: true,
    options: { resolveDns: false },
  },

  // --- Blocked Domains ---
  { name: 'blocks .local domains', url: 'http://server.local/', shouldAllow: false, errorReason: 'blocked suffix', options: { resolveDns: false } },
  { name: 'blocks .internal domains', url: 'http://api.internal/', shouldAllow: false, options: { resolveDns: false } },
  { name: 'blocks .test domains', url: 'http://example.test/', shouldAllow: false, options: { resolveDns: false } },
];

// Execute table-driven tests
testCases.forEach((tc) => {
  Deno.test({
    name: `SSRF: ${tc.name}`,
    ignore: tc.skip,
    fn: async () => {
      const result = await validateUrlForSsrf(tc.url, tc.options);
      assertEquals(result.allowed, tc.shouldAllow, `URL: ${tc.url} | Expected: ${tc.shouldAllow} | Actual: ${result.allowed} | Reason: ${result.reason}`);
      if (tc.errorReason && !result.allowed && result.reason) {
        assertEquals(result.reason.includes(tc.errorReason), true, `Error reason should contain "${tc.errorReason}"`);
      }
    },
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

Deno.test('assertUrlSafe: throws on blocked URL', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://127.0.0.1/'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe: succeeds on valid URL', async () => {
  await assertUrlSafe('https://example.com/webhook');
});

Deno.test('isUrlPotentiallySafe: quick validation works', () => {
  assertEquals(isUrlPotentiallySafe('https://example.com/'), true);
  assertEquals(isUrlPotentiallySafe('http://127.0.0.1/'), false);
  assertEquals(isUrlPotentiallySafe('file:///etc/passwd'), false);
  assertEquals(isUrlPotentiallySafe('http://server.local/'), false);
});
