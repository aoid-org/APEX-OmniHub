import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Integrations from '../../apps/omnihub-site/dashboard/components/Integrations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}));

vi.mock('@/stores/omniBoardStore', () => ({
  useOmniBoard: () => new Map()
}));

vi.mock('@/omnidash/useOmniDashAction', () => ({
  useOmniDashAction: () => ({ dispatch: vi.fn() })
}));

const queryClient = new QueryClient();

describe('OmniLink Semantics', () => {
  it('OmniLink visible UI copy must mean mobile access, not backend integration', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Integrations />
      </QueryClientProvider>
    );
    
    // Check for OmniBoard ownership copy
    expect(screen.getByText('Manage your app stack in OmniBoard')).toBeInTheDocument();
    
    // Check that "connector control plane" is completely removed
    expect(screen.queryByText(/connector control plane/i)).not.toBeInTheDocument();
  });
});
