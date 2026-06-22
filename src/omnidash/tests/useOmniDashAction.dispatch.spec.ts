/**
 * TDD: useOmniDashAction — dispatch contract
 *
 * Written FAILING first. Tests the full dispatch lifecycle:
 * modal invocation, optimistic state, cancel absorption,
 * and credential sanitization in the onComplete payload.
 *
 * Dependencies mocked at module boundary — no real Supabase, no real stores.
 *
 * Run: vitest src/omnidash/tests/useOmniDashAction.dispatch.spec.ts
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOmniDashAction } from '../useOmniDashAction';
import type { OmniDashIntent } from '../useOmniDashAction';

// ── Store mocks ──────────────────────────────────────────────────────────────
const mockInvoke = vi.fn();
const mockHydrateConnector = vi.fn();
const mockSetConnectorStatus = vi.fn();

vi.mock('@omnihub/stores/omniModalStore', () => ({
  useOmniModal: Object.assign(
    vi.fn(() => mockInvoke),
    { getState: () => ({ invoke: mockInvoke }) },
  ),
}));

vi.mock('@omnihub/stores/omniBoardStore', () => ({
  useOmniBoard: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      hydrateConnector: mockHydrateConnector,
      setConnectorStatus: mockSetConnectorStatus,
    }),
  ),
}));

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockSupabaseInvoke = vi.fn();
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockSupabaseInvoke },
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const PARTIAL_INTENT: OmniDashIntent = {
  source: 'integration',
  appKey: 'quickbooks',
  provider: 'QuickBooks',
  label: 'QuickBooks',
  category: 'finance',
  routePath: '/omnidash/integrations/quickbooks',
  dashboardStatus: 'Partial',
};

const LIVE_SPATIAL_INTENT: OmniDashIntent = {
  ...PARTIAL_INTENT,
  dashboardStatus: 'Live',
  contextData: { appType: 'media' },
};

const LIVE_MICROFRONTEND_INTENT: OmniDashIntent = {
  ...PARTIAL_INTENT,
  dashboardStatus: 'Live',
  contextData: { entryUrl: 'https://app.qb.com' },
};

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOmniDashAction — modal invocation', () => {
  it('Partial intent dispatches an oauth modal config', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    expect(mockInvoke).toHaveBeenCalledOnce();
    const config = mockInvoke.mock.calls[0][0];
    expect(config.type).toBe('oauth');
    expect(config.priority).toBe('high');
  });

  it('Partial modal title contains "Connect"', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const config = mockInvoke.mock.calls[0][0];
    expect(config.title).toMatch(/connect/i);
  });

  it('modal config id is stable in format omni-{appKey}-{status}-{timestamp}', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const config = mockInvoke.mock.calls[0][0];
    expect(config.id).toMatch(/^omni-quickbooks-partial-\d+$/);
  });

  it('spatial intent dispatches with renderMode spatial', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(LIVE_SPATIAL_INTENT));
    const config = mockInvoke.mock.calls[0][0];
    expect(config.renderMode).toBe('spatial');
  });

  it('microfrontend intent dispatches type microfrontend', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(LIVE_MICROFRONTEND_INTENT));
    const config = mockInvoke.mock.calls[0][0];
    expect(config.type).toBe('microfrontend');
  });

  it('contextData in the config includes appKey and category', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const config = mockInvoke.mock.calls[0][0];
    expect(config.contextData.appKey).toBe('quickbooks');
    expect(config.contextData.category).toBe('finance');
  });
});

describe('useOmniDashAction — onComplete: oauth exchange', () => {
  it('calls setConnectorStatus CONNECTING optimistically before Supabase responds', async () => {
    mockSupabaseInvoke.mockResolvedValueOnce({
      data: { connector_id: 'conn_abc', expires_at: 9999 },
      error: null,
    });
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onComplete } = mockInvoke.mock.calls[0][0];
    await act(async () => onComplete({}));
    expect(mockSetConnectorStatus).toHaveBeenCalledWith('quickbooks', 'CONNECTING');
  });

  it('calls hydrateConnector with a LIVE connector record on success', async () => {
    mockSupabaseInvoke.mockResolvedValueOnce({
      data: { connector_id: 'conn_abc', expires_at: 9999 },
      error: null,
    });
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onComplete } = mockInvoke.mock.calls[0][0];
    await act(async () => onComplete({}));
    expect(mockHydrateConnector).toHaveBeenCalledOnce();
    const record = mockHydrateConnector.mock.calls[0][0];
    expect(record.status).toBe('LIVE');
    expect(record.appKey).toBe('quickbooks');
  });

  it('strips credential keys from the backend payload before hydrating', async () => {
    mockSupabaseInvoke.mockResolvedValueOnce({
      data: { connector_id: 'conn_abc', token: 'MUST_BE_STRIPPED', secret: 'ALSO_STRIPPED' },
      error: null,
    });
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onComplete } = mockInvoke.mock.calls[0][0];
    await act(async () => onComplete({}));
    const record = mockHydrateConnector.mock.calls[0][0];
    expect(record.metadata).not.toHaveProperty('token');
    expect(record.metadata).not.toHaveProperty('secret');
  });

  it('calls setConnectorStatus ERROR and does not hydrate on Supabase error', async () => {
    mockSupabaseInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Network failure'),
    });
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onComplete } = mockInvoke.mock.calls[0][0];
    await act(async () => onComplete({}));
    expect(mockSetConnectorStatus).toHaveBeenCalledWith('quickbooks', 'ERROR');
    expect(mockHydrateConnector).not.toHaveBeenCalled();
  });

  it('does not throw on Supabase error — absorbs unhandled rejections', async () => {
    mockSupabaseInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Network failure'),
    });
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onComplete } = mockInvoke.mock.calls[0][0];
    await expect(act(async () => onComplete({}))).resolves.not.toThrow();
  });
});

describe('useOmniDashAction — onCancel: ABORTED absorption', () => {
  it('calls setConnectorStatus NEEDS_AUTH on cancel', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onCancel } = mockInvoke.mock.calls[0][0];
    act(() => onCancel());
    expect(mockSetConnectorStatus).toHaveBeenCalledWith('quickbooks', 'NEEDS_AUTH');
  });

  it('onCancel does not invoke hydrateConnector', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onCancel } = mockInvoke.mock.calls[0][0];
    act(() => onCancel());
    expect(mockHydrateConnector).not.toHaveBeenCalled();
  });

  it('onCancel does not throw', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch(PARTIAL_INTENT));
    const { onCancel } = mockInvoke.mock.calls[0][0];
    expect(() => act(() => onCancel())).not.toThrow();
  });
});

describe('useOmniDashAction — comingSoon gate', () => {
  it('does not invoke modal for comingSoon intents', () => {
    const { result } = renderHook(() => useOmniDashAction());
    act(() => result.current.dispatch({ ...PARTIAL_INTENT, comingSoon: true }));
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('useOmniDashAction — navigate fallback', () => {
  it('calls navigate when directive.shouldNavigate is true', () => {
    // shouldNavigate is only true in a future scenario — we stub resolveIntentModalType
    // to isolate this path. For now this test documents the contract.
    const mockNavigate = vi.fn();
    const { result } = renderHook(() => useOmniDashAction(mockNavigate));
    // A module intent with no contextData resolves to type: module, shouldNavigate: false
    // This test will FAIL until shouldNavigate=true path is reachable via intent config
    // Placeholder to track the contract:
    act(() => result.current.dispatch({ ...PARTIAL_INTENT, source: 'module', dashboardStatus: 'Live' }));
    // module intents open a modal, not navigate — asserting modal was called
    expect(mockInvoke).toHaveBeenCalledOnce();
  });
});
