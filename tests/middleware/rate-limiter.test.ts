import { describe, it, expect, vi, beforeEach } from 'vitest';

// We have to use vitest run to avoid bun test vi.mock issues
// This test file should be executed via vitest run tests/middleware/rate-limiter.test.ts

// vi.hoisted() ensures the mock object exists BEFORE vi.mock's hoisted factory runs.
// Without this, `mockKv` would be undefined at factory execution time (ReferenceError).
const mockKv = vi.hoisted(() => ({
  checkLimit: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: mockKv
}));

import { rateLimitMiddleware } from '../../api/middleware/rate-limiter';

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use x-real-ip if provided', async () => {
    vi.mocked(mockKv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com', {
      headers: {
        'x-real-ip': '192.0.2.1',
        'x-forwarded-for': '198.51.100.1',
      },
    });

    await rateLimitMiddleware(request);
    expect(mockKv.checkLimit).toHaveBeenCalledWith('192.0.2.1');
  });

  it('should use the last IP from x-forwarded-for if x-real-ip is not provided', async () => {
    vi.mocked(mockKv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 192.0.2.2',
      },
    });

    await rateLimitMiddleware(request);
    expect(mockKv.checkLimit).toHaveBeenCalledWith('192.0.2.2');
  });

  it('should trim the IP address from x-forwarded-for', async () => {
    vi.mocked(mockKv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1,  192.0.2.2  ',
      },
    });

    await rateLimitMiddleware(request);
    expect(mockKv.checkLimit).toHaveBeenCalledWith('192.0.2.2');
  });

  it('should use "unknown_ip" if no headers are provided', async () => {
    vi.mocked(mockKv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com');

    await rateLimitMiddleware(request);
    expect(mockKv.checkLimit).toHaveBeenCalledWith('unknown_ip');
  });

  it('should return 429 when rate limit is exceeded', async () => {
    vi.mocked(mockKv.checkLimit).mockResolvedValue(false);
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '192.0.2.1' },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
    const body = await response!.json();
    expect(body.error).toContain('Rate Limit Exceeded');
  });

  it('should fail-closed with 429 when checkLimit returns null', async () => {
    vi.mocked(mockKv.checkLimit).mockResolvedValue(null);
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '192.0.2.1' },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
  });

  it('should fail-closed with 503 when KV throws an error', async () => {
    vi.mocked(mockKv.checkLimit).mockRejectedValue(new Error('KV subsystem failure'));
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '192.0.2.1' },
    });

    const response = await rateLimitMiddleware(request);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    const body = await response!.json();
    expect(body.error).toContain('Service Unavailable');
  });
});
