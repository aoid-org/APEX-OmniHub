/**
 * omniModalStore — Unit Tests
 * Tests Zustand modal state management, Zod validation, and render mode resolution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOmniModal, resolveRenderMode } from '@/stores/omniModalStore';
import type { OmniModalConfig, RenderMode } from '@/stores/omniModalStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<OmniModalConfig>): OmniModalConfig {
  return {
    id: 'test-modal-1',
    provider: 'test-provider',
    type: 'confirmation',
    title: 'Test Modal',
    description: 'A test modal',
    onComplete: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
}

// Reset Zustand state before every test
function resetStore() {
  useOmniModal.setState({ activeModal: null, isOpen: false });
}

// ─── resolveRenderMode — pure function tests ──────────────────────────────

describe('resolveRenderMode', () => {
  it('returns explicit renderMode when provided', () => {
    const config = makeConfig({ renderMode: 'spatial' });
    expect(resolveRenderMode(config)).toBe<RenderMode>('spatial');
  });

  it('returns sandbox for microfrontend type', () => {
    const config = makeConfig({ type: 'microfrontend', renderMode: undefined });
    expect(resolveRenderMode(config)).toBe<RenderMode>('sandbox');
  });

  it('returns spatial for contextData.appType=media', () => {
    const config = makeConfig({ contextData: { appType: 'media' } });
    expect(resolveRenderMode(config)).toBe<RenderMode>('spatial');
  });

  it('returns spatial for contextData.appType=editor', () => {
    const config = makeConfig({ contextData: { appType: 'editor' } });
    expect(resolveRenderMode(config)).toBe<RenderMode>('spatial');
  });

  it('returns spatial for contextData.appType=terminal', () => {
    const config = makeConfig({ contextData: { appType: 'terminal' } });
    expect(resolveRenderMode(config)).toBe<RenderMode>('spatial');
  });

  it('returns dialog for confirmation type (default)', () => {
    const config = makeConfig({ type: 'confirmation', renderMode: undefined });
    expect(resolveRenderMode(config)).toBe<RenderMode>('dialog');
  });

  it('returns dialog for oauth type (default)', () => {
    const config = makeConfig({ type: 'oauth', renderMode: undefined });
    expect(resolveRenderMode(config)).toBe<RenderMode>('dialog');
  });

  it('explicit renderMode wins over microfrontend type', () => {
    const config = makeConfig({ type: 'microfrontend', renderMode: 'toast' });
    expect(resolveRenderMode(config)).toBe<RenderMode>('toast');
  });
});

// ─── invoke() ─────────────────────────────────────────────────────────────

describe('useOmniModal.invoke()', () => {
  beforeEach(resetStore);

  it('sets activeModal and isOpen=true for valid config', () => {
    const config = makeConfig();
    useOmniModal.getState().invoke(config);
    const state = useOmniModal.getState();
    expect(state.isOpen).toBe(true);
    expect(state.activeModal).not.toBeNull();
    expect(state.activeModal?.id).toBe('test-modal-1');
    expect(state.activeModal?.title).toBe('Test Modal');
  });

  it('replaces previous modal (single-modal: no stacking)', () => {
    useOmniModal.getState().invoke(makeConfig({ id: 'modal-a', title: 'Modal A' }));
    useOmniModal.getState().invoke(makeConfig({ id: 'modal-b', title: 'Modal B' }));
    const state = useOmniModal.getState();
    expect(state.activeModal?.id).toBe('modal-b');
    expect(state.isOpen).toBe(true);
  });

  it('rejects config with empty id (Zod validation)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useOmniModal.getState().invoke(makeConfig({ id: '' }));
    const state = useOmniModal.getState();
    expect(state.isOpen).toBe(false);
    expect(state.activeModal).toBeNull();
    consoleError.mockRestore();
  });

  it('rejects config with invalid type (Zod validation)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useOmniModal.getState().invoke(makeConfig({ type: 'invalid_type' as any }));
    expect(useOmniModal.getState().isOpen).toBe(false);
    consoleError.mockRestore();
  });

  it('rejects config with empty provider (Zod validation)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useOmniModal.getState().invoke(makeConfig({ provider: '' }));
    expect(useOmniModal.getState().isOpen).toBe(false);
    consoleError.mockRestore();
  });

  it('rejects config with empty title (Zod validation)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useOmniModal.getState().invoke(makeConfig({ title: '' }));
    expect(useOmniModal.getState().isOpen).toBe(false);
    consoleError.mockRestore();
  });

  it('accepts all valid ModalType values', () => {
    const types = [
      'oauth', 'form', 'selection', 'confirmation',
      'vision_redact', 'vision_confirm', 'mcp_tool_approve',
      'microfrontend', 'module',
    ] as const;
    for (const type of types) {
      resetStore();
      useOmniModal.getState().invoke(makeConfig({ type, id: `test-${type}` }));
      expect(useOmniModal.getState().isOpen).toBe(true);
    }
  });

  it('deep-clones contextData to prevent mutation side-effects', () => {
    const contextData = { appType: 'editor', value: 42 };
    useOmniModal.getState().invoke(makeConfig({ contextData }));
    const stored = useOmniModal.getState().activeModal?.contextData;
    expect(stored).toEqual(contextData);
    // Mutate original — should not affect stored
    contextData.value = 999;
    expect(useOmniModal.getState().activeModal?.contextData?.value).toBe(42);
  });
});

// ─── close() ──────────────────────────────────────────────────────────────

describe('useOmniModal.close()', () => {
  beforeEach(resetStore);

  it('sets isOpen=false and clears activeModal', () => {
    useOmniModal.getState().invoke(makeConfig());
    useOmniModal.getState().close();
    const state = useOmniModal.getState();
    expect(state.isOpen).toBe(false);
    expect(state.activeModal).toBeNull();
  });

  it('calls onCancel when modal is closed', () => {
    const onCancel = vi.fn();
    useOmniModal.getState().invoke(makeConfig({ onCancel }));
    useOmniModal.getState().close();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('is safe to call when no modal is open', () => {
    expect(() => useOmniModal.getState().close()).not.toThrow();
    expect(useOmniModal.getState().isOpen).toBe(false);
  });
});

// ─── abortModal() ─────────────────────────────────────────────────────────

describe('useOmniModal.abortModal()', () => {
  beforeEach(resetStore);

  it('clears state and calls onCancel', () => {
    const onCancel = vi.fn();
    useOmniModal.getState().invoke(makeConfig({ onCancel }));
    useOmniModal.getState().abortModal('TEST_ABORT');
    expect(useOmniModal.getState().isOpen).toBe(false);
    expect(useOmniModal.getState().activeModal).toBeNull();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('logs warning with abort reason', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useOmniModal.getState().invoke(makeConfig());
    useOmniModal.getState().abortModal('MY_REASON');
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('MY_REASON'));
    consoleWarn.mockRestore();
  });

  it('uses USER_DISMISSED as default reason', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useOmniModal.getState().invoke(makeConfig());
    useOmniModal.getState().abortModal();
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('USER_DISMISSED'));
    consoleWarn.mockRestore();
  });

  it('is safe to call when no modal is open', () => {
    expect(() => useOmniModal.getState().abortModal()).not.toThrow();
  });
});

// ─── Priority + render mode integration ───────────────────────────────────

describe('modal priority and render mode fields', () => {
  beforeEach(resetStore);

  it('stores priority field correctly', () => {
    useOmniModal.getState().invoke(makeConfig({ priority: 'critical' }));
    expect(useOmniModal.getState().activeModal?.priority).toBe('critical');
  });

  it('stores renderMode field correctly', () => {
    useOmniModal.getState().invoke(makeConfig({ renderMode: 'spatial' }));
    expect(useOmniModal.getState().activeModal?.renderMode).toBe('spatial');
  });

  it('stores optional description field', () => {
    useOmniModal.getState().invoke(makeConfig({ description: 'My description' }));
    expect(useOmniModal.getState().activeModal?.description).toBe('My description');
  });
});
