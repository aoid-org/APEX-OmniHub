/**
 * OmniSentryWidget — end-to-end smoke test.
 *
 * Covers the full render path of every wired capability:
 *   1. Disabled state renders correctly
 *   2. Enable toggle calls initializeOmniSentry + shows health metrics
 *   3. Live polling calls getHealthStatus on interval
 *   4. Offline flush button appears only when queue > 0, calls flushOfflineErrors
 *   5. Circuit probe button calls withResilience; reflects closed/open result
 *   6. Disable toggle calls shutdownOmniSentry
 *
 * All omni-sentry lib calls are mocked — no real sessionStorage timers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Mock the omni-sentry runtime BEFORE importing the component ──────────────
const mockInitialize    = vi.fn();
const mockShutdown      = vi.fn();
const mockGetHealth     = vi.fn();
const mockFlush         = vi.fn();
const mockWithResilience = vi.fn();

vi.mock('../../../../src/lib/omni-sentry', () => ({
  initializeOmniSentry: (...args: unknown[]) => mockInitialize(...args),
  shutdownOmniSentry:   (...args: unknown[]) => mockShutdown(...args),
  getHealthStatus:      (...args: unknown[]) => mockGetHealth(...args),
  flushOfflineErrors:   (...args: unknown[]) => mockFlush(...args),
  withResilience:       (...args: unknown[]) => mockWithResilience(...args),
}));

// ── Import AFTER mock is registered ─────────────────────────────────────────
import { OmniSentryWidget } from '../../apps/omnihub-site/dashboard/components/OmniSentryWidget';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const HEALTHY_STATUS = {
  status: 'healthy' as const,
  timestamp: new Date().toISOString(),
  metrics: {
    errorRate: 0,
    circuitState: 'closed' as const,
    memoryUsage: 12.5,
    uptime: 60000,
  },
  diagnostics: [],
};

const DEGRADED_STATUS = {
  ...HEALTHY_STATUS,
  status: 'degraded' as const,
  metrics: { ...HEALTHY_STATUS.metrics, errorRate: 6 },
  diagnostics: ['Elevated error rate'],
};

const OPEN_CIRCUIT_STATUS = {
  ...HEALTHY_STATUS,
  status: 'critical' as const,
  metrics: { ...HEALTHY_STATUS.metrics, circuitState: 'open' as const, errorRate: 12 },
  diagnostics: ['Circuit breaker is open - system in protective mode'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function setOfflineQueue(count: number): void {
  if (count === 0) {
    sessionStorage.removeItem('omni_sentry_offline');
    return;
  }
  const entries = Array.from({ length: count }, (_, i) => ({
    error: { name: 'Error', message: `offline-${i}` },
    timestamp: new Date().toISOString(),
  }));
  sessionStorage.setItem('omni_sentry_offline', JSON.stringify(entries));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('OmniSentryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.removeItem('omni_sentry_enabled');

    mockGetHealth.mockReturnValue(HEALTHY_STATUS);
    mockFlush.mockResolvedValue(0);
    mockWithResilience.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
    localStorage.removeItem('omni_sentry_enabled');
  });

  // ── 1. Disabled state ───────────────────────────────────────────────────────
  it('renders in disabled state with correct testid and no health metrics', () => {
    render(<OmniSentryWidget />);

    expect(screen.getByTestId('omni-sentry-widget')).toBeTruthy();
    expect(screen.getByText('OmniSentry')).toBeTruthy();
    expect(screen.getByText('Enable to activate circuit-breaker monitoring.')).toBeTruthy();
    // Health metrics should NOT be present
    expect(screen.queryByText('Circuit')).toBeNull();
    expect(screen.queryByTestId('omni-sentry-probe-btn')).toBeNull();
  });

  it('does not call initializeOmniSentry on mount when pref is false', () => {
    render(<OmniSentryWidget />);
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  // ── 2. Enable toggle ────────────────────────────────────────────────────────
  it('enable toggle calls initializeOmniSentry and shows health metrics', async () => {
    render(<OmniSentryWidget />);

    const toggle = screen.getByRole('button', { name: 'Enable OmniSentry' });
    await act(async () => { fireEvent.click(toggle); });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Circuit')).toBeTruthy();
    expect(screen.getByText('Errors/min')).toBeTruthy();
    expect(screen.getByText('Memory')).toBeTruthy();
    expect(screen.getByText('Uptime')).toBeTruthy();
  });

  it('enable toggle persists preference to localStorage', async () => {
    render(<OmniSentryWidget />);
    const toggle = screen.getByRole('button', { name: 'Enable OmniSentry' });
    await act(async () => { fireEvent.click(toggle); });

    expect(localStorage.getItem('omni_sentry_enabled')).toBe('true');
  });

  it('hydrates from stored preference and calls initializeOmniSentry on mount', () => {
    localStorage.setItem('omni_sentry_enabled', 'true');
    render(<OmniSentryWidget />);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  // ── 3. Live polling ─────────────────────────────────────────────────────────
  it('polls getHealthStatus every 5 s while enabled', async () => {
    render(<OmniSentryWidget />);
    const toggle = screen.getByRole('button', { name: 'Enable OmniSentry' });
    await act(async () => { fireEvent.click(toggle); });

    const callsAfterEnable = mockGetHealth.mock.calls.length;

    act(() => { vi.advanceTimersByTime(5000); });
    expect(mockGetHealth.mock.calls.length).toBeGreaterThan(callsAfterEnable);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(mockGetHealth.mock.calls.length).toBeGreaterThan(callsAfterEnable + 1);
  });

  it('shows degraded status badge when health is degraded', async () => {
    mockGetHealth.mockReturnValue(DEGRADED_STATUS);
    render(<OmniSentryWidget />);
    const toggle = screen.getByRole('button', { name: 'Enable OmniSentry' });
    await act(async () => { fireEvent.click(toggle); });

    expect(screen.getByText('degraded')).toBeTruthy();
  });

  it('shows diagnostics row when health has diagnostics', async () => {
    mockGetHealth.mockReturnValue(DEGRADED_STATUS);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    expect(screen.getByText('Elevated error rate')).toBeTruthy();
  });

  // ── 4. Flush offline errors ─────────────────────────────────────────────────
  it('flush button does NOT appear when offline queue is empty', async () => {
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    expect(screen.queryByTestId('omni-sentry-flush-btn')).toBeNull();
  });

  it('flush button appears when offline queue has errors', async () => {
    setOfflineQueue(3);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    expect(screen.getByTestId('omni-sentry-flush-btn')).toBeTruthy();
    expect(screen.getByText('Flush 3 Offline Errors')).toBeTruthy();
  });

  it('flush button calls flushOfflineErrors and shows flushed count', async () => {
    setOfflineQueue(2);
    mockFlush.mockResolvedValue(2);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    const flushBtn = screen.getByTestId('omni-sentry-flush-btn');
    await act(async () => { fireEvent.click(flushBtn); });

    expect(mockFlush).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText('✓ Flushed 2')).toBeTruthy();
    });
  });

  it('flush button label handles singular correctly', async () => {
    setOfflineQueue(1);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    expect(screen.getByText('Flush 1 Offline Error')).toBeTruthy();
  });

  // ── 5. Circuit probe (withResilience) ───────────────────────────────────────
  it('probe button is present when enabled', async () => {
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    expect(screen.getByTestId('omni-sentry-probe-btn')).toBeTruthy();
    expect(screen.getByText('Probe Circuit')).toBeTruthy();
  });

  it('probe button calls withResilience and shows passed result', async () => {
    mockWithResilience.mockResolvedValue(true);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    const probeBtn = screen.getByTestId('omni-sentry-probe-btn');
    await act(async () => { fireEvent.click(probeBtn); });

    expect(mockWithResilience).toHaveBeenCalledTimes(1);
    // Verify correct operation name passed
    expect(mockWithResilience).toHaveBeenCalledWith(
      expect.any(Function),
      'sidebar-circuit-probe',
    );
    await waitFor(() => {
      expect(screen.getByText('✓ Circuit Closed')).toBeTruthy();
    });
  });

  it('probe shows skipped when circuit is open (withResilience returns null)', async () => {
    mockWithResilience.mockResolvedValue(null);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    await act(async () => { fireEvent.click(screen.getByTestId('omni-sentry-probe-btn')); });

    await waitFor(() => {
      expect(screen.getByText('⚡ Circuit Open')).toBeTruthy();
    });
  });

  // ── 6. Disable toggle ───────────────────────────────────────────────────────
  it('disable toggle calls shutdownOmniSentry and hides health metrics', async () => {
    render(<OmniSentryWidget />);

    // Enable first
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });
    expect(screen.getByText('Circuit')).toBeTruthy();

    // Now disable
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Disable OmniSentry' })); });

    expect(mockShutdown).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('omni_sentry_enabled')).toBe('false');
    // Health grid gone
    expect(screen.queryByText('Circuit')).toBeNull();
  });

  // ── 7. Open circuit state ───────────────────────────────────────────────────
  it('shows critical status and open circuit metrics correctly', async () => {
    mockGetHealth.mockReturnValue(OPEN_CIRCUIT_STATUS);
    render(<OmniSentryWidget />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enable OmniSentry' })); });

    expect(screen.getByText('critical')).toBeTruthy();
    expect(screen.getByText('open')).toBeTruthy();
    expect(screen.getByText('Circuit breaker is open - system in protective mode')).toBeTruthy();
  });
});
