import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Integrations from '@/components/omnidash/Integrations';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', email: 'admin@apex.test' } }),
}));

vi.mock('@/omnidash/omnilink-api', () => ({
  fetchOmniLinkIntegrations: vi.fn(),
  fetchOmniLinkKeys: vi.fn(),
  fetchOmniLinkEvents: vi.fn(),
}));

import {
  fetchOmniLinkEvents,
  fetchOmniLinkIntegrations,
  fetchOmniLinkKeys,
} from '@/omnidash/omnilink-api';

const mockedIntegrations = vi.mocked(fetchOmniLinkIntegrations);
const mockedKeys = vi.mocked(fetchOmniLinkKeys);
const mockedEvents = vi.mocked(fetchOmniLinkEvents);

describe('OmniBoard Integrations', () => {
  it('renders connector tiles only from live integration records (no ghost tiles)', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-1', user_id: 'u-1', name: 'Salesforce', type: 'salesforce', status: 'active', created_at: null },
      { id: 'i-2', user_id: 'u-1', name: 'Slack', type: 'slack', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([
      {
        id: 'k-1',
        tenant_id: 'u-1',
        integration_id: 'i-1',
        name: 'primary',
        key_prefix: 'pk_',
        scopes: {},
        last_used_at: null,
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
    ]);
    mockedEvents.mockResolvedValueOnce([
      {
        id: 'e-1',
        tenant_id: 'u-1',
        integration_id: 'i-1',
        api_key_id: 'k-1',
        envelope_id: 'env-1',
        idempotency_key: 'idem-1',
        source: 'salesforce',
        type: 'sync',
        subject: null,
        time: new Date().toISOString(),
        data: {},
        entity: null,
        received_at: new Date().toISOString(),
      },
    ]);

    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Integrations /></QueryClientProvider>);

    expect(await screen.findByTestId('connector-tile-i-1')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-tile-i-2')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-tile-i-3')).not.toBeInTheDocument();
  });

  it('derives LIVE vs NEEDS_AUTH status from key and event records', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-live', user_id: 'u-1', name: 'HubSpot', type: 'hubspot', status: 'active', created_at: null },
      { id: 'i-needs-auth', user_id: 'u-1', name: 'Notion', type: 'notion', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([
      {
        id: 'k-live',
        tenant_id: 'u-1',
        integration_id: 'i-live',
        name: 'live',
        key_prefix: 'pk_',
        scopes: {},
        last_used_at: null,
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
    ]);
    mockedEvents.mockResolvedValueOnce([
      {
        id: 'e-live',
        tenant_id: 'u-1',
        integration_id: 'i-live',
        api_key_id: 'k-live',
        envelope_id: 'env-live',
        idempotency_key: 'idem-live',
        source: 'hubspot',
        type: 'sync',
        subject: null,
        time: new Date().toISOString(),
        data: {},
        entity: null,
        received_at: new Date().toISOString(),
      },
    ]);

    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Integrations /></QueryClientProvider>);

    expect(await screen.findByTestId('connector-status-i-live')).toHaveTextContent('LIVE');
    expect(await screen.findByTestId('connector-status-i-needs-auth')).toHaveTextContent('NEEDS_AUTH');
  });
});
