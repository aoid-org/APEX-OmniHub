import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ============================================================================
// Shared test infrastructure for the OmniLink Chaos Battery test suite.
//
// This file is the single source of truth for:
//   - renderWithProviders wrapper
//   - All reusable mock factories (monitoring, debug-logger, auth, supabase,
//     access, demoStore, heartbeat, wagmi, wallet verification, agentPrefs,
//     omniModal, omnilink-api, HiddenMetric)
//
// Every chaos test file MUST import from here instead of re-declaring mocks.
// ============================================================================

/**
 * Creates a standard React Query client designed for testing, with retries
 * and garbage collection disabled.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
}

/**
 * Renders a component wrapped in the standard providers needed for OmniLink tests.
 */
export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Mock factories — each returns the static mock object for vi.mock()
// ---------------------------------------------------------------------------

/** @/lib/monitoring */
export const mockMonitoringFactory = () => ({
  logError: vi.fn().mockResolvedValue(undefined),
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  initializeMonitoring: vi.fn(),
  trackUserAction: vi.fn(),
});

/** @/lib/debug-logger */
export const mockDebugLoggerFactory = () => ({
  createDebugLogger: vi.fn(() => vi.fn()),
});

/** @/contexts/AuthContext — authenticated user by default */
export const mockAuthContextFactory = () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    signOut: vi.fn(),
    loading: false,
  })),
});

/** @/contexts/AccessContext */
export const mockAccessContextFactory = () => ({
  useAccess: vi.fn(() => ({
    isDemo: true,
    setDemoMode: vi.fn(),
    userScopes: ['public', 'authenticated', 'demo'],
    isAuthenticated: true,
    isAdmin: false,
  })),
  useCanAccess: vi.fn(() => true),
});

/** @/guardian/heartbeat */
export const mockHeartbeatFactory = () => ({
  getLoopStatuses: vi.fn(() => []),
});

/**
 * @/integrations/supabase/client — full Supabase mock with auth, from, channel.
 * Accepts optional overrides for getSession and from() return.
 */
export const mockSupabaseFactory = () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
});

/** wagmi — disconnected state by default */
export const mockWagmiFactory = () => ({
  useConnect: vi.fn(() => ({
    connectors: [],
    connect: vi.fn(),
    isPending: false,
  })),
  useAccount: vi.fn(() => ({
    isConnected: false,
    address: undefined,
    chainId: undefined,
  })),
  useSignMessage: vi.fn(() => ({
    signMessageAsync: vi.fn(),
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
  })),
});

/** @/hooks/useWalletVerification */
export const mockWalletVerificationFactory = () => ({
  useWalletVerification: vi.fn(() => ({
    walletState: { status: 'disconnected', isVerified: false },
    verify: vi.fn(),
    disconnect: vi.fn(),
    address: undefined,
    isConnected: false,
    chainId: undefined,
  })),
});

/** @/stores/omniModalStore */
export const mockOmniModalFactory = () => ({
  useOmniModal: vi.fn(() => ({
    invoke: vi.fn(),
    dismiss: vi.fn(),
    isOpen: false,
    modal: null,
  })),
});

/** @/omnidash/agentPrefs */
export const mockAgentPrefsFactory = () => ({
  readAgentPrefs: vi.fn(() => ({ persona: 'Navigator' })),
});

/** @/components/omnidash/HiddenMetric — cuts Radix Tooltip dependency */
export const mockHiddenMetricFactory = () => ({
  default: () => null,
  HiddenMetric: () => null,
});

/** @/stores/demoStore */
export const mockDemoStoreFactory = () => ({
  useDemoStore: vi.fn(() => ({
    entities: [],
    events: [],
    runs: [],
    tasks: [],
    kpis: [],
    pipeline: [],
    approvals: [],
    addEntity: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    addEvent: vi.fn(),
    approveItem: vi.fn(),
    rejectItem: vi.fn(),
    reset: vi.fn(),
  })),
});

/** @/omnidash/omnilink-api */
export const mockOmnilinkApiFactory = () => ({
  fetchOmniTraceRuns: vi.fn(),
  fetchOmniTraceRunDetail: vi.fn(),
});
