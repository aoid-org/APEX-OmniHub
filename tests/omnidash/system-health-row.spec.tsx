import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../apps/omnihub-site/src/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    tx: (key: string, opts?: any) => {
      const map: Record<string, string> = {
        'dashboard.footer.healthy': 'Healthy',
        'dashboard.footer.degraded': 'Degraded',
        'dashboard.footer.unknown': 'Unknown',
        'dashboard.footer.simulated': '(Simulated)',
        'dashboard.systemHealth.title': 'System Health Overview',
        'dashboard.systemHealth.flowbillsDemoCount': 'FlowBills Demos',
        'dashboard.systemHealth.flowbillsPaidAccounts': 'FlowBills Paid Accounts',
        'dashboard.systemHealth.staleChecks': 'Stale Checks',
        'dashboard.systemHealth.clean': 'Clean',
      };
      return map[key] || opts?.defaultValue || key;
    },
  }),
}));

import { SystemHealthRow } from '../../apps/omnihub-site/dashboard/components/SystemHealthRow';
import { EMPTY_KPI_SUMMARY } from '../../apps/omnihub-site/dashboard/types/dashboard.types';
import type { KpiSummary } from '../../apps/omnihub-site/dashboard/types/dashboard.types';

const kpiWithIncidents: KpiSummary = {
  ...EMPTY_KPI_SUMMARY,
  ops_sev1_incidents: 2,
  flowbills_demos: 10,
  flowbills_paid_accounts: 3,
};

describe('SystemHealthRow', () => {
  it('shows Healthy health in demo mode regardless of kpi', () => {
    render(<SystemHealthRow demoMode={true} kpi={kpiWithIncidents} />);
    expect(screen.getByText('Healthy')).toBeTruthy();
  });

  it('shows Healthy health in live mode with healthy systemHealth', () => {
    render(<SystemHealthRow demoMode={false} kpi={EMPTY_KPI_SUMMARY} systemHealth="healthy" />);
    expect(screen.getByText('Healthy')).toBeTruthy();
  });

  it('shows Degraded health in live mode with degraded systemHealth', () => {
    render(<SystemHealthRow demoMode={false} kpi={kpiWithIncidents} systemHealth="degraded" />);
    expect(screen.getByText('Degraded')).toBeTruthy();
  });

  it('renders zero FlowBills demos in demo mode', () => {
    render(<SystemHealthRow demoMode={true} kpi={kpiWithIncidents} />);
    expect(screen.getByText('FlowBills Demos (Simulated)')).toBeTruthy();
  });

  it('renders real FlowBills demo count in live mode', () => {
    render(<SystemHealthRow demoMode={false} kpi={kpiWithIncidents} />);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders FlowBills paid accounts label', () => {
    render(<SystemHealthRow demoMode={true} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('FlowBills Paid Accounts (Simulated)')).toBeTruthy();
  });

  it('renders stale checks as Clean when 0', () => {
    render(<SystemHealthRow demoMode={false} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('Clean')).toBeTruthy();
  });

  it('renders stale checks count when non-zero', () => {
    render(<SystemHealthRow demoMode={false} kpi={kpiWithIncidents} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders 1 paid account in demo mode without loop copy', () => {
    render(<SystemHealthRow demoMode={true} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('1 loop')).toBeNull();
  });
});
