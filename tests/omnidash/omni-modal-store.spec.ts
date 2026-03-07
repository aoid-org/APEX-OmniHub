/**
 * OmniModal Store — Unit Tests
 * @module tests/omnidash/omni-modal-store.spec
 *
 * Tests the global Zustand store for schema-driven modal management.
 * Validates Zod boundary validation, single-modal enforcement, and teardown.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOmniModal } from '@/stores/omniModalStore';
import type { OmniModalConfig } from '@/stores/omniModalStore';

const createValidConfig = (
  overrides?: Partial<OmniModalConfig>,
): OmniModalConfig => ({
  id: 'test-modal-01',
  provider: 'QuickBooks',
  type: 'oauth',
  title: 'QuickBooks Authentication',
  description: 'Connect your QuickBooks account',
  onComplete: vi.fn(async () => undefined),
  onCancel: vi.fn(),
  ...overrides,
});

describe('omniModalStore', () => {
  beforeEach(() => {
    useOmniModal.setState({
      activeModal: null,
      isOpen: false,
    });
  });

  describe('initial state', () => {
    it('starts with no active modal and closed', () => {
      const state = useOmniModal.getState();
      expect(state.activeModal).toBeNull();
      expect(state.isOpen).toBe(false);
    });
  });

  describe('invoke', () => {
    it('sets activeModal and isOpen for valid config', () => {
      const config = createValidConfig();
      useOmniModal.getState().invoke(config);
      const state = useOmniModal.getState();
      expect(state.activeModal?.id).toBe('test-modal-01');
      expect(state.activeModal?.provider).toBe('QuickBooks');
      expect(state.activeModal?.type).toBe('oauth');
      expect(state.isOpen).toBe(true);
    });

    it('accepts all modal types', () => {
      const types = ['oauth', 'form', 'selection', 'confirmation'] as const;
      for (const type of types) {
        const config = createValidConfig({ id: `modal-${type}`, type });
        useOmniModal.getState().invoke(config);
        expect(useOmniModal.getState().activeModal?.type).toBe(type);
      }
    });

    it('replaces previous modal (no stacking)', () => {
      const first = createValidConfig({ id: 'first' });
      const second = createValidConfig({ id: 'second', provider: 'Salesforce' });

      useOmniModal.getState().invoke(first);
      expect(useOmniModal.getState().activeModal?.id).toBe('first');

      useOmniModal.getState().invoke(second);
      expect(useOmniModal.getState().activeModal?.id).toBe('second');
      expect(useOmniModal.getState().activeModal?.provider).toBe('Salesforce');
    });

    it('rejects config with empty id (Zod validation)', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const invalid = createValidConfig({ id: '' });
      useOmniModal.getState().invoke(invalid);
      expect(useOmniModal.getState().activeModal).toBeNull();
      expect(useOmniModal.getState().isOpen).toBe(false);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('rejects config with empty title (Zod validation)', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const invalid = createValidConfig({ title: '' });
      useOmniModal.getState().invoke(invalid);
      expect(useOmniModal.getState().activeModal).toBeNull();
      spy.mockRestore();
    });

    it('rejects config with empty provider (Zod validation)', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const invalid = createValidConfig({ provider: '' });
      useOmniModal.getState().invoke(invalid);
      expect(useOmniModal.getState().activeModal).toBeNull();
      spy.mockRestore();
    });

    it('accepts config with optional fields omitted', () => {
      const minimal = createValidConfig({
        description: undefined,
        schema: undefined,
        contextData: undefined,
        onCancel: undefined,
      });
      useOmniModal.getState().invoke(minimal);
      expect(useOmniModal.getState().isOpen).toBe(true);
    });
  });

  describe('close', () => {
    it('resets to initial state', () => {
      const config = createValidConfig();
      useOmniModal.getState().invoke(config);
      expect(useOmniModal.getState().isOpen).toBe(true);

      useOmniModal.getState().close();
      expect(useOmniModal.getState().activeModal).toBeNull();
      expect(useOmniModal.getState().isOpen).toBe(false);
    });

    it('calls onCancel when defined', () => {
      const onCancel = vi.fn();
      const config = createValidConfig({ onCancel });
      useOmniModal.getState().invoke(config);
      useOmniModal.getState().close();
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('does not throw when onCancel is undefined', () => {
      const config = createValidConfig({ onCancel: undefined });
      useOmniModal.getState().invoke(config);
      expect(() => useOmniModal.getState().close()).not.toThrow();
    });

    it('is idempotent — closing a closed modal is a no-op', () => {
      expect(() => useOmniModal.getState().close()).not.toThrow();
      expect(useOmniModal.getState().activeModal).toBeNull();
    });
  });

  describe('abortModal', () => {
    it('resets state and calls onCancel', () => {
      const onCancel = vi.fn();
      const config = createValidConfig({ onCancel });
      useOmniModal.getState().invoke(config);
      expect(useOmniModal.getState().isOpen).toBe(true);

      useOmniModal.getState().abortModal('USER_DISMISSED');
      expect(useOmniModal.getState().activeModal).toBeNull();
      expect(useOmniModal.getState().isOpen).toBe(false);
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('works without onCancel defined', () => {
      const config = createValidConfig({ onCancel: undefined });
      useOmniModal.getState().invoke(config);
      expect(() => useOmniModal.getState().abortModal()).not.toThrow();
      expect(useOmniModal.getState().isOpen).toBe(false);
    });

    it('is idempotent — aborting with no active modal is a no-op', () => {
      expect(() => useOmniModal.getState().abortModal()).not.toThrow();
      expect(useOmniModal.getState().activeModal).toBeNull();
    });
  });
});
