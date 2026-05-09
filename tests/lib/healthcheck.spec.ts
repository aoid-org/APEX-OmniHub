import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runHealthCheck } from '@/lib/healthcheck';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/monitoring';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
}));

describe('healthcheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return OK status on successful invocation', async () => {
    const mockData = {
      status: 'OK',
      timestamp: '2026-04-09T00:00:00.000Z',
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockData,
      error: null,
    });

    const result = await runHealthCheck();
    expect(result).toEqual(mockData);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('platform-health');
    expect(logError).not.toHaveBeenCalled();
  });

  it('should return error status on invocation error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: { message: 'Edge function failed' } as unknown,
    });

    const result = await runHealthCheck();
    expect(result.status).toBe('error');
    expect(result.error).toBe('Edge function failed');
    expect(logError).toHaveBeenCalledWith(
      { message: 'Edge function failed' },
      { action: 'health_check_failed' }
    );
  });

  it('should catch exceptions and format error response', async () => {
    const error = new Error('Network timeout');
    vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(error);

    const result = await runHealthCheck();
    expect(result.status).toBe('error');
    expect(result.error).toBe('Network timeout');
    expect(logError).toHaveBeenCalledWith(error, { action: 'health_check_exception' });
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(supabase.functions.invoke).mockRejectedValueOnce('String throw');

    const result = await runHealthCheck();
    expect(result.status).toBe('error');
    expect(result.error).toBe('Unknown error');
  });
});
