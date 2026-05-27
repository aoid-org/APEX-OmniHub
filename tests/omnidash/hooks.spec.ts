import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn();

const mockUseAuth = vi.fn();

const mockFrom = vi.fn();
const mockChannel = {
  on: vi.fn(),
  subscribe: vi.fn(),
};
const mockChannelFactory = vi.fn((..._args: any[]) => mockChannel);
const mockRemoveChannel = vi.fn();

const mockFetchSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockFetchUsageMetering = vi.fn();
const mockAggregateUsageMetering = vi.fn();
const mockFetchMemoryHealthStats = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
  useMutation: (opts: unknown) => mockUseMutation(opts),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannelFactory(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('@/omnidash/api', () => ({
  fetchSettings: (...args: unknown[]) => mockFetchSettings(...args),
  updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  fetchUsageMetering: (...args: unknown[]) => mockFetchUsageMetering(...args),
  aggregateUsageMetering: (...args: unknown[]) => mockAggregateUsageMetering(...args),
  fetchMemoryHealthStats: (...args: unknown[]) => mockFetchMemoryHealthStats(...args),
}));

import {
  useAdminAccess,
  useOmniDashSettings,
  useUsageMetering,
  useMemoryHealth,
  useRealtimeOmniDash,
} from '@/omnidash/hooks';

describe('omnidash hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseQueryClient.mockReturnValue({
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    });

    mockChannel.on.mockReturnValue(mockChannel);

    const maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ select, order });

    mockFetchSettings.mockResolvedValue({ demo_mode: false });
    mockUpdateSettings.mockResolvedValue({ demo_mode: true });
    mockFetchUsageMetering.mockResolvedValue([]);
    mockAggregateUsageMetering.mockReturnValue([]);
    mockFetchMemoryHealthStats.mockResolvedValue({ total_rows: 1 });
  });

  it('evaluates admin access against user_roles with query settings', async () => {
    const { result } = renderHook(() => useAdminAccess());
    expect(result.current.featureEnabled).toBeTypeOf('boolean');

    const options = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      enabled: boolean;
      staleTime: number;
      retry: number;
      queryFn: () => Promise<boolean>;
    };

    expect(options.queryKey).toEqual(['omnidash-role', 'user-1']);
    expect(options.enabled).toBe(true);
    expect(options.staleTime).toBe(5 * 60 * 1000);
    expect(options.retry).toBe(1);
    await expect(options.queryFn()).resolves.toBe(true);

    const fromArg = mockFrom.mock.calls[0]?.[0];
    expect(fromArg).toBe('user_roles');
  });

  it('returns false from admin query when user is missing', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderHook(() => useAdminAccess());

    const options = mockUseQuery.mock.calls[0][0] as {
      enabled: boolean;
      queryFn: () => Promise<boolean>;
    };

    expect(options.enabled).toBe(false);
    await expect(options.queryFn()).resolves.toBe(false);
  });

  it('throws admin query errors from supabase', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('role query failed'),
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    renderHook(() => useAdminAccess());

    const options = mockUseQuery.mock.calls[0][0] as {
      queryFn: () => Promise<boolean>;
    };

    await expect(options.queryFn()).rejects.toThrow('role query failed');
  });

  it('wires settings query/mutation and updates query cache on success', async () => {
    const setQueryData = vi.fn();
    mockUseQueryClient.mockReturnValue({ setQueryData, invalidateQueries: vi.fn() });

    mockUseQuery.mockReturnValue({
      data: { demo_mode: false },
      isLoading: false,
      error: null,
    });

    let capturedMutation:
      | {
          mutationFn: (patch: Record<string, unknown>) => Promise<unknown>;
          onSuccess: (data: unknown) => void;
        }
      | undefined;

    const mutateAsync = vi.fn(async (patch: Record<string, unknown>) => {
      return capturedMutation?.mutationFn(patch);
    });

    mockUseMutation.mockImplementation((opts: unknown) => {
      capturedMutation = opts as {
        mutationFn: (patch: Record<string, unknown>) => Promise<unknown>;
        onSuccess: (data: unknown) => void;
      };
      return { mutateAsync, isPending: true };
    });

    const { result } = renderHook(() => useOmniDashSettings());

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };
    expect(queryOptions.queryKey).toEqual(['omnidash-settings', 'user-1']);

    await queryOptions.queryFn();
    expect(mockFetchSettings).toHaveBeenCalledWith('user-1');

    await result.current.updateSettings({ demo_mode: true });
    expect(mockUpdateSettings).toHaveBeenCalledWith('user-1', { demo_mode: true });

    capturedMutation?.onSuccess({ demo_mode: true });
    expect(setQueryData).toHaveBeenCalledWith(['omnidash-settings', 'user-1'], { demo_mode: true });
    expect(result.current.updating).toBe(true);
  });

  it('throws settings query/mutation errors when user is missing', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    let capturedMutation:
      | {
          mutationFn: (patch: Record<string, unknown>) => Promise<unknown>;
        }
      | undefined;

    mockUseMutation.mockImplementation((opts: unknown) => {
      capturedMutation = opts as {
        mutationFn: (patch: Record<string, unknown>) => Promise<unknown>;
      };
      return { mutateAsync: vi.fn(), isPending: false };
    });

    renderHook(() => useOmniDashSettings());

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryFn: () => Promise<unknown>;
    };

    await expect(queryOptions.queryFn()).rejects.toThrow('User not found');
    await expect(capturedMutation?.mutationFn({} as Record<string, unknown>)).rejects.toThrow('User not found');
  });

  it('computes usage summary and token totals', async () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: 'row-1' }],
      isLoading: false,
      error: null,
    });

    mockAggregateUsageMetering.mockReturnValue([
      { total_input_tokens: 7, total_output_tokens: 3 },
      { total_input_tokens: 5, total_output_tokens: 2 },
    ]);

    const { result } = renderHook(() => useUsageMetering(14));

    expect(result.current.summary).toHaveLength(2);
    expect(result.current.totalTokens).toBe(17);

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      refetchInterval: number;
      staleTime: number;
      queryFn: () => Promise<unknown>;
    };

    expect(queryOptions.queryKey).toEqual(['omnidash-usage-metering', 'user-1', 14]);
    expect(queryOptions.refetchInterval).toBe(30_000);
    expect(queryOptions.staleTime).toBe(15_000);

    await queryOptions.queryFn();
    expect(mockFetchUsageMetering).toHaveBeenCalledWith('user-1', 14);
  });

  it('returns empty usage summary with zero total tokens when no query data exists', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    const { result } = renderHook(() => useUsageMetering());
    expect(result.current.summary).toEqual([]);
    expect(result.current.totalTokens).toBe(0);
  });

  it('queries memory health for the current user', async () => {
    mockUseQuery.mockReturnValue({ data: { total_rows: 42 }, isLoading: false, error: null });

    const { result } = renderHook(() => useMemoryHealth());
    expect(result.current.data).toEqual({ total_rows: 42 });

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      refetchInterval: number;
      staleTime: number;
      queryFn: () => Promise<unknown>;
    };

    expect(queryOptions.queryKey).toEqual(['omnidash-memory-health', 'user-1']);
    expect(queryOptions.refetchInterval).toBe(30_000);
    expect(queryOptions.staleTime).toBe(15_000);

    await queryOptions.queryFn();
    expect(mockFetchMemoryHealthStats).toHaveBeenCalledWith('user-1');
  });

  it('throws from memory health queryFn when user is missing', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useMemoryHealth());

    const queryOptions = mockUseQuery.mock.calls[0][0] as {
      queryFn: () => Promise<unknown>;
    };

    await expect(queryOptions.queryFn()).rejects.toThrow('User not found');
  });

  it('binds realtime channel handlers and invalidates mapped query keys', () => {
    const invalidateQueries = vi.fn();
    mockUseQueryClient.mockReturnValue({ setQueryData: vi.fn(), invalidateQueries });

    const handlers = new Map<string, () => void>();
    mockChannel.on.mockImplementation((
      _event: unknown,
      payload: { table?: string },
      handler: () => void,
    ) => {
      if (payload.table) {
        handlers.set(payload.table, handler);
      }
      return mockChannel;
    });

    const { unmount } = renderHook(() => useRealtimeOmniDash());

    expect(mockChannelFactory).toHaveBeenCalledWith('omnidash-realtime-user-1');
    expect(mockChannel.on).toHaveBeenCalledTimes(5);
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);

    handlers.get('omnidash_settings')?.();
    handlers.get('omnidash_today_items')?.();
    handlers.get('omnidash_pipeline_items')?.();
    handlers.get('omnidash_kpi_daily')?.();
    handlers.get('omnidash_incidents')?.();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['omnidash-settings', 'user-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['omnidash-today-items', 'user-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['omnidash-pipeline-items', 'user-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['omnidash-kpi-daily', 'user-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['omnidash-incidents', 'user-1'] });

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('does not subscribe to realtime updates when user is missing', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderHook(() => useRealtimeOmniDash());

    expect(mockChannelFactory).not.toHaveBeenCalled();
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });
});
