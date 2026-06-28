import { describe, it, expect } from 'vitest';
import { redactPipeline, redactPipelineDisplay, redactNotes, redactAmount, anonymizeValue, redactTodayItems, redactKpiDaily } from '../../src/omnidash/redaction';
import { PipelineItem } from '../../src/omnidash/types';

const baseItem: PipelineItem = {
  id: '1',
  user_id: 'u1',
  account_name: 'Acme Corp',
  product: 'TradeLine',
  owner: 'Alex',
  stage: 'lead',
  last_touch_at: null,
  next_touch_at: '2025-12-24',
  expected_mrr: 1200,
  probability: 50,
  notes: 'Contact jane@example.com or +1 (555) 123-4567 for billing. $1200 deal',
};

describe('OmniDash redaction', () => {
  it('redacts account names and PII in pipeline', () => {
    const [item] = redactPipeline([baseItem]);
    expect(item.account_name).toBe('Client A');
    expect(item.notes).not.toContain('jane@example.com');
    expect(item.notes).not.toContain('555');
  });

  it('buckets amounts when demo mode', () => {
    const [item] = redactPipelineDisplay([baseItem]);
    expect(item.expected_mrr_bucket).toBe('$1k-$5k');
    expect(item.expected_mrr).toBeNull();
  });

  it('buckets explicit amounts and strips notes', () => {
    const amount = redactAmount(400);
    expect(amount).toBe('$250-$500');
    const notes = redactNotes('Email me at founder@demo.co about $900');
    expect(notes).not.toContain('demo.co');
    expect(notes).toContain('[BUCKETED]');
  });

  it('returns null for null/undefined/NaN amounts', () => {
    expect(redactAmount(null)).toBeNull();
    expect(redactAmount(undefined)).toBeNull();
    expect(redactAmount(Number.NaN)).toBeNull();
  });

  it('returns null for null/undefined notes', () => {
    expect(redactNotes(null)).toBeNull();
    expect(redactNotes(undefined)).toBeNull();
    expect(redactNotes('')).toBeNull();
  });

  it('anonymizeValue returns null for null/undefined and buckets valid numbers', () => {
    expect(anonymizeValue(null)).toBeNull();
    expect(anonymizeValue(undefined)).toBeNull();
    expect(anonymizeValue(800)).toBe('$500-$1k');
  });

  it('redacts today items with notes and without', () => {
    const items = redactTodayItems([
      { id: '1', user_id: 'u1', title: 'Foo Inc', category: 'outcome', order_index: 0, is_active: true, next_action: 'Call jane@foo.com', power_block_started_at: null, power_block_duration_minutes: 0 },
      { id: '2', user_id: 'u1', title: 'Bar LLC', category: 'outreach', order_index: 1, is_active: true, next_action: null, power_block_started_at: null, power_block_duration_minutes: 0 },
    ]);
    expect(items[0].title).toBe('Client A');
    expect(items[0].next_action).not.toContain('jane@foo.com');
    expect(items[1].title).toBe('Client B');
    expect(items[1].next_action).toBeNull();
  });

  it('handles pipeline items with null notes and null expected_mrr', () => {
    const nullNotesItem: PipelineItem = { ...baseItem, notes: null, expected_mrr: null };
    const [item] = redactPipeline([nullNotesItem]);
    expect(item.notes).toBeNull();
    const [display] = redactPipelineDisplay([nullNotesItem]);
    expect(display.expected_mrr_bucket).toBeNull();
  });

  it('redacts KPI daily rows with null cash_days_to_cash', () => {
    const rows = redactKpiDaily([{
      id: 'kpi-1',
      user_id: 'u1',
      day: '2025-12-24',
      flowbills_demos: 2,
      flowbills_paid_accounts: 1,
      cash_days_to_cash: null,
      ops_sev1_incidents: 0,
    }]);
    expect(rows[0].flowbills_demos).toBe(2);
    expect(rows[0].cash_days_to_cash).toBeNull();
  });
});

