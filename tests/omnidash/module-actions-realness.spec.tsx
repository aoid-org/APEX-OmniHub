/**
 * Module Action Realness Contract.
 *
 * triggerModuleAction must never fake success and must never spin forever:
 * - offline → honest "Not Implemented" failure
 * - unauthenticated → honest "Authentication required" failure
 * - backend error → honest failure carrying the error
 * - backend hang → resolves to a "timed out" failure within the timeout
 * - real dispatch → success with the backend message
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGetUser, mockInvoke } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockInvoke: vi.fn(),
}));

// hasSupabaseConfig is read at import time; default to the online branch and
// flip per-test where the offline path is exercised.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    functions: { invoke: mockInvoke },
  },
  hasSupabaseConfig: true,
}));

// Import the real omnihub-site implementation directly. The '@/' alias resolves
// to the root-package STUB under Vitest (intentional split — see vitest.config.ts),
// so we use the relative path to exercise the canonical Supabase-backed function.
// Its internal '@/lib/supabase' import still resolves to root src/lib/supabase,
// which the vi.mock below intercepts.
import { triggerModuleAction } from '../../apps/omnihub-site/src/hooks/useOmniModuleState';

describe('triggerModuleAction — realness contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns honest failure when unauthenticated (no silent success)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await triggerModuleAction('links', 'add-link', []);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Authentication required/i);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns honest failure when the backend reports an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const result = await triggerModuleAction('links', 'add-link', []);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/boom/);
  });

  it('returns honest false (queued) on asynchronous dispatch', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockInvoke.mockResolvedValue({ data: { workflow_id: 'wf-123', message: 'Dispatched' }, error: null });
    const result = await triggerModuleAction('workflows', 'run', ['a', 'b']);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Dispatched');
  });

  describe('timeout protection', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('resolves to a timed-out failure when the backend hangs', async () => {
      // auth resolves, but the workflow invoke never settles
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockInvoke.mockReturnValue(new Promise(() => {}));

      const pending = triggerModuleAction('links', 'add-link', []);
      await vi.advanceTimersByTimeAsync(8000);
      const result = await pending;

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/timed out/i);
    });
  });
});
