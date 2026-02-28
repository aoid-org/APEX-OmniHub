import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

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
const sharedQueryClient = createTestQueryClient();

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={sharedQueryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** 
 * Reusable mock factories to reduce SonarCloud code duplication 
 * across the Chaos Battery test suite.
 */

export const mockMonitoringFactory = () => ({
  logError: vi.fn().mockResolvedValue(undefined),
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  initializeMonitoring: vi.fn(),
  trackUserAction: vi.fn(),
});

export const mockDebugLoggerFactory = () => ({
  createDebugLogger: vi.fn(() => vi.fn()),
});

export const mockAuthContextFactory = () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    signOut: vi.fn(),
    loading: false,
  })),
});
