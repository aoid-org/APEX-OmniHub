import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  fetchOmniLinkIntegrations,
  createOmniLinkIntegration,
  createOmniLinkKey,
  revokeOmniLinkKey,
  fetchOmniTraceRuns,
  fetchOmniTraceRunDetail
} from '@/omnidash/omnilink-api';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/lib/debug-logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getSession: vi.fn() }
  }
}));

describe('omnilink-api', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Supabase Table Operations via fetchList', () => {
    it('should fetch omnilink integrations successfully', async () => {
      // Mock supabase builder chain
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'int_123' }], error: null });
      
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder });
      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await fetchOmniLinkIntegrations('user_1');
      expect(supabase.from).toHaveBeenCalledWith('integrations');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user_1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('int_123');
    });

    it('should throw and log error if fetch fails', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('DB fetch failed') });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      (supabase.from as Mock).mockReturnValue({ select: () => ({ eq: mockEq }) });

      await expect(fetchOmniLinkIntegrations('user_1')).rejects.toThrow('DB fetch failed');
    });

    it('should create omnilink integration', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new_int' }, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as Mock).mockReturnValue({ insert: mockInsert });

      const result = await createOmniLinkIntegration('user_1', 'My CRM', 'crm');
      expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user_1', name: 'My CRM', type: 'crm', status: 'active' });
      expect(result.id).toBe('new_int');
    });
  });

  describe('RPC Operations', () => {
    it('should revoke omnilink key via RPC', async () => {
      (supabase.rpc as Mock).mockResolvedValue({ error: null });
      await revokeOmniLinkKey('user_1', 'key_123');
      expect(supabase.rpc).toHaveBeenCalledWith('omnilink_revoke_key', {
        p_key_id: 'key_123',
        p_user_id: 'user_1'
      });
    });

    it('should throw if RPC fails to revoke', async () => {
      (supabase.rpc as Mock).mockResolvedValue({ error: new Error('RPC error') });
      await expect(revokeOmniLinkKey('user_1', 'key_123')).rejects.toThrow('RPC error');
    });
  });

  describe('Edge Function / Fetch Operations', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
      import.meta.env.VITE_SUPABASE_URL = 'http://localhost:54321';
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should create omnilink key via API call', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: { access_token: 'fake_token' } }
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ key: 'sk_test_123', key_prefix: 'sk_test', warning: '' })
      };
      (global.fetch as Mock).mockResolvedValue(mockResponse);

      const result = await createOmniLinkKey('int_123', 'My Key', { read: true });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/functions/v1/omnilink-port/keys'), expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake_token',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ integration_id: 'int_123', name: 'My Key', scopes: { read: true } })
      }));
      expect(result.key).toBe('sk_test_123');
    });

    it('should fail if session is missing for edge function', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: null } });
      await expect(fetchOmniTraceRuns()).rejects.toThrow('No authenticated session found');
    });

    it('should fetch omni trace runs via get API', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: { access_token: 'fake_token' } }
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ has_more: false, runs: [] })
      };
      (global.fetch as Mock).mockResolvedValue(mockResponse);

      const result = await fetchOmniTraceRuns(10);
      expect(result.runs).toEqual([]);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/functions/v1/omni-runs?limit=10'), expect.any(Object));
    });

    it('should parse non-ok fetch response text and throw', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: { access_token: 'fake_token' } }
      });

      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error')
      };
      (global.fetch as Mock).mockResolvedValue(mockResponse);

      await expect(fetchOmniTraceRunDetail('run_123')).rejects.toThrow('omnitrace_fetch_run_detail failed (500): Internal Server Error');
    });
  });

});
