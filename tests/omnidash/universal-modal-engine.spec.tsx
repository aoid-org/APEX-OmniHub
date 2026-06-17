/**
 * UniversalModalEngine — Component Tests
 * @module tests/omnidash/universal-modal-engine.spec
 * 
 * Verifies UniversalModalEngine mounting, store connection,
 * and rendering of different modal types based on the
 * OMNI-TEST UNIVERSAL protocol (AAA, behavior focus, semantic selectors).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalModalEngine } from '@/dashboard/components/media/UniversalModalEngine';
import { useOmniModal } from '@omnihub/stores/omniModalStore';

// Polyfill window.PointerEvent for Radix UI Dialog
if (!(globalThis as Record<string, unknown>).PointerEvent) {
  class PointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    constructor(type: string, props: PointerEventInit & { button?: number; ctrlKey?: boolean }) {
      super(type, props);
      this.button = props?.button || 0;
      this.ctrlKey = props?.ctrlKey || false;
    }
  }
  (globalThis as Record<string, unknown>).PointerEvent = PointerEvent;
}

describe('UniversalModalEngine', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useOmniModal.setState({ activeModal: null, isOpen: false });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Lifecycles', () => {
    it('renders nothing when there is no active modal', () => {
      const { container } = render(<UniversalModalEngine />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders a dialog when store receives an invoke payload', async () => {
      render(<UniversalModalEngine />);
      
      const onCompleteMock = vi.fn().mockResolvedValue(undefined);
      
      // Act: invoke the store within act()
      await act(async () => {
        useOmniModal.getState().invoke({
          id: 'test-modal-oauth',
          provider: 'Stripe',
          type: 'oauth',
          title: 'Connect Stripe',
          description: 'Authorize Stripe to proceed.',
          onComplete: onCompleteMock
        });
      });

      // Assert: Semantic roles should appear
      const dialog = await screen.findByRole('dialog', { name: 'Connect Stripe' });
      expect(dialog).toBeInTheDocument();

      expect(screen.getByRole('button', { name: /Authorize Stripe/i })).toBeInTheDocument();
    });
  });

  describe('Modal Types Rendering', () => {
    const onCompleteMock = vi.fn().mockResolvedValue(undefined);

    it('handles selection type properly and fires onComplete', async () => {
      render(<UniversalModalEngine />);
      
      await act(async () => {
        useOmniModal.getState().invoke({
          id: 'test-modal-selection',
          provider: 'System',
          type: 'selection',
          title: 'Choose Environment',
          schema: {
            items: [
              { id: 'prod', label: 'Production' },
              { id: 'stag', label: 'Staging' }
            ]
          },
          onComplete: onCompleteMock
        });
      });

      // Assert modal renders
      const dialog = await screen.findByRole('dialog', { name: 'Choose Environment' });
      expect(dialog).toBeInTheDocument();

      // Assert items render
      const prodButton = screen.getByRole('button', { name: 'Production' });
      const stagButton = screen.getByRole('button', { name: 'Staging' });
      
      expect(prodButton).toBeInTheDocument();
      expect(stagButton).toBeInTheDocument();

      // Act: Click an item
      fireEvent.click(stagButton);

      // Assert: onComplete was called with the selected item payload
      await waitFor(() => {
        expect(onCompleteMock).toHaveBeenCalledWith(expect.objectContaining({
          selected: { id: 'stag', label: 'Staging' }
        }));
      });
      
      // Store close is invoked internally
      expect(useOmniModal.getState().isOpen).toBe(false);
    });

    it('handles confirmation type properly and fires onComplete', async () => {
       render(<UniversalModalEngine />);
      
       await act(async () => {
         useOmniModal.getState().invoke({
           id: 'test-modal-conf',
           provider: 'System',
           type: 'confirmation',
           title: 'Delete Resource?',
           description: 'This is a permanent action.',
           onComplete: onCompleteMock,
           contextData: { resourceId: 123 }
         });
       });
 
       const dialog = await screen.findByRole('dialog', { name: 'Delete Resource?' });
       expect(dialog).toBeInTheDocument();
       expect(screen.getByText('This is a permanent action.')).toBeInTheDocument();
 
       const confirmButton = screen.getByRole('button', { name: /Confirm/i });
       const cancelButton = screen.getByRole('button', { name: /Cancel/i });
       
       expect(confirmButton).toBeInTheDocument();
       expect(cancelButton).toBeInTheDocument();
       
       // Act
       fireEvent.click(confirmButton);
       
       await waitFor(() => {
         expect(onCompleteMock).toHaveBeenCalledWith({
           confirmed: true,
           context: { resourceId: 123 }
         });
       });
    });
  });

  describe('Error Handling', () => {
    it('does not crash if onComplete throws an error (Overload-Free standard)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorMock = vi.fn().mockRejectedValue(new Error('Network Failure'));
      
      render(<UniversalModalEngine />);
      
      await act(async () => {
        useOmniModal.getState().invoke({
          id: 'error-modal',
          provider: 'System',
          type: 'confirmation',
          title: 'Error Test',
          onComplete: errorMock
        });
      });

      const confirmButton = await screen.findByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[OmniModal] Failed to process System action:'),
          expect.any(Error)
        );
      });
      
      // Ensure UI remains intact instead of crashing
      expect(screen.queryByRole('dialog')).toBeInTheDocument(); 
      // Verify processing state was reset
      expect(confirmButton).not.toBeDisabled();
    });
  });
});
