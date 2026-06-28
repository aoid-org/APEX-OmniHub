import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OPS_STATE,
  EMPTY_KPI_SUMMARY,
  DEFAULT_PERSISTED_LAYOUT,
  LAYOUT_STORAGE_KEY,
} from '../../apps/omnihub-site/dashboard/types/dashboard.types';

describe('dashboard.types constants', () => {
  it('DEFAULT_OPS_STATE has correct shape', () => {
    expect(DEFAULT_OPS_STATE).toEqual({
      demo: true,
      autoPilot: false,
      guardian: true,
      live: false,
    });
  });

  it('EMPTY_KPI_SUMMARY has all zero values', () => {
    expect(EMPTY_KPI_SUMMARY).toEqual({
      flowbills_demos: 0,
      flowbills_paid_accounts: 0,
      cash_days_to_cash: 0,
      ops_sev1_incidents: 0,
    });
  });

  it('DEFAULT_PERSISTED_LAYOUT uses defaults', () => {
    expect(DEFAULT_PERSISTED_LAYOUT.activeNav).toBe('Home');
    expect(DEFAULT_PERSISTED_LAYOUT.isDark).toBe(true);
    expect(DEFAULT_PERSISTED_LAYOUT.panelLayout).toBe('standard');
    expect(DEFAULT_PERSISTED_LAYOUT.ops).toEqual(DEFAULT_OPS_STATE);
    expect(Array.isArray(DEFAULT_PERSISTED_LAYOUT.hiddenWidgets)).toBe(true);
    expect(DEFAULT_PERSISTED_LAYOUT.hiddenWidgets.length).toBeGreaterThan(0);
  });

  it('LAYOUT_STORAGE_KEY is a stable string', () => {
    expect(typeof LAYOUT_STORAGE_KEY).toBe('string');
    expect(LAYOUT_STORAGE_KEY).toContain('omnidash');
  });
});
