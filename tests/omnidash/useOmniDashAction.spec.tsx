import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { OmniDashIntent } from '@omnihub/hooks/useOmniDashAction';
import { useOmniDashAction } from '@omnihub/hooks/useOmniDashAction';
import { useOmniBoard } from '@omnihub/stores/omniBoardStore';
import { useOmniModal } from '@omnihub/stores/omniModalStore';

const mockSupabaseInvoke = vi.fn();

vi.mock('@omnihub/stores/omniBoardStore', () => ({
  useOmniBoard: vi.fn(),
}));

vi.mock('@omnihub/stores/omniModalStore', () => ({
  useOmniModal: {
    getState: vi.fn(() => ({ invoke: vi.fn() })),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockSupabaseInvoke(...args),
    },
  },
}));

const makeIntent = (overrides: Partial<OmniDashIntent> = {}): OmniDashIntent => ({
  source: 'integration',
  appKey: 'quickbooks',
  provider: 'QuickBooks',
  label: 'QuickBooks',
  category: 'operations',
  routePath: '/omnidash/integrations/quickbooks',
  dashboardStatus: 'Partial',
  ...overrides,
});

const setupStores = () => {
  const hydrateConnector = vi.fn();
  const setConnectorStatus = vi.fn();
  const invoke = vi.fn();

  vi.mocked(useOmniBoard).mockImplementation((selector) => {
    const state = {
      hydrateConnector,
      setConnectorStatus,
    };
    return selector(state as any);
  });

  vi.mocked(useOmniModal.getState).mockReturnValue({ invoke } as any);

  return { hydrateConnector, setConnectorStatus, invoke };
};

describe('useOmniDashAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens module modal (no navigation) when source is "module"', () => {
    const mockNavigate = vi.fn();
    const { invoke } = setupStores();

    const { result } = renderHook(() => useOmniDashAction(mockNavigate));

    result.current.dispatch(
      makeIntent({
        source: 'module',
        appKey: 'fortress',
        provider: 'Fortress',
        label: 'Fortress',
        category: 'security',
        routePath: '/omnidash/fortress',
        dashboardStatus: 'Live',
      }),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledTimes(1);
    const config = invoke.mock.calls[0][0];
    expect(config.type).toBe('module');
    expect(config.provider).toBe('Fortress');
    expect(config.priority).toBe('medium');
  });

  it('dispatches oauth invoke and hydrates connector via backend exchange', async () => {
    const { invoke, hydrateConnector, setConnectorStatus } = setupStores();
    mockSupabaseInvoke.mockResolvedValue({
      data: {
        connector_id: 'conn-1',
        expires_at: 12345,
        secretToken: 'redacted',
        apiKey: 'redacted',
        safeField: 'kept',
      },
      error: null,
    });

    const { result } = renderHook(() => useOmniDashAction());
    result.current.dispatch(makeIntent());

    expect(invoke).toHaveBeenCalledTimes(1);
    const config = invoke.mock.calls[0][0];
    expect(config.type).toBe('oauth');
    expect(config.title).toBe('Connect QuickBooks');
    expect(config.priority).toBe('high');

    await config.onComplete({ authorizationCode: 'abc' });

    expect(setConnectorStatus).toHaveBeenCalledWith('quickbooks', 'CONNECTING');
    expect(mockSupabaseInvoke).toHaveBeenCalledWith('apex-agent', {
      body: {
        action: 'oauth_exchange',
        provider: 'quickbooks',
        auth_payload: { authorizationCode: 'abc' },
      },
    });

    const hydrated = hydrateConnector.mock.calls[0][0] as {
      id: string;
      metadata: Record<string, unknown>;
      proxyTokenExpiry: number | null;
    };
    expect(hydrated.id).toBe('conn-1');
    expect(hydrated.proxyTokenExpiry).toBe(12345);
    expect(hydrated.metadata.safeField).toBe('kept');
    expect(hydrated.metadata.secretToken).toBeUndefined();
    expect(hydrated.metadata.apiKey).toBe('redacted');

    config.onCancel();
    expect(setConnectorStatus).toHaveBeenCalledWith('quickbooks', 'NEEDS_AUTH');
  });

  it('marks connector as ERROR when oauth exchange fails', async () => {
    const { invoke, setConnectorStatus } = setupStores();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabaseInvoke.mockResolvedValue({
      data: null,
      error: new Error('exchange failed'),
    });

    const { result } = renderHook(() => useOmniDashAction());
    result.current.dispatch(makeIntent());

    const config = invoke.mock.calls[0][0];
    await config.onComplete({ authorizationCode: 'bad-code' });

    expect(setConnectorStatus).toHaveBeenCalledWith('quickbooks', 'CONNECTING');
    expect(setConnectorStatus).toHaveBeenCalledWith('quickbooks', 'ERROR');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('uses spatial render mode for supported app types and avoids backend exchange', async () => {
    const { invoke, hydrateConnector, setConnectorStatus } = setupStores();

    const { result } = renderHook(() => useOmniDashAction());
    result.current.dispatch(
      makeIntent({
        source: 'module',
        appKey: 'omni-media',
        provider: 'Omni Media',
        label: 'Omni Media',
        dashboardStatus: 'Live',
        contextData: { appType: 'media' },
      }),
    );

    const config = invoke.mock.calls[0][0];
    expect(config.type).toBe('form');
    expect(config.renderMode).toBe('spatial');
    expect(config.priority).toBe('medium');

    await config.onComplete({ token: 'hide-this', useful: 'value' });

    expect(setConnectorStatus).toHaveBeenCalledWith('omni-media', 'CONNECTING');
    expect(mockSupabaseInvoke).not.toHaveBeenCalled();

    const hydrated = hydrateConnector.mock.calls[0][0] as {
      metadata: { renderMode: string; launchPayload: Record<string, unknown> };
    };
    expect(hydrated.metadata.renderMode).toBe('spatial');
    expect(hydrated.metadata.launchPayload.useful).toBe('value');
    expect(hydrated.metadata.launchPayload.token).toBeUndefined();
  });

  it('uses microfrontend type when entryUrl is provided', () => {
    const { invoke } = setupStores();

    const { result } = renderHook(() => useOmniDashAction());
    result.current.dispatch(
      makeIntent({
        dashboardStatus: 'Live',
        contextData: { entryUrl: 'https://example.app/embed' },
      }),
    );

    const config = invoke.mock.calls[0][0];
    expect(config.type).toBe('microfrontend');
    expect(config.priority).toBe('medium');
  });
});
