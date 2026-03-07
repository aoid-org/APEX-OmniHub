import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchSettings,
  fetchTodayItems,
  upsertTodayItem,
  restartRitual,
  fetchPipelineItems,
  upsertPipelineItem,
  fetchKpiDaily,
  upsertKpiDailyEntry,
  fetchIncidents,
  addIncident,
  OMNIDASH_COLUMNS
} from '../../src/omnidash/api';
import { supabase } from '../../src/integrations/supabase/client';

// Mock the supabase client module
vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('fetchSettings Performance Optimization', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'test-user' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { user_id: 'test-user' }, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('verifies explicit column selection in fetchSettings', async () => {
    await fetchSettings('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_settings');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.settings);
  });

  it('verifies explicit column selection in fetchSettings fallback insert', async () => {
    // Mock maybeSingle to return null (no settings found)
    queryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    // Mock insert/select/single chain
    queryBuilder.insert.mockReturnThis();
    queryBuilder.single.mockResolvedValue({ data: { user_id: 'test-user', created_new: true }, error: null });

    await fetchSettings('test-user');

    // Verify insert was called
    expect(queryBuilder.insert).toHaveBeenCalledWith({ user_id: 'test-user' });
    // Verify select was called with explicit columns after insert
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.settings);
    // Ensure we didn't use '*'
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in fetchTodayItems', async () => {
    // Mock return for fetchTodayItems
    queryBuilder.order.mockResolvedValue({ data: [], error: null });

    await fetchTodayItems('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_today_items');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.today_items);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in upsertTodayItem', async () => {
    const item = { title: 'New Task', user_id: 'test-user' };
    await upsertTodayItem(item);

    expect(supabase.from).toHaveBeenCalledWith('omnidash_today_items');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.today_items);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in restartRitual', async () => {
     // Mock data for restartRitual
    queryBuilder.order.mockResolvedValue({ data: [], error: null });

    await restartRitual('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_today_items');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.today_items);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in fetchPipelineItems', async () => {
    queryBuilder.order.mockResolvedValue({ data: [], error: null });

    await fetchPipelineItems('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_pipeline_items');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.pipeline_items);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in upsertPipelineItem', async () => {
    const item = {
      user_id: 'test-user',
      account_name: 'Acme',
      product: 'Pro',
      owner: 'Me',
      stage: 'lead' as const,
      next_touch_at: '2025-01-01'
    };
    await upsertPipelineItem(item);

    expect(supabase.from).toHaveBeenCalledWith('omnidash_pipeline_items');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.pipeline_items);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in fetchKpiDaily', async () => {
    queryBuilder.limit.mockResolvedValue({ data: [], error: null });
    // limit returns promise, order returns builder
    queryBuilder.order.mockReturnThis();

    await fetchKpiDaily('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_kpi_daily');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.kpi_daily);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in upsertKpiDailyEntry', async () => {
    const row = { user_id: 'test-user', day: '2025-01-01' };
    await upsertKpiDailyEntry(row);

    expect(supabase.from).toHaveBeenCalledWith('omnidash_kpi_daily');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.kpi_daily);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in fetchIncidents', async () => {
    queryBuilder.limit.mockResolvedValue({ data: [], error: null });
    queryBuilder.order.mockReturnThis();

    await fetchIncidents('test-user');

    expect(supabase.from).toHaveBeenCalledWith('omnidash_incidents');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.incidents);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });

  it('verifies explicit column selection in addIncident', async () => {
    const incident = { user_id: 'test-user', title: 'Outage', severity: 'sev1' as const };
    await addIncident(incident);

    expect(supabase.from).toHaveBeenCalledWith('omnidash_incidents');
    expect(queryBuilder.select).toHaveBeenCalledWith(OMNIDASH_COLUMNS.incidents);
    expect(queryBuilder.select).not.toHaveBeenCalledWith('*');
  });
});
