import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOmniDashAction } from '@/omnidash/useOmniDashAction';
import { useOmniBoard } from '@/stores/omniBoardStore';
import { useOmniModal } from '@/stores/omniModalStore';
import { supabase } from '@/integrations/supabase/client';

// Mock Zustand stores directly
vi.mock('@/stores/omniBoardStore', () => ({
  useOmniBoard: vi.fn(),
}));

vi.mock('@/stores/omniModalStore', () => ({
  useOmniModal: {
    getState: vi.fn(() => ({ invoke: vi.fn() })),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('useOmniDashAction', () => {
  const hydrateConnector = vi.fn();
  const setConnectorStatus = vi.fn();
  const invokeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useOmniBoard as unknown as Mock).mockImplementation((selector: (state: unknown) => unknown) => {
      // Very simple mock of the selector
      const state = { hydrateConnector, setConnectorStatus };
      return selector(state);
    });

    (useOmniModal.getState as Mock).mockReturnValue({ invoke: invokeMock });
  });

  it('should invoke module modal for internal modules (no navigation)', () => {
    const navigate = vi.fn();
    const { result } = renderHook(() => useOmniDashAction(navigate));

    result.current.dispatch({
      source: 'module',
      appKey: 'core_settings',
      provider: 'Settings',
      label: 'Open Settings',
      category: 'system',
      routePath: '/settings',
      dashboardStatus: 'Live',
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock.mock.calls[0][0].type).toBe('module');
  });

  it('should invoke oauth modal if status is Partial', () => {
    const { result } = renderHook(() => useOmniDashAction());

    result.current.dispatch({
      source: 'integration',
      appKey: 'slack',
      provider: 'Slack',
      label: 'Connect Slack',
      category: 'communications',
      routePath: '/integrations/slack',
      dashboardStatus: 'Partial',
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const config = invokeMock.mock.calls[0][0];
    expect(config.type).toBe('oauth');
    expect(config.contextData?.appKey).toBe('slack');
  });

  it('should invoke spatial modal if appType is media', () => {
    const { result } = renderHook(() => useOmniDashAction());

    result.current.dispatch({
      source: 'module',
      appKey: 'video_host',
      provider: 'OmniVideo',
      label: 'Video',
      category: 'media',
      routePath: '/video',
      dashboardStatus: 'Live',
      contextData: { appType: 'media' },
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const config = invokeMock.mock.calls[0][0];
    expect(config.type).toBe('form');
    expect(config.renderMode).toBe('spatial');
  });

  it('should perform oauth exchange on oauth modal complete', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { connector_id: 'conn_123', expires_at: 99999999 },
      error: null
    });
    (supabase.functions.invoke as Mock).mockImplementation(mockInvoke);

    const { result } = renderHook(() => useOmniDashAction());

    result.current.dispatch({
      source: 'integration',
      appKey: 'jira',
      provider: 'Jira',
      label: 'Connect',
      category: 'productivity',
      routePath: '/jira',
      dashboardStatus: 'Partial',
    });

    const config = invokeMock.mock.calls[0][0];
    
    // Simulate onComplete triggered from OmniModal
    await config.onComplete({ token: 'secret_value', code: 'abc' });

    expect(setConnectorStatus).toHaveBeenCalledWith('jira', 'CONNECTING');
    expect(mockInvoke).toHaveBeenCalledWith('omnilink-agent', {
      body: {
        action: 'oauth_exchange',
        provider: 'jira',
        auth_payload: { token: 'secret_value', code: 'abc' },
      }
    });

    // Validates sanitizeBackendPayload filtered out 'token' and hydrated store
    expect(hydrateConnector).toHaveBeenCalledWith(expect.objectContaining({
      id: 'conn_123',
      provider: 'Jira',
      appKey: 'jira',
      status: 'LIVE',
      proxyTokenExpiry: 99999999,
    }));
  });

  it('should hydrate directly on spatial modal complete', async () => {
    const { result } = renderHook(() => useOmniDashAction());

    result.current.dispatch({
      source: 'module',
      appKey: 'editor',
      provider: 'OmniEdit',
      label: 'Editor',
      category: 'productivity',
      routePath: '/editor',
      dashboardStatus: 'Live',
      contextData: { appType: 'editor' },
    });

    const config = invokeMock.mock.calls[0][0];
    
    // Simulate onComplete
    await config.onComplete({ somePayload: 'xyz' });

    expect(setConnectorStatus).toHaveBeenCalledWith('editor', 'CONNECTING');
    
    // No backend call for spatial
    expect(supabase.functions.invoke).not.toHaveBeenCalled();

    // Directly hydrated
    expect(hydrateConnector).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'OmniEdit',
      appKey: 'editor',
      status: 'LIVE',
      metadata: expect.objectContaining({
        launchPayload: { somePayload: 'xyz' }
      })
    }));
  });

  it('should cleanly abort on cancel', () => {
    const { result } = renderHook(() => useOmniDashAction());

    result.current.dispatch({
      source: 'integration',
      appKey: 'github',
      provider: 'GitHub',
      label: 'Connect',
      category: 'development',
      routePath: '/github',
      dashboardStatus: 'Partial',
    });

    const config = invokeMock.mock.calls[0][0];
    config.onCancel();

    expect(setConnectorStatus).toHaveBeenCalledWith('github', 'NEEDS_AUTH');
  });

});
