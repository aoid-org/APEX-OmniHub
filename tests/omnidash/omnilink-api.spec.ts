import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOmniLinkIntegrations,
  createOmniLinkIntegration,
  OmniLinkIntegrationRow,
} from '../../apps/omnihub-site/src/omnidash/omnilink-api';
import { supabase } from '@/integrations/supabase/client';

// Mock the root supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

describe('omnilink-api layer coverage', () => {
  let queryBuilder: MockQueryBuilder;

  beforeEach(() => {
    vi.clearAllMocks();

    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(
      queryBuilder as unknown as ReturnType<typeof supabase.from>,
    );
  });

  describe('fetchOmniLinkIntegrations', () => {
    it('returns array of integrations when query succeeds', async () => {
      const mockRows: OmniLinkIntegrationRow[] = [
        {
          id: 'int-1',
          user_id: 'user-1',
          name: 'Custom CRM',
          type: 'crm',
          status: 'active',
          created_at: '2026-07-16T00:00:00Z',
          updated_at: '2026-07-16T00:00:00Z',
        },
      ];
      queryBuilder.order.mockResolvedValue({ data: mockRows, error: null });

      const res = await fetchOmniLinkIntegrations('user-1');

      expect(supabase.from).toHaveBeenCalledWith('omnilink_integrations');
      expect(queryBuilder.select).toHaveBeenCalledWith('*');
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(res).toEqual(mockRows);
    });

    it('returns empty array and logs error when query fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      queryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const res = await fetchOmniLinkIntegrations('user-1');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[omnilink-api] fetchOmniLinkIntegrations error:',
        'Database error',
      );
      expect(res).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('returns empty array when data is null without error', async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: null });

      const res = await fetchOmniLinkIntegrations('user-1');

      expect(res).toEqual([]);
    });
  });

  describe('createOmniLinkIntegration', () => {
    it('creates and returns a new integration row', async () => {
      const createdRow: OmniLinkIntegrationRow = {
        id: 'int-2',
        user_id: 'user-1',
        name: 'Custom ERP',
        type: 'erp',
        status: 'active',
        created_at: '2026-07-16T00:00:00Z',
        updated_at: '2026-07-16T00:00:00Z',
      };
      queryBuilder.single.mockResolvedValue({ data: createdRow, error: null });

      const res = await createOmniLinkIntegration('user-1', 'Custom ERP', 'erp');

      expect(supabase.from).toHaveBeenCalledWith('omnilink_integrations');
      expect(queryBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'Custom ERP',
        type: 'erp',
        status: 'active',
      });
      expect(queryBuilder.select).toHaveBeenCalled();
      expect(queryBuilder.single).toHaveBeenCalled();
      expect(res).toEqual(createdRow);
    });

    it('throws error when insert fails', async () => {
      queryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      });

      await expect(
        createOmniLinkIntegration('user-1', 'Custom ERP', 'erp'),
      ).rejects.toThrow('[omnilink-api] createOmniLinkIntegration failed: RLS violation');
    });
  });
});
