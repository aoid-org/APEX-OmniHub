import { describe, it, expect, vi, beforeEach } from 'vitest';

// We have to use vitest run to avoid bun test vi.mock issues
// This test file should be executed via vitest run tests/middleware/rate-limiter.test.ts

import { rateLimitMiddleware } from '../../api/middleware/rate-limiter';
import { kv } from '@vercel/kv';

vi.mock('@vercel/kv', () => ({
  kv: {
    checkLimit: vi.fn(),
  },
}));

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use x-real-ip if provided', async () => {
    vi.mocked(kv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com', {
      headers: {
        'x-real-ip': '192.0.2.1',
        'x-forwarded-for': '198.51.100.1',
      },
    });

    await rateLimitMiddleware(request);
    expect(kv.checkLimit).toHaveBeenCalledWith('192.0.2.1');
  });

  it('should use the last IP from x-forwarded-for if x-real-ip is not provided', async () => {
    vi.mocked(kv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 192.0.2.2',
      },
    });

    await rateLimitMiddleware(request);
    expect(kv.checkLimit).toHaveBeenCalledWith('192.0.2.2');
  });

  it('should trim the IP address from x-forwarded-for', async () => {
    vi.mocked(kv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1,  192.0.2.2  ',
      },
    });

    await rateLimitMiddleware(request);
    expect(kv.checkLimit).toHaveBeenCalledWith('192.0.2.2');
  });

  it('should use "unknown_ip" if no headers are provided', async () => {
    vi.mocked(kv.checkLimit).mockResolvedValue(true);
    const request = new Request('https://example.com');

    await rateLimitMiddleware(request);
    expect(kv.checkLimit).toHaveBeenCalledWith('unknown_ip');
  });
});
