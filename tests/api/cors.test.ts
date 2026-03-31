import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { loadAllowlist, isAllowedHost, isPrivateOrReservedIp, validateProxyUrl } from '../../api/cors'; // NOSONAR
import handler from '../../api/cors'; // NOSONAR

type EnvMap = Record<string, string | undefined>;

let originalEnv: EnvMap;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('api/cors - loadAllowlist', () => {
  it('returns an empty array when CORS_PROXY_ALLOWLIST is missing', () => {
    delete process.env['CORS_PROXY_ALLOWLIST'];
    expect(loadAllowlist()).toEqual([]);
  });

  it('returns an empty array when CORS_PROXY_ALLOWLIST is blank', () => {
    process.env['CORS_PROXY_ALLOWLIST'] = '   ';
    expect(loadAllowlist()).toEqual([]);
  });

  it('parses a single domain correctly', () => {
    process.env['CORS_PROXY_ALLOWLIST'] = 'example.com'; // NOSONAR
    expect(loadAllowlist()).toEqual(['example.com']); // NOSONAR
  });

  it('parses multiple comma-separated domains and trims whitespace', () => {
    process.env['CORS_PROXY_ALLOWLIST'] = 'example.com, assets.another.org , test.net'; // NOSONAR
    expect(loadAllowlist()).toEqual(['example.com', 'assets.another.org', 'test.net']); // NOSONAR
  });

  it('converts hostnames to lowercase', () => {
    process.env['CORS_PROXY_ALLOWLIST'] = 'Example.COM, TEST.Net'; // NOSONAR
    expect(loadAllowlist()).toEqual(['example.com', 'test.net']); // NOSONAR
  });

  it('filters out empty segments', () => {
    process.env['CORS_PROXY_ALLOWLIST'] = 'example.com,,test.net,'; // NOSONAR
    expect(loadAllowlist()).toEqual(['example.com', 'test.net']); // NOSONAR
  });
});

describe('api/cors - isAllowedHost', () => {
  const allowlist = ['example.com', 'assets.net']; // NOSONAR

  it('returns false when allowlist is empty', () => {
    expect(isAllowedHost('example.com', [])).toBe(false); // NOSONAR
  });

  it('matches exact hostnames', () => {
    expect(isAllowedHost('example.com', allowlist)).toBe(true); // NOSONAR
    expect(isAllowedHost('assets.net', allowlist)).toBe(true); // NOSONAR
  });

  it('matches subdomains', () => {
    expect(isAllowedHost('api.example.com', allowlist)).toBe(true); // NOSONAR
    expect(isAllowedHost('cdn.assets.net', allowlist)).toBe(true); // NOSONAR
    expect(isAllowedHost('deep.sub.domain.example.com', allowlist)).toBe(true); // NOSONAR
  });

  it('does not match unrelated hostnames', () => {
    expect(isAllowedHost('example.org', allowlist)).toBe(false); // NOSONAR
    expect(isAllowedHost('other-assets.net', allowlist)).toBe(false); // NOSONAR
  });

  it('is case-insensitive', () => {
    expect(isAllowedHost('EXAMPLE.COM', allowlist)).toBe(true); // NOSONAR
    expect(isAllowedHost('API.Example.Com', allowlist)).toBe(true); // NOSONAR
  });
});

describe('api/cors - isPrivateOrReservedIp', () => {
  it('blocks IPv4 loopback (127.0.0.0/8)', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('127.255.255.255')).toBe(true); // NOSONAR
  });

  it('blocks RFC 1918 private ranges', () => {
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true); // NOSONAR
  });

  it('blocks link-local / metadata ranges (169.254.0.0/16)', () => {
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('169.254.0.1')).toBe(true); // NOSONAR
  });

  it('blocks shared address space (100.64.0.0/10)', () => {
    expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('100.127.255.255')).toBe(true); // NOSONAR
  });

  it('blocks reserved zero block (0.0.0.0/8)', () => {
    expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('0.255.255.255')).toBe(true); // NOSONAR
  });

  it('blocks multicast and reserved ranges (224.0.0.0/4+)', () => {
    expect(isPrivateOrReservedIp('224.0.0.1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('239.255.255.255')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('240.0.0.0')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('255.255.255.255')).toBe(true); // NOSONAR
  });

  it('blocks IPv6 loopback and local ranges', () => {
    expect(isPrivateOrReservedIp('::1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('[::1]')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true); // NOSONAR
    expect(isPrivateOrReservedIp('fd00::1')).toBe(true); // NOSONAR
  });

  it('allows public IPs', () => {
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false); // NOSONAR
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false); // NOSONAR
    expect(isPrivateOrReservedIp('208.67.222.222')).toBe(false); // NOSONAR
    expect(isPrivateOrReservedIp('2001:4860:4860::8888')).toBe(false); // NOSONAR
  });

  it('ignores invalid formats', () => {
    expect(isPrivateOrReservedIp('not-an-ip')).toBe(false);
    expect(isPrivateOrReservedIp('1.2.3')).toBe(false);
    expect(isPrivateOrReservedIp('1.2.3.4.5')).toBe(false);
    expect(isPrivateOrReservedIp('256.0.0.1')).toBe(false); // NOSONAR
  });
});

describe('api/cors - validateProxyUrl', () => {
  const allowlist = ['example.com']; // NOSONAR

  it('rejects invalid URL formats', () => {
    const result = validateProxyUrl('not-a-url', allowlist); // NOSONAR
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain('Invalid URL format');
    }
  });

  it('rejects non-HTTPS protocols', () => {
    const result = validateProxyUrl('http://example.com/foo', allowlist); // NOSONAR
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain('Only HTTPS sources are allowed');
    }
  });

  it('rejects private IP hostnames', () => {
    const result = validateProxyUrl('https://127.0.0.1/foo', allowlist); // NOSONAR
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain('private or reserved IP ranges');
    }
  });

  it('rejects hostnames not on the allowlist', () => {
    const result = validateProxyUrl('https://malicious.com/foo', allowlist); // NOSONAR
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain('not on the proxy allowlist');
    }
  });

  it('accepts valid HTTPS URLs on the allowlist', () => {
    const result = validateProxyUrl('https://example.com/foo?bar=baz', allowlist); // NOSONAR
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe('https://example.com/foo?bar=baz'); // NOSONAR
      expect(result.hostname).toBe('example.com'); // NOSONAR
    }
  });
});

describe('api/cors handler', () => {
  beforeEach(() => {
    process.env['CORS_PROXY_ALLOWLIST'] = 'example.com'; // NOSONAR
  });

  it('handles OPTIONS request', async () => {
    const req = new Request('https://proxy.com/api/cors', { method: 'OPTIONS' }); // NOSONAR
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns 403 when allowlist is missing', async () => {
    delete process.env['CORS_PROXY_ALLOWLIST'];
    const req = new Request('https://proxy.com/api/cors?source=https://example.com'); // NOSONAR
    const res = await handler(req);
    expect(res.status).toBe(403);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('CORS proxy is not configured');
  });

  it('returns 400 when source parameter is missing', async () => {
    const req = new Request('https://proxy.com/api/cors'); // NOSONAR
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Missing required "source"');
  });

  it('returns 400 when source parameter is malformed', async () => {
    const req = new Request('https://proxy.com/api/cors?source=%E0%2'); // NOSONAR
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Malformed "source"');
  });

  it('returns error from validateProxyUrl', async () => {
    const req = new Request('https://proxy.com/api/cors?source=http://example.com'); // NOSONAR
    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain('Only HTTPS sources are allowed');
  });

  it('proxies successful requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('hello world', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    }));
    global.fetch = mockFetch; // NOSONAR

    const source = 'https://example.com/data'; // NOSONAR
    const req = new Request(`https://proxy.com/api/cors?source=${encodeURIComponent(source)}`); // NOSONAR
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello world');
    expect(mockFetch).toHaveBeenCalledWith(source, expect.anything()); // NOSONAR
    expect(res.headers.get('X-APEX-Request-Id')).toBeDefined();
  });

  it('handles redirect safety', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { 'Location': 'https://malicious.com/stolen' } // NOSONAR
      }));
    global.fetch = mockFetch; // NOSONAR

    const source = 'https://example.com/redirect'; // NOSONAR
    const req = new Request(`https://proxy.com/api/cors?source=${encodeURIComponent(source)}`); // NOSONAR
    const res = await handler(req);

    expect(res.status).toBe(403);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("Redirect to 'malicious.com' is not allowed"); // NOSONAR
  });
});
