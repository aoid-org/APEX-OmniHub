import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSettings } from '../../src/omnidash/api';
import { supabase } from '../../src/integrations/supabase/client';

// Mock the supabase client module
vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('fetchSettings Performance Optimization', () => {
  let queryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'test-user' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id: 'test-user' }, error: null }),
    };

    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('verifies the columns selected in fetchSettings', async () => {
    await fetchSettings('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_settings');
    expect(queryBuilder.select).toHaveBeenCalledWith(
      'user_id, demo_mode, show_connected_ecosystem, anonymize_kpis, freeze_mode, power_block_started_at, power_block_duration_minutes, updated_at'
    );
  });
});
