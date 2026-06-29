/**
 * FooterObservabilityRow — footer-only observability/status strip.
 *
 * Owner P1 contract: observability moved out of the main canvas and into a
 * fixed/clipped footer row fed by REAL shell state (no decorative-only data).
 * These tests prove it renders real system/user values and clips its content.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FooterObservabilityRow } from '../../apps/omnihub-site/dashboard/components/FooterObservabilityRow';
import { EMPTY_KPI_SUMMARY } from '../../apps/omnihub-site/dashboard/types/dashboard.types';
import type { KpiSummary } from '../../apps/omnihub-site/dashboard/types/dashboard.types';

const liveKpi: KpiSummary = {
  ...EMPTY_KPI_SUMMARY,
  flowbills_demos: 42,
  flowbills_paid_accounts: 3,
  ops_sev1_incidents: 1,
};

describe('FooterObservabilityRow', () => {
  it('renders a single clipped row (overflow:hidden) with a stable test id', () => {
    render(
      <FooterObservabilityRow
        demoMode={false}
        kpi={liveKpi}
        systemHealth="healthy"
        openIncidentsCount={0}
      />,
    );
    const row = screen.getByTestId('footer-observability');
    expect(row).toBeTruthy();
    expect(row.style.overflow).toBe('hidden');
  });

  it('surfaces real live system state — health, events, loops', () => {
    render(
      <FooterObservabilityRow
        demoMode={false}
        kpi={liveKpi}
        systemHealth="degraded"
        openIncidentsCount={2}
      />,
    );
    const row = screen.getByTestId('footer-observability');
    expect(row.textContent).toContain('Degraded');
    expect(row.textContent).toContain('42');   // events tracked
    expect(row.textContent).toContain('Incidents');
    expect(row.textContent).toContain('2');    // open incidents (queue)
    expect(row.textContent).toContain('Live'); // sync state
  });

  it('reflects an honest sync-error state when the data bridge fails', () => {
    render(
      <FooterObservabilityRow
        demoMode={false}
        kpi={liveKpi}
        systemHealth="unknown"
        openIncidentsCount={0}
        error="bridge_unreachable"
      />,
    );
    expect(screen.getByTestId('footer-observability').textContent).toContain('Sync error');
  });

  it('does not crash when kpi/systemHealth are unresolved (cold load)', () => {
    render(
      <FooterObservabilityRow demoMode={false} openIncidentsCount={0} isLoading />,
    );
    const row = screen.getByTestId('footer-observability');
    expect(row.textContent).toContain('Unknown'); // health falls back honestly
    expect(row.textContent).toContain('Syncing');
  });
});
