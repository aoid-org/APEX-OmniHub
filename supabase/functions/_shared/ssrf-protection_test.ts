import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { assertUrlSafe } from './ssrf-protection.ts';

Deno.test('assertUrlSafe - blocks localhost', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://localhost:8080'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks 127.0.0.1', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://127.0.0.1'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks 0.0.0.0', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://0.0.0.0'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks IPv6 localhost', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://[::1]'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks private IP 192.168.x.x', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://192.168.1.1'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks private IP 10.x.x.x', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://10.0.0.1'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks private IP 172.16-31.x.x', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://172.16.0.1'),
    Error,
    'SSRF protection blocked request'
  );

  await assertRejects(
    async () => await assertUrlSafe('http://172.31.255.255'),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks .local domains', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://server.local', { resolveDns: false }),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks .internal domains', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://api.internal', { resolveDns: false }),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - allows public URLs', async () => {
  // Should not throw
  await assertUrlSafe('https://api.example.com');
  await assertUrlSafe('https://webhook.site/test');
  await assertUrlSafe('http://public-api.com:8080/endpoint');
});

Deno.test('assertUrlSafe - rejects invalid URLs', async () => {
  await assertRejects(
    async () => await assertUrlSafe('not-a-url'),
    Error,
    'Invalid URL format'
  );

  await assertRejects(
    async () => await assertUrlSafe(''),
    Error,
    'Invalid URL format'
  );
});

Deno.test('assertUrlSafe - handles URL with path and query', async () => {
  // Should not throw for valid public URL
  await assertUrlSafe('https://api.example.com/webhook?token=abc123');
});

Deno.test('assertUrlSafe - case insensitive domain checks', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://LOCALHOST', { resolveDns: false }),
    Error,
    'SSRF protection blocked request'
  );

  await assertRejects(
    async () => await assertUrlSafe('http://Server.LOCAL', { resolveDns: false }),
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - blocks link-local addresses', async () => {
  await assertRejects(
    async () => await assertUrlSafe('http://169.254.169.254'), // AWS metadata
    Error,
    'SSRF protection blocked request'
  );
});

Deno.test('assertUrlSafe - comprehensive edge cases', async () => {
  // Block variations
  const blockedUrls = [
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://0.0.0.0',
    'http://[::1]',
    'http://192.168.0.1',
    'http://10.10.10.10',
    'http://172.16.0.1',
    'http://172.20.0.1',
    'http://169.254.169.254',
    'http://server.local',
    'http://api.internal',
  ];

  for (const url of blockedUrls) {
    await assertRejects(
      async () => await assertUrlSafe(url, { resolveDns: url.includes('localhost') ? true : false }),
      Error,
      undefined // We allow generic error match as long as it throws
    );
  }

  // Allow public URLs
  const allowedUrls = [
    'https://api.example.com',
    'https://webhook.site',
    'http://8.8.8.8', // Public DNS
    'https://api.github.com',
    'https://example.com:443',
  ];

  for (const url of allowedUrls) {
    // Should not throw
    await assertUrlSafe(url);
  }
});
