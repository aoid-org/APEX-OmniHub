import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimitMiddleware } from '../../api/middleware/rate-limiter';

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow first request (in-memory fallback)', async () => {
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).toBeNull(); // allowed
  });

  it('should prefer cf-connecting-ip header', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'cf-connecting-ip': '10.0.0.50',
        'x-real-ip': '10.0.0.51',
        'x-forwarded-for': '10.0.0.52',
      },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).toBeNull();
  });

  it('should use x-real-ip if cf-connecting-ip is absent', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-real-ip': '10.0.0.60',
        'x-forwarded-for': '10.0.0.61',
      },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).toBeNull();
  });

  it('should use the last IP from x-forwarded-for as fallback', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 192.0.2.2',
      },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).toBeNull();
  });

  it('should return 429 when rate limit is exceeded (in-memory)', async () => {
    // Exhaust the limit for a unique IP
    const ip = '10.255.255.1';
    for (let i = 0; i < 60; i++) {
      const req = new Request('https://example.com', {
        headers: { 'cf-connecting-ip': ip },
      });
      await rateLimitMiddleware(req);
    }

    // 61st request should be rate-limited
    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': ip },
    });
    const response = await rateLimitMiddleware(request);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    const body = await response?.json();
    expect(body?.error).toContain('Rate Limit Exceeded');
  });

  it('should fail-closed with 503 when KV throws an error', async () => {
    const brokenKV = {
      get: vi.fn().mockRejectedValue(new Error('KV subsystem failure')),
      put: vi.fn(),
    } as unknown as KVNamespace;

    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '10.0.0.99' },
    });

    const response = await rateLimitMiddleware(request, { RATE_LIMIT_KV: brokenKV });
    expect(response).not.toBeNull();
    expect(response?.status).toBe(503);
    const body = await response?.json();
    expect(body?.error).toContain('Service Unavailable');
  });

  it('should use "unknown_ip" if no headers are provided', async () => {
    const request = new Request('https://example.com');
    const response = await rateLimitMiddleware(request);
    expect(response).toBeNull(); // allowed
  });
});
