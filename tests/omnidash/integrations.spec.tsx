import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Integrations from '@/components/omnidash/Integrations';
import type { OmniLinkIntegration } from '@/omnidash/types';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', email: 'admin@apex.test' } }),
}));

vi.mock('@/omnidash/omnilink-api', () => ({
  fetchOmniLinkIntegrations: vi.fn(),
  fetchOmniLinkKeys: vi.fn(),
  fetchOmniLinkEvents: vi.fn(),
}));

vi.mock('@/stores/omniBoardStore', () => ({
  useOmniBoard: (selector: (s: { connectors: Record<string, unknown> }) => unknown) =>
    selector({ connectors: {} }),
}));

vi.mock('@/omnidash/useOmniDashAction', () => ({
  useOmniDashAction: () => ({ dispatch: vi.fn() }),
}));

vi.mock('@/stores/omniMediaStore', () => ({
  useOmniMedia: () => ({ loadMedia: vi.fn() }),
}));

import {
  fetchOmniLinkEvents,
  fetchOmniLinkIntegrations,
  fetchOmniLinkKeys,
} from '@/omnidash/omnilink-api';

const mockedIntegrations = vi.mocked(fetchOmniLinkIntegrations);
const mockedKeys = vi.mocked(fetchOmniLinkKeys);
const mockedEvents = vi.mocked(fetchOmniLinkEvents);

const createMockKey = (idPrefix: string, integrationId: string, keyName: string) => ({
  id: `k-${idPrefix}`,
  tenant_id: 'u-1',
  integration_id: integrationId,
  name: keyName,
  key_prefix: 'pk_',
  scopes: {},
  last_used_at: null,
  revoked_at: null,
  created_at: new Date().toISOString(),
});

const createMockEvent = (idPrefix: string, integrationId: string, sourceType: string) => ({
  id: `e-${idPrefix}`,
  tenant_id: 'u-1',
  integration_id: integrationId,
  api_key_id: `k-${idPrefix}`,
  envelope_id: `env-${idPrefix}`,
  idempotency_key: `idem-${idPrefix}`,
  source: sourceType,
  type: 'sync',
  subject: null,
  time: new Date().toISOString(),
  data: {},
  entity: null,
  received_at: new Date().toISOString(),
});

function setupAndRenderIntegrations(
  integrationsData: OmniLinkIntegration[],
  keyName: string,
  eventIdPrefix: string,
  sourceType: string
) {
  mockedIntegrations.mockResolvedValueOnce(integrationsData);
  mockedKeys.mockResolvedValueOnce([createMockKey(eventIdPrefix, String(integrationsData[0].id), keyName)]);
  mockedEvents.mockResolvedValueOnce([createMockEvent(eventIdPrefix, String(integrationsData[0].id), sourceType)]);
  
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><Integrations /></QueryClientProvider>);
}

describe('OmniBoard Integrations', () => {
  it('renders connector tiles only from live integration records (no ghost tiles)', async () => {
    setupAndRenderIntegrations(
      [
        { id: 'i-1', user_id: 'u-1', name: 'Salesforce', type: 'salesforce', status: 'active', created_at: null },
        { id: 'i-2', user_id: 'u-1', name: 'Slack', type: 'slack', status: 'active', created_at: null },
      ],
      'primary',
      '1',
      'salesforce'
    );

    expect(await screen.findByTestId('connector-tile-i-1')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-tile-i-2')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-tile-i-3')).not.toBeInTheDocument();
  });

  it('derives LIVE vs NEEDS_AUTH status from key and event records', async () => {
    setupAndRenderIntegrations(
      [
        { id: 'i-live', user_id: 'u-1', name: 'HubSpot', type: 'hubspot', status: 'active', created_at: null },
        { id: 'i-needs-auth', user_id: 'u-1', name: 'Notion', type: 'notion', status: 'active', created_at: null },
      ],
      'live',
      'live',
      'hubspot'
    );

    expect(await screen.findByTestId('connector-status-i-live')).toHaveTextContent('LIVE');
    expect(await screen.findByTestId('connector-status-i-needs-auth')).toHaveTextContent('NEEDS_AUTH');
  });
});
