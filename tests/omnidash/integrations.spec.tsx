import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const mockBoardConnectors: Record<string, { status: string }> = {};
vi.mock('@/stores/omniBoardStore', () => ({
  useOmniBoard: (selector: (s: { connectors: Record<string, unknown> }) => unknown) =>
    selector({ connectors: mockBoardConnectors }),
}));

const mockDispatch = vi.fn();
vi.mock('@/omnidash/useOmniDashAction', () => ({
  useOmniDashAction: () => ({ dispatch: mockDispatch }),
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

function renderWithBoard(
  boardConnectors: Record<string, { status: string }> = {},
) {
  Object.keys(mockBoardConnectors).forEach((k) => delete mockBoardConnectors[k]);
  Object.assign(mockBoardConnectors, boardConnectors);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Integrations /></QueryClientProvider>);
}

describe('OmniBoard Integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockBoardConnectors).forEach((k) => delete mockBoardConnectors[k]);
  });

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

  it('shows "No connector records found" when integration list is empty', async () => {
    mockedIntegrations.mockResolvedValueOnce([]);
    mockedKeys.mockResolvedValueOnce([]);
    mockedEvents.mockResolvedValueOnce([]);
    renderWithBoard();
    expect(await screen.findByTestId('no-connectors-state')).toBeInTheDocument();
  });

  it('derives ERROR status when integration status contains ERROR', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-err', user_id: 'u-1', name: 'Broken App', type: 'broken', status: 'ERROR', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([
      { id: 'k-1', tenant_id: 'u-1', integration_id: 'i-err', name: 'key', key_prefix: 'pk_', scopes: {}, last_used_at: null, revoked_at: null, created_at: new Date().toISOString() },
    ]);
    mockedEvents.mockResolvedValueOnce([]);
    renderWithBoard();
    expect(await screen.findByTestId('connector-status-i-err')).toHaveTextContent('ERROR');
  });

  it('derives PARTIAL status when has active key but no events', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-partial', user_id: 'u-1', name: 'Partial App', type: 'partial', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([
      { id: 'k-1', tenant_id: 'u-1', integration_id: 'i-partial', name: 'key', key_prefix: 'pk_', scopes: {}, last_used_at: null, revoked_at: null, created_at: new Date().toISOString() },
    ]);
    mockedEvents.mockResolvedValueOnce([]);
    renderWithBoard();
    expect(await screen.findByTestId('connector-status-i-partial')).toHaveTextContent('PARTIAL');
  });

  it('shows "degraded" health for an event older than 24 hours', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-deg', user_id: 'u-1', name: 'Old App', type: 'oldapp', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([
      { id: 'k-1', tenant_id: 'u-1', integration_id: 'i-deg', name: 'key', key_prefix: 'pk_', scopes: {}, last_used_at: null, revoked_at: null, created_at: new Date().toISOString() },
    ]);
    mockedEvents.mockResolvedValueOnce([
      { id: 'e-1', tenant_id: 'u-1', integration_id: 'i-deg', api_key_id: 'k-1', envelope_id: 'env-1', idempotency_key: 'idem-1', source: 'oldapp', type: 'sync', subject: null, time: oldDate, data: {}, entity: null, received_at: oldDate },
    ]);
    renderWithBoard();
    await screen.findByTestId('connector-tile-i-deg');
    expect(screen.getByText(/Health: degraded/i)).toBeInTheDocument();
  });

  it('shows "Connect Account" button for NEEDS_AUTH connectors', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-na', user_id: 'u-1', name: 'Unauthed App', type: 'unauthed', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([]);
    mockedEvents.mockResolvedValueOnce([]);
    renderWithBoard();
    await screen.findByTestId('connector-tile-i-na');
    expect(screen.getByText('Connect Account')).toBeInTheDocument();
  });

  it('dispatches OmniDash intent when "Connect Account" is clicked', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-cta', user_id: 'u-1', name: 'Click App', type: 'clickapp', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([]);
    mockedEvents.mockResolvedValueOnce([]);
    renderWithBoard();
    const connectBtn = await screen.findByText('Connect Account');
    fireEvent.click(connectBtn);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('overrides connector status from OmniBoard store when board record is present', async () => {
    mockedIntegrations.mockResolvedValueOnce([
      { id: 'i-board', user_id: 'u-1', name: 'Board App', type: 'boardapp', status: 'active', created_at: null },
    ]);
    mockedKeys.mockResolvedValueOnce([
      { id: 'k-1', tenant_id: 'u-1', integration_id: 'i-board', name: 'key', key_prefix: 'pk_', scopes: {}, last_used_at: null, revoked_at: null, created_at: new Date().toISOString() },
    ]);
    mockedEvents.mockResolvedValueOnce([
      { id: 'e-1', tenant_id: 'u-1', integration_id: 'i-board', api_key_id: 'k-1', envelope_id: 'env-1', idempotency_key: 'idem-1', source: 'boardapp', type: 'sync', subject: null, time: new Date().toISOString(), data: {}, entity: null, received_at: new Date().toISOString() },
    ]);
    // Board store overrides LIVE → NEEDS_AUTH
    renderWithBoard({ boardapp: { status: 'NEEDS_AUTH' } });
    expect(await screen.findByTestId('connector-status-i-board')).toHaveTextContent('NEEDS_AUTH');
  });

  it('shows "Test QuickBooks OAuth" and "Test YouTube PiP" demo cards', async () => {
    mockedIntegrations.mockResolvedValueOnce([]);
    mockedKeys.mockResolvedValueOnce([]);
    mockedEvents.mockResolvedValueOnce([]);
    renderWithBoard();
    expect(await screen.findByText('Test QuickBooks OAuth')).toBeInTheDocument();
    expect(screen.getByText('Test YouTube PiP')).toBeInTheDocument();
  });
});
