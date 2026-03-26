import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOmniBoard } from '@/stores/omniBoardStore';

describe('omniBoardStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useOmniBoard.setState({
      integrations: new Map(),
      connectors: new Map(),
      activeApp: null,
      isTransitioning: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('hydrates and removes integrations', () => {
    const store = useOmniBoard.getState();
    store.hydrateIntegration({
      provider: 'GitHub',
      scopes: ['repo:read'],
      data: { ignored: true },
    });

    expect(useOmniBoard.getState().integrations.has('GitHub')).toBe(true);
    const integration = useOmniBoard.getState().integrations.get('GitHub');
    expect(integration?.status).toBe('active');
    expect(integration?.scopes).toEqual(['repo:read']);

    store.removeIntegration('GitHub');
    expect(useOmniBoard.getState().integrations.has('GitHub')).toBe(false);
  });

  it('rejects invalid integration hydration payloads', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useOmniBoard.getState().hydrateIntegration({ provider: '' });

    expect(useOmniBoard.getState().integrations.size).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('hydrates connectors and updates connector status', () => {
    const connector = {
      id: 'conn-1',
      provider: 'Google',
      appKey: 'google-mail',
      status: 'CONNECTING' as const,
      proxyTokenExpiry: null,
      syncedAt: Date.now(),
      metadata: { region: 'us' },
    };

    const store = useOmniBoard.getState();
    store.hydrateConnector(connector);

    const saved = useOmniBoard.getState().connectors.get('google-mail');
    expect(saved?.status).toBe('CONNECTING');
    expect(saved?.metadata).toEqual({ region: 'us' });

    store.setConnectorStatus('google-mail', 'LIVE');
    expect(useOmniBoard.getState().connectors.get('google-mail')?.status).toBe('LIVE');

    store.setConnectorStatus('missing', 'ERROR');
    expect(useOmniBoard.getState().connectors.has('missing')).toBe(false);
  });

  it('mounts active app, transitions render state, and settles transition timers', () => {
    const store = useOmniBoard.getState();
    store.mountActiveApp({
      id: 'app-1',
      provider: 'OmniDash',
      renderState: 'sandbox',
      payload: { value: 1 },
    });

    expect(useOmniBoard.getState().activeApp?.id).toBe('app-1');
    expect(useOmniBoard.getState().isTransitioning).toBe(true);

    store.transitionRenderState('spatial');
    expect(useOmniBoard.getState().activeApp?.renderState).toBe('spatial');
    expect(useOmniBoard.getState().isTransitioning).toBe(true);

    vi.advanceTimersByTime(401);
    expect(useOmniBoard.getState().isTransitioning).toBe(false);
  });

  it('handles invalid active app config and clearActiveApp reset', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useOmniBoard.getState().mountActiveApp({
      id: '',
      provider: 'OmniDash',
      renderState: 'sandbox',
      payload: {},
    } as unknown as {
      id: string;
      provider: string;
      renderState: 'idle' | 'sandbox' | 'spatial';
      payload: Record<string, unknown>;
    });

    expect(useOmniBoard.getState().activeApp).toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    useOmniBoard.getState().mountActiveApp({
      id: 'app-2',
      provider: 'OmniDash',
      renderState: 'idle',
      payload: {},
    });
    expect(useOmniBoard.getState().activeApp).not.toBeNull();

    useOmniBoard.getState().clearActiveApp();
    expect(useOmniBoard.getState().activeApp).toBeNull();
    expect(useOmniBoard.getState().isTransitioning).toBe(false);
  });

  it('ignores transitionRenderState when no active app is mounted', () => {
    useOmniBoard.getState().transitionRenderState('spatial');
    expect(useOmniBoard.getState().activeApp).toBeNull();
    expect(useOmniBoard.getState().isTransitioning).toBe(false);
  });
});

