/**
 * OmniLinkReplay — Unit Tests
 * Tests trace event replay: empty state, playback controls, step navigation, and auto-advance.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import type { TraceEvent } from '@/hooks/useOmniTrace';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockUseOmniTrace = vi.fn();

vi.mock('@/hooks/useOmniTrace', () => ({
  useOmniTrace: (id: string) => mockUseOmniTrace(id),
}));

// Mock shadcn components to avoid radix complexity in jsdom
vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    max,
  }: {
    value: number[];
    onValueChange: (v: number[]) => void;
    max: number;
  }) => (
    <input
      type="range"
      data-testid="replay-slider"
      value={value[0]}
      max={max}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-testid={`badge-${variant ?? 'default'}`}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { OmniLinkReplay } from '@/components/workflows/OmniLinkReplay';

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeTraceEvent(n: number): TraceEvent {
  return {
    id: `evt-${n}`,
    workflow_id: 'wf-1',
    event_key: `step-${n}`,
    kind: 'tool',
    name: `Action ${n}`,
    latency_ms: n * 10,
    data_redacted: { step: n },
    data_hash: `hash-${n}`,
    created_at: new Date(Date.now() + n * 1000).toISOString(),
  };
}

const TRACE_EVENTS: TraceEvent[] = [makeTraceEvent(1), makeTraceEvent(2), makeTraceEvent(3)];

// Button order in OmniLinkReplay controls:
// [0] Reset  [1] SkipBack  [2] Play/Pause  [3] SkipForward
// [4+] timeline dot buttons (one per trace event)
const BTN = { RESET: 0, SKIP_BACK: 1, PLAY: 2, SKIP_FWD: 3 };

// ─── Tests ────────────────────────────────────────────────────────────────

describe('OmniLinkReplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('empty state', () => {
    it('shows no trace events message when traces is empty', () => {
      mockUseOmniTrace.mockReturnValue({ traces: [] });
      render(<OmniLinkReplay workflowId="wf-1" />);
      expect(screen.getByText(/no trace events available/i)).toBeInTheDocument();
    });

    it('passes workflowId to useOmniTrace hook', () => {
      mockUseOmniTrace.mockReturnValue({ traces: [] });
      render(<OmniLinkReplay workflowId="my-workflow-123" />);
      expect(mockUseOmniTrace).toHaveBeenCalledWith('my-workflow-123');
    });
  });

  describe('with trace events', () => {
    beforeEach(() => {
      mockUseOmniTrace.mockReturnValue({ traces: TRACE_EVENTS });
    });

    it('shows OmniLink Replay title', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      expect(screen.getByText(/omnilink replay/i)).toBeInTheDocument();
    });

    it('shows step counter badge (Step 1/3)', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 1/3');
    });

    it('renders slider with max = totalSteps - 1', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      const slider = screen.getByTestId('replay-slider');
      expect(slider).toHaveAttribute('max', '2');
    });

    it('renders playback control buttons', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4); // reset, skip back, play, skip forward
    });
  });

  describe('skip navigation', () => {
    beforeEach(() => {
      mockUseOmniTrace.mockReturnValue({ traces: TRACE_EVENTS });
    });

    it('increments step when Skip Forward is clicked', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      const allBtns = screen.getAllByRole('button');
      fireEvent.click(allBtns[BTN.SKIP_FWD]);
      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 2/3');
    });

    it('does not go below step 1 on Skip Back from start', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      const allBtns = screen.getAllByRole('button');
      fireEvent.click(allBtns[BTN.SKIP_BACK]);
      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 1/3');
    });

    it('does not exceed last step on repeated Skip Forward', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      const allBtns = screen.getAllByRole('button');
      fireEvent.click(allBtns[BTN.SKIP_FWD]); // to step 2
      fireEvent.click(allBtns[BTN.SKIP_FWD]); // to step 3
      fireEvent.click(allBtns[BTN.SKIP_FWD]); // attempt beyond end
      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 3/3');
    });

    it('resets to step 1 when Reset is clicked', () => {
      render(<OmniLinkReplay workflowId="wf-1" />);
      const allBtns = screen.getAllByRole('button');
      fireEvent.click(allBtns[BTN.SKIP_FWD]);
      fireEvent.click(allBtns[BTN.SKIP_FWD]);
      fireEvent.click(allBtns[BTN.RESET]);
      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 1/3');
    });
  });

  describe('slider navigation', () => {
    it('updates current step when slider is changed', () => {
      mockUseOmniTrace.mockReturnValue({ traces: TRACE_EVENTS });
      render(<OmniLinkReplay workflowId="wf-1" />);
      const slider = screen.getByTestId('replay-slider');
      fireEvent.change(slider, { target: { value: '2' } });
      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 3/3');
    });
  });

  describe('auto-playback', () => {
    it('advances steps automatically when Play is clicked', async () => {
      mockUseOmniTrace.mockReturnValue({ traces: TRACE_EVENTS });
      render(<OmniLinkReplay workflowId="wf-1" />);
      const allBtns = screen.getAllByRole('button');

      // Click play → React re-renders → useEffect sets up interval
      await act(async () => { fireEvent.click(allBtns[BTN.PLAY]); });
      // Now advance timers — interval fires → setCurrentStep called
      await act(async () => { vi.advanceTimersByTime(800); });

      expect(screen.getByTestId('badge-secondary')).toHaveTextContent('Step 2/3');
    });

    it('pauses when Pause is clicked during playback', async () => {
      mockUseOmniTrace.mockReturnValue({ traces: TRACE_EVENTS });
      render(<OmniLinkReplay workflowId="wf-1" />);
      const allBtns = screen.getAllByRole('button');

      await act(async () => { fireEvent.click(allBtns[BTN.PLAY]); });
      await act(async () => { vi.advanceTimersByTime(800); }); // step → 2

      // Pause
      await act(async () => { fireEvent.click(allBtns[BTN.PLAY]); });
      // Wait more time — should NOT advance further
      await act(async () => { vi.advanceTimersByTime(1600); });

      expect(screen.getByTestId('badge-secondary').textContent).toMatch(/Step 2\/3/);
    });
  });
});
