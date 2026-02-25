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

function setupMockedReturns(
  integrationsData: any[],
  keyName: string,
  eventIdPrefix: string,
  sourceType: string
) {
  mockedIntegrations.mockResolvedValueOnce(integrationsData);
  mockedKeys.mockResolvedValueOnce([
    {
      id: `k-${eventIdPrefix}`,
      tenant_id: 'u-1',
      integration_id: integrationsData[0].id,
      name: keyName,
      key_prefix: 'pk_',
      scopes: {},
      last_used_at: null,
      revoked_at: null,
      created_at: new Date().toISOString(),
    },
  ]);
  mockedEvents.mockResolvedValueOnce([
    {
      id: `e-${eventIdPrefix}`,
      tenant_id: 'u-1',
      integration_id: integrationsData[0].id,
      api_key_id: `k-${eventIdPrefix}`,
      envelope_id: `env-${eventIdPrefix}`,
      idempotency_key: `idem-${eventIdPrefix}`,
      source: sourceType,
      type: 'sync',
      subject: null,
      time: new Date().toISOString(),
      data: {},
      entity: null,
      received_at: new Date().toISOString(),
    },
  ]);
}

describe('OmniBoard Integrations', () => {
  it('renders connector tiles only from live integration records (no ghost tiles)', async () => {
    setupMockedReturns(
      [
        { id: 'i-1', user_id: 'u-1', name: 'Salesforce', type: 'salesforce', status: 'active', created_at: null },
        { id: 'i-2', user_id: 'u-1', name: 'Slack', type: 'slack', status: 'active', created_at: null },
      ],
      'primary',
      '1',
      'salesforce'
    );

    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Integrations /></QueryClientProvider>);

    expect(await screen.findByTestId('connector-tile-i-1')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-tile-i-2')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-tile-i-3')).not.toBeInTheDocument();
  });

  it('derives LIVE vs NEEDS_AUTH status from key and event records', async () => {
    setupMockedReturns(
      [
        { id: 'i-live', user_id: 'u-1', name: 'HubSpot', type: 'hubspot', status: 'active', created_at: null },
        { id: 'i-needs-auth', user_id: 'u-1', name: 'Notion', type: 'notion', status: 'active', created_at: null },
      ],
      'live',
      'live',
      'hubspot'
    );

    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Integrations /></QueryClientProvider>);

    expect(await screen.findByTestId('connector-status-i-live')).toHaveTextContent('LIVE');
    expect(await screen.findByTestId('connector-status-i-needs-auth')).toHaveTextContent('NEEDS_AUTH');
  });
});
