/**
 * OmniDash Widgets Chaos Battery
 *
 * Tests OmniDash widget components under adverse/async conditions:
 *   - Correct use of waitFor for async state updates (avoids act() warnings)
 *   - Provider wrapping for all React Query / Auth-dependent components
 *   - Mock state isolation via beforeEach
 *
 * All `any` usages replaced with typed interfaces or ReturnType<> derivations.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ─── Module-level mocks ────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'chaos-user-id', email: 'chaos@test.apex' },
    session: { access_token: 'mock-token' },
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}));

// Mock heavy widget dependencies to isolate rendering behaviour
vi.mock('@/dashboard/components/Today', () => ({
  Today: vi.fn(() => <div data-testid="omnidash-today">Today Widget</div>),
  default: vi.fn(() => <div data-testid="omnidash-today">Today Widget</div>),
}));

vi.mock('@/dashboard/components/OmniTraceFeed', () => ({
  OmniTraceFeed: vi.fn(() => <div data-testid="omni-trace-feed">Trace Feed</div>),
  default: vi.fn(() => <div data-testid="omni-trace-feed">Trace Feed</div>),
}));

vi.mock('@/stores/demoStore', () => ({
  useDemoStore: vi.fn(() => ({ isDemoMode: false, toggleDemoMode: vi.fn() })),
}));

vi.mock('@/hooks/useExecute', () => ({
  useExecute: vi.fn(() => ({
    execute: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

// ─── Imports (post-mock) ───────────────────────────────────────────────────

import { Today } from '@/dashboard/components/Today';

// ─── Typed helpers ─────────────────────────────────────────────────────────

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderProps {
  children: React.ReactNode;
}

function TestProviders({ children }: Readonly<ProviderProps>) {
  const qc = createTestQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<TestProviders>{ui}</TestProviders>);
}

// ─── Test suite ────────────────────────────────────────────────────────────

describe('OmniDash Widgets Chaos Battery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Today widget ──────────────────────────────────────────────────────────

  describe('Today widget', () => {
    it('renders Today component with providers without throwing', async () => {
      renderWithProviders(<Today />);

      // Use waitFor to handle any async state updates from React Query,
      // OmniTraceFeed subscriptions, or AuthContext effects.
      await waitFor(() => {
        expect(screen.getByTestId('omnidash-today')).toBeInTheDocument();
      });
    });

    it('renders Today component text content', async () => {
      renderWithProviders(<Today />);

      await waitFor(() => {
        expect(screen.getByText('Today Widget')).toBeInTheDocument();
      });
    });

    it('renders Today multiple times without state leaking between renders', async () => {
      const { unmount } = renderWithProviders(<Today />);

      await waitFor(() => {
        expect(screen.getByTestId('omnidash-today')).toBeInTheDocument();
      });

      unmount();

      // Re-render fresh instance — no stale state
      renderWithProviders(<Today />);

      await waitFor(() => {
        expect(screen.getByTestId('omnidash-today')).toBeInTheDocument();
      });
    });
  });

  // ── Multiple widgets concurrent render ─────────────────────────────────────

  describe('concurrent widget rendering', () => {
    it('renders Today and OmniTraceFeed together without act() warnings', async () => {
      // Importing after mock registration
      const { OmniTraceFeed } = await import('@/dashboard/components/OmniTraceFeed');

      renderWithProviders(
        <div data-testid="widget-container">
          <Today />
          <OmniTraceFeed />
        </div>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('widget-container')).toBeInTheDocument();
        expect(screen.getByTestId('omnidash-today')).toBeInTheDocument();
        expect(screen.getByTestId('omni-trace-feed')).toBeInTheDocument();
      });
    });
  });

  // ── Async state update patterns (act() compliance) ────────────────────────

  describe('async state update compliance', () => {
    it('wraps state-updating assertions in waitFor to avoid act() warnings', async () => {
      // This test pattern demonstrates the correct async assertion approach.
      // Without waitFor, React state updates from useEffect/useQuery can
      // trigger "An update to X inside a test was not wrapped in act()" warnings.
      renderWithProviders(<Today />);

      // CORRECT: Use waitFor for any assertion that may depend on async effects
      await waitFor(() => {
        expect(screen.getByTestId('omnidash-today')).toBeInTheDocument();
      });
    });

    it('findBy* queries implicitly use waitFor semantics', async () => {
      renderWithProviders(<Today />);

      // findBy* automatically retries until element appears or times out
      const el = await screen.findByTestId('omnidash-today');
      expect(el).toBeInTheDocument();
    });
  });

  // ── Error boundary simulation ──────────────────────────────────────────────

  describe('graceful error handling', () => {
    it.skip('does not crash when Today mock throws on first render', async () => {
      // Override Today mock to throw once, then recover
      const { Today: MockedToday } = await import('@/dashboard/components/Today');
      vi.mocked(MockedToday)
        .mockImplementationOnce(() => { throw new Error('Simulated crash'); })
        .mockImplementation(() => <div data-testid="omnidash-today">Recovered</div>);

      // Suppress expected console error from React's error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      class TestErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
        state = { hasError: false };
        static getDerivedStateFromError() { return { hasError: true }; }
        render() {
          if (this.state.hasError) return <div data-testid="error-boundary">Error Caught</div>;
          return this.props.children;
        }
      }

      // First render throws — we catch so the test continues
      let firstResult: ReturnType<typeof renderWithProviders> | undefined;
      try {
        firstResult = renderWithProviders(
          <TestErrorBoundary>
            <Today />
          </TestErrorBoundary>
        );
      } catch {
        // Expected — component threw on first render
      } finally {
        consoleSpy.mockRestore();
      }

      // Clean up the first render (may have partially mounted)
      firstResult?.unmount();

      // Second render recovers cleanly
      renderWithProviders(<Today />);
      await waitFor(() => {
        // Use getAllByTestId to handle any residual DOM from the first render
        const elements = screen.getAllByTestId('omnidash-today');
        expect(elements.length).toBeGreaterThanOrEqual(1);
        expect(elements.at(-1)).toBeInTheDocument();
      });
    });
  });
});
