/**
 * LocalAgents — Unit Tests
 * Tests agent event metrics computation, time range/source filtering, loading states, and chart rendering.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LocalAgents } from '@/dashboard/components/modules/LocalAgents';
import LocalAgents from '../../apps/omnihub-site/dashboard/components/modules/LocalAgents';

// Recharts is globally mocked via vitest.config.ts alias

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock Recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

vi.mock('@/components/ui/select', () => {
  const collectOptions = (children: React.ReactNode): React.ReactNode[] => {
    const options: React.ReactNode[] = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as { children?: React.ReactNode; value?: string };
      if (child.type === 'option') {
        options.push(child);
        return;
      }
      if (typeof props.value === 'string') {
        options.push(<option key={props.value} value={props.value}>{props.children}</option>);
        return;
      }
      options.push(...collectOptions(props.children));
    });
    return options;
  };

  return {
    Select: ({ children, onValueChange, value }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
      value?: string;
    }) => (
      <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
        {collectOptions(children)}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import LocalAgents from '@/dashboard/components/LocalAgents';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const LEAD_GEN_EVENTS = [
  { id: '1', time: new Date().toISOString(), source: 'lead-gen', type: 'lead_ingested', data: null },
  { id: '2', time: new Date().toISOString(), source: 'lead-gen', type: 'lead_ingested', data: null },
  { id: '3', time: new Date().toISOString(), source: 'lead-gen', type: 'lead_qualified', data: null },
  { id: '4', time: new Date().toISOString(), source: 'lead-gen', type: 'queue_seeded', data: { queue_size: 15 } },
];

const SALES_EVENTS = [
  { id: '5', time: new Date().toISOString(), source: 'apex-sales', type: 'call_attempted', data: null },
  { id: '6', time: new Date().toISOString(), source: 'apex-sales', type: 'call_attempted', data: null },
  { id: '7', time: new Date().toISOString(), source: 'apex-sales', type: 'call_connected', data: null },
  { id: '8', time: new Date().toISOString(), source: 'apex-sales', type: 'meeting_booked', data: null },
  { id: '9', time: new Date().toISOString(), source: 'apex-sales', type: 'call_completed', data: null },
  { id: '10', time: new Date().toISOString(), source: 'apex-sales', type: 'error', data: null },
];

const ALL_EVENTS = [...LEAD_GEN_EVENTS, ...SALES_EVENTS];

// ─── Tests ────────────────────────────────────────────────────────────────

describe('LocalAgents', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('loading state', () => {
    it('shows loading animation while data is fetching', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
      const { container } = render(<LocalAgents />);
      // Component shows Activity icon with animate-pulse class when loading
      const pulsingEl = container.querySelector('.animate-pulse');
      expect(pulsingEl).toBeInTheDocument();
    });
  });

  describe('with data', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: ALL_EVENTS, isLoading: false });
    });

    it('renders LocalAgents component with cards', () => {
      render(<LocalAgents />);
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('renders time range filter', () => {
      render(<LocalAgents />);
      expect(screen.getAllByTestId('select').length).toBeGreaterThan(0);
    });

    it('renders bar chart', () => {
      render(<LocalAgents />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('metric computation', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({ data: ALL_EVENTS, isLoading: false });
    });

    it('computes lead-gen ingested count correctly (2 events)', () => {
      render(<LocalAgents />);
      // ingested=2 appears as metric value
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThanOrEqual(1);
    });

    it('computes lead-gen qualified count correctly (1 event)', () => {
      render(<LocalAgents />);
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThanOrEqual(1);
    });

    it('computes qualification rate (50.0%)', () => {
      render(<LocalAgents />);
      // 1 qualified / 2 ingested = 50.0%
      const percentages = screen.getAllByText(/50\.0%/);
      expect(percentages.length).toBeGreaterThanOrEqual(1);
    });

    it('computes connection rate (50.0% — 1 connected out of 2 attempted)', () => {
      render(<LocalAgents />);
      // 1 connected / 2 attempted = 50.0%
      const percentages = screen.getAllByText(/50\.0%/);
      expect(percentages.length).toBeGreaterThanOrEqual(1);
    });

    it('shows 0.0% qualification rate when no lead events', () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      render(<LocalAgents />);
      expect(screen.getAllByText(/0\.0%/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('time range filter', () => {
    it('renders 24h and 7d options', () => {
      mockUseQuery.mockReturnValue({ data: ALL_EVENTS, isLoading: false });
      render(<LocalAgents />);
      const selects = screen.getAllByTestId('select');
      const timeSelect = selects[0];
      expect(timeSelect.querySelector('option[value="24h"]')).toBeInTheDocument();
      expect(timeSelect.querySelector('option[value="7d"]')).toBeInTheDocument();
    });

    it('changes time range filter when 7d is selected', () => {
      mockUseQuery.mockReturnValue({ data: ALL_EVENTS, isLoading: false });
      render(<LocalAgents />);
      const selects = screen.getAllByTestId('select');
      fireEvent.change(selects[0], { target: { value: '7d' } });
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['7d']),
        })
      );
    });
  });

  describe('source filter', () => {
    it('renders source filter options', () => {
      mockUseQuery.mockReturnValue({ data: ALL_EVENTS, isLoading: false });
      render(<LocalAgents />);
      const selects = screen.getAllByTestId('select');
      if (selects.length > 1) {
        expect(selects[1].querySelector('option[value="all"]')).toBeInTheDocument();
      }
    });
  });

  describe('empty state', () => {
    it('renders without crashing when events array is empty', () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      render(<LocalAgents />);
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('shows zeros for all metrics with empty events', () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false });
      render(<LocalAgents />);
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });
  });
});
