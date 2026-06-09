import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemHealthRow } from '../../apps/omnihub-site/dashboard/components/SystemHealthRow';
import { EMPTY_KPI_SUMMARY } from '../../apps/omnihub-site/dashboard/types/dashboard.types';
import type { KpiSummary } from '../../apps/omnihub-site/dashboard/types/dashboard.types';

const kpiWithIncidents: KpiSummary = {
  ...EMPTY_KPI_SUMMARY,
  ops_sev1_incidents: 2,
  tradeline_paid_starts: 10,
  tradeline_active_pilots: 3,
  tradeline_churn_risks: 1,
};

describe('SystemHealthRow', () => {
  it('shows 100% health in demo mode regardless of kpi', () => {
    render(<SystemHealthRow demoMode={true} kpi={kpiWithIncidents} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('shows 100% health in live mode with 0 incidents', () => {
    render(<SystemHealthRow demoMode={false} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('shows 94.2% health in live mode with sev1 incidents', () => {
    render(<SystemHealthRow demoMode={false} kpi={kpiWithIncidents} />);
    expect(screen.getByText('94.2%')).toBeTruthy();
  });

  it('renders zero events tracked in demo mode', () => {
    render(<SystemHealthRow demoMode={true} kpi={kpiWithIncidents} />);
    expect(screen.getByText('Events Tracked')).toBeTruthy();
  });

  it('renders real event count in live mode', () => {
    render(<SystemHealthRow demoMode={false} kpi={kpiWithIncidents} />);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders guardian loops label', () => {
    render(<SystemHealthRow demoMode={true} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('Guardian Loops')).toBeTruthy();
  });

  it('renders stale checks as Clean when 0', () => {
    render(<SystemHealthRow demoMode={false} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('Clean')).toBeTruthy();
  });

  it('renders stale checks count when non-zero', () => {
    render(<SystemHealthRow demoMode={false} kpi={kpiWithIncidents} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders 1 loop in demo mode', () => {
    render(<SystemHealthRow demoMode={true} kpi={EMPTY_KPI_SUMMARY} />);
    expect(screen.getByText('1 loop')).toBeTruthy();
  });
});
