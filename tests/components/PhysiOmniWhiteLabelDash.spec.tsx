/**
 * PhysiOmniWhiteLabelDash — Unit Tests
 * Tests high-fidelity component rendering, connection status transitions,
 * stats computation, charts, event feeds, and Supabase subscription linking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb) => {
    cb('SUBSCRIBED');
    return mockChannel;
  }),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

// Recharts is globally mocked via vitest.config.ts alias

// ─── Import after mocks ───────────────────────────────────────────────────

import PhysiOmniWhiteLabelDash from '../../apps/omnihub-site/src/components/physiomni/PhysiOmniWhiteLabelDash';

// ─── Tests ────────────────────────────────────────────────────────────────

describe('PhysiOmniWhiteLabelDash', () => {
  const defaultProps = {
    tenantLogoUrl: 'https://example.com/logo.png',
    brandHexColor: '#00ffcc',
    tenantId: 'e28bbd91-4cf6-4444-8d4e-120a1337beef',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders top nav with tenant logo and powered by indicator', () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    const logoEl = screen.getByAltText('Tenant Logo');
    expect(logoEl).toBeInTheDocument();
    expect(logoEl).toHaveAttribute('src', 'https://example.com/logo.png');
    expect(screen.getByText('PhysiOmni')).toBeInTheDocument();
    expect(screen.getByText('Powered by APEX-OmniHub')).toBeInTheDocument();
  });

  it('displays connection status transitions correctly', async () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    
    // Initial status should be "Connecting..."
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    // Advance fake timers to simulate connection stabilizer
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders the telemetry stats row successfully', () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    expect(screen.getByText('Avg Vibration')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Data Points')).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
  });

  it('displays correct data points count (60)', () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('renders line chart successfully', () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders standard and critical events in OmniTrace feed', () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    expect(screen.getByText('OmniTrace Event Feed')).toBeInTheDocument();
    
    // Critical alert message check
    expect(
      screen.getByText(/exceeds 15.0g threshold. MAN Mode triggered./i)
    ).toBeInTheDocument();

    // Warning alert message check
    expect(
      screen.getByText(/Elevated vibration_y=11.2g on bearing assembly/i)
    ).toBeInTheDocument();
  });

  it('correctly filters and counts unacknowledged critical events', () => {
    render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    
    // 2 unacknowledged events in total, but only 1 is critical
    const criticalUnackedBadge = screen.getByText('1');
    expect(criticalUnackedBadge).toBeInTheDocument();
  });

  it('correctly maps styles using CSS custom properties', () => {
    const { container } = render(<PhysiOmniWhiteLabelDash {...defaultProps} />);
    const rootDiv = container.firstChild as HTMLDivElement;
    expect(rootDiv).toHaveStyle('--brand-color: #00ffcc');
  });
});
