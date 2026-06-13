import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../apps/omnihub-site/src/contexts/DemoModeContext', () => ({
  useDemoMode: vi.fn(() => ({ demoMode: false })),
}));

const defaultDashData = {
  kpiSummary: {
    tradeline_paid_starts: 4,
    tradeline_active_pilots: 5,
    tradeline_churn_risks: 3,
    flowbills_demos: 8,
    flowbills_paid_accounts: 12,
    cash_days_to_cash: 30,
    ops_sev1_incidents: 2,
  },
  kpiHistory: [
    {
      id: 'kpi-2026-06-01',
      day: '2026-06-01T00:00:00Z',
      tradeline_paid_starts: 4,
      tradeline_active_pilots: 5,
      tradeline_churn_risks: 3,
      flowbills_demos: 8,
      flowbills_paid_accounts: 12,
      cash_days_to_cash: 30,
      ops_sev1_incidents: 2,
    },
    {
      id: 'kpi-2026-06-02',
      day: '2026-06-02T00:00:00Z',
      tradeline_paid_starts: 6,
      tradeline_active_pilots: 5,
      tradeline_churn_risks: 3,
      flowbills_demos: 8,
      flowbills_paid_accounts: 12,
      cash_days_to_cash: 30,
      ops_sev1_incidents: 2,
    },
  ],
  openIncidents: [],
  settings: null,
  memoryHealth: null,
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};

vi.mock('dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(() => defaultDashData),
}));

import {
  SystemHealthOverview,
  AgentActivityTimeline,
  GuardianAlertFeed,
  ManModeReviewQueue,
  OmniRouteTraffic,
  WorkflowStatusBoard,
  SystemSparklines,
} from '../../apps/omnihub-site/dashboard/components/M03Panels';
import { useDashboardData } from 'dashboard/hooks/useDashboardData';
import { useDemoMode } from '../../apps/omnihub-site/src/contexts/DemoModeContext';

describe('M03Panels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDemoMode).mockReturnValue({ demoMode: false } as ReturnType<typeof useDemoMode>);
    vi.mocked(useDashboardData).mockReturnValue(defaultDashData as ReturnType<typeof useDashboardData>);
  });

  describe('SystemHealthOverview', () => {
    it('renders section label', () => {
      render(<SystemHealthOverview />);
      expect(screen.getByText('System Health Overview')).toBeTruthy();
    });

    it('renders agents active count from kpiSummary', () => {
      render(<SystemHealthOverview />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders loading skeleton when isLoading', () => {
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        isLoading: true,
      } as ReturnType<typeof useDashboardData>);
      render(<SystemHealthOverview />);
      expect(screen.getByText('System Health Overview')).toBeTruthy();
    });

    it('renders error state with Retry button', () => {
      const refresh = vi.fn();
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        error: 'fail',
        refresh,
      } as ReturnType<typeof useDashboardData>);
      render(<SystemHealthOverview />);
      fireEvent.click(screen.getByText('Retry'));
      expect(refresh).toHaveBeenCalled();
    });

    it('shows zero when ops_sev1_incidents is 0', () => {
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        kpiSummary: { ...defaultDashData.kpiSummary, ops_sev1_incidents: 0 },
      } as ReturnType<typeof useDashboardData>);
      render(<SystemHealthOverview />);
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  describe('AgentActivityTimeline', () => {
    it('renders section label', () => {
      render(<AgentActivityTimeline />);
      expect(screen.getByText('Agent Activity (last 60m)')).toBeTruthy();
    });

    it('renders loading state', () => {
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        isLoading: true,
      } as ReturnType<typeof useDashboardData>);
      render(<AgentActivityTimeline />);
      expect(screen.getByText('Agent Activity (last 60m)')).toBeTruthy();
    });

    it('renders error state', () => {
      const refresh = vi.fn();
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        error: 'timeline error',
        refresh,
      } as ReturnType<typeof useDashboardData>);
      render(<AgentActivityTimeline />);
      fireEvent.click(screen.getByText('Retry'));
      expect(refresh).toHaveBeenCalled();
    });

    it('renders with empty kpiHistory (fallback data)', () => {
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        kpiHistory: [],
      } as ReturnType<typeof useDashboardData>);
      render(<AgentActivityTimeline />);
      expect(screen.getByText('Agent Activity (last 60m)')).toBeTruthy();
    });
  });

  describe('GuardianAlertFeed', () => {
    it('renders section label', () => {
      render(<GuardianAlertFeed />);
      expect(screen.getByText('Guardian Alert Feed')).toBeTruthy();
    });

    it('renders no-alerts message when openIncidents is empty', () => {
      render(<GuardianAlertFeed />);
      expect(screen.getByText('No active alerts')).toBeTruthy();
    });

    it('renders incidents when present', () => {
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        openIncidents: [
          { id: '1', severity: 'sev1', status: 'open', title: 'DB latency spike', occurred_at: '2026-06-01T12:00:00Z' },
          { id: '2', severity: 'sev2', status: 'open', title: 'Auth service slow', occurred_at: '2026-06-01T11:00:00Z' },
        ],
      } as ReturnType<typeof useDashboardData>);
      render(<GuardianAlertFeed />);
      expect(screen.getByText('DB latency spike')).toBeTruthy();
      expect(screen.getByText('Auth service slow')).toBeTruthy();
    });

    it('renders loading state', () => {
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        isLoading: true,
      } as ReturnType<typeof useDashboardData>);
      render(<GuardianAlertFeed />);
      expect(screen.getByText('Guardian Alert Feed')).toBeTruthy();
    });

    it('renders error state', () => {
      const refresh = vi.fn();
      vi.mocked(useDashboardData).mockReturnValueOnce({
        ...defaultDashData,
        error: 'feed error',
        refresh,
      } as ReturnType<typeof useDashboardData>);
      render(<GuardianAlertFeed />);
      fireEvent.click(screen.getByText('Retry'));
      expect(refresh).toHaveBeenCalled();
    });
  });

  describe('ManModeReviewQueue', () => {
    it('renders section label', () => {
      render(<ManModeReviewQueue />);
      expect(screen.getByText('MAN Mode Review')).toBeTruthy();
    });

    it('shows zero pending approvals', () => {
      render(<ManModeReviewQueue />);
      expect(screen.getByText(/Zero pending manual approvals/)).toBeTruthy();
    });

    it('shows Requires Auth badge', () => {
      render(<ManModeReviewQueue />);
      expect(screen.getByText('Requires Auth')).toBeTruthy();
    });
  });

  describe('OmniRouteTraffic', () => {
    it('renders section label', () => {
      render(<OmniRouteTraffic />);
      expect(screen.getByText('OmniRoute Traffic (1h)')).toBeTruthy();
    });

    it('shows no telemetry message', () => {
      render(<OmniRouteTraffic />);
      expect(screen.getByText('No route telemetry available.')).toBeTruthy();
    });
  });

  describe('WorkflowStatusBoard', () => {
    it('renders section label', () => {
      render(<WorkflowStatusBoard />);
      expect(screen.getByText('Workflow Status')).toBeTruthy();
    });

    it('renders all four status columns', () => {
      render(<WorkflowStatusBoard />);
      ['Pending', 'Running', 'Completed', 'Failed'].forEach((s) => {
        expect(screen.getByText(s)).toBeTruthy();
      });
    });

    it('shows Sync CRM in Completed column', () => {
      render(<WorkflowStatusBoard />);
      expect(screen.getByText('Sync CRM')).toBeTruthy();
    });

    it('shows Invoice Batch in Running column', () => {
      render(<WorkflowStatusBoard />);
      expect(screen.getByText('Invoice Batch')).toBeTruthy();
    });
  });

  describe('SystemSparklines', () => {
    it('renders section label', () => {
      render(<SystemSparklines />);
      expect(screen.getByText('System Sparklines')).toBeTruthy();
    });

    it('renders all sparkline labels', () => {
      render(<SystemSparklines />);
      ['Latency (ms)', 'DB Connections', 'Edge Latency', 'Auth RPS', 'Sessions', 'Cache Hit %'].forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
    });

    it('shows NO DATA placeholders', () => {
      render(<SystemSparklines />);
      expect(screen.getAllByText('NO DATA').length).toBe(6);
    });
  });
});
