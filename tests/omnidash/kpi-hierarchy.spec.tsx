import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { PrimaryKpiBand } from '../../apps/omnihub-site/dashboard/components/PrimaryKpiBand';
import type { KpiSummary } from '../../apps/omnihub-site/dashboard/types/dashboard.types';

const KPI: KpiSummary = {
  flowbills_demos: 12,
  flowbills_paid_accounts: 5,
  cash_days_to_cash: 34,
  ops_sev1_incidents: 2,
};

const baseProps = {
  kpi: KPI,
  hasData: true,
  isLoading: false,
  error: null as unknown,
  demoMode: false,
  onRetry: () => {},
};

describe('PrimaryKpiBand — above-the-fold KPI hierarchy', () => {
  it('renders the four primary business KPIs with their real values', () => {
    render(<PrimaryKpiBand {...baseProps} />);
    expect(screen.getByTestId('primary-kpi-band')).toBeTruthy();
    expect(within(screen.getByTestId('kpi-flowbills_paid_accounts')).getByTestId('kpi-flowbills_paid_accounts-value').textContent).toBe('5');
    expect(within(screen.getByTestId('kpi-flowbills_demos')).getByTestId('kpi-flowbills_demos-value').textContent).toBe('12');
    expect(within(screen.getByTestId('kpi-cash_days_to_cash')).getByTestId('kpi-cash_days_to_cash-value').textContent).toBe('34');
    expect(within(screen.getByTestId('kpi-ops_sev1_incidents')).getByTestId('kpi-ops_sev1_incidents-value').textContent).toBe('2');
  });

  it('every KPI label carries an explicit unit and timeframe', () => {
    const { container } = render(<PrimaryKpiBand {...baseProps} />);
    const text = container.textContent ?? '';
    // unit · timeframe per the audit "number without unit" anti-pattern fix
    expect(text).toContain('accounts · latest');
    expect(text).toContain('demos · latest');
    expect(text).toContain('days · current');
    expect(text).toContain('incidents · 24h');
  });

  it('shows an actionable empty state (not silent zeros) when production has no data', () => {
    render(<PrimaryKpiBand {...baseProps} hasData={false} />);
    expect(screen.queryByTestId('primary-kpi-band')).toBeNull();
    expect(screen.getByText(/No KPI data yet/i)).toBeTruthy();
  });

  it('does not fabricate production values — empty state has no numeric tiles', () => {
    render(<PrimaryKpiBand {...baseProps} hasData={false} />);
    expect(screen.queryByTestId('kpi-flowbills_demos')).toBeNull();
  });

  it('labels demo data as Simulated and still renders tiles', () => {
    render(<PrimaryKpiBand {...baseProps} demoMode hasData={false} />);
    expect(screen.getByTestId('primary-kpi-band')).toBeTruthy();
    expect(screen.getByText(/Primary Metrics \(Simulated\)/i)).toBeTruthy();
    expect(screen.getAllByText(/· simulated/i).length).toBeGreaterThan(0);
  });

  it('exposes an aria-busy region while loading', () => {
    render(<PrimaryKpiBand {...baseProps} isLoading />);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  });

  it('renders an alert with a working Retry on error', () => {
    const onRetry = vi.fn();
    render(<PrimaryKpiBand {...baseProps} error={new Error('boom')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
