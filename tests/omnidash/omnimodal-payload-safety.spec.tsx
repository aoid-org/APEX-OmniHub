import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UniversalModalEngine } from '@/dashboard/components/media/UniversalModalEngine';
import { useOmniModal } from '@/stores/omniModalStore';

// Mock dialog to render children without portals
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

describe('OmniModal Payload Safety', () => {
  beforeEach(() => {
    useOmniModal.getState().close();
  });

  it('does not render HTML in title or description', () => {
    useOmniModal.getState().invoke({
      id: 'test-modal',
      provider: 'test',
      type: 'confirmation',
      title: '<script>alert("xss")</script>',
      description: '<b>bold text</b>',
      onComplete: vi.fn(),
    });

    render(<UniversalModalEngine />);
    
    // The strings should be rendered literally, not parsed as HTML
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    expect(screen.getByText('<b>bold text</b>')).toBeInTheDocument();
  });

  it('provides selectedId and selected object in selection payload', async () => {
    const onCompleteMock = vi.fn();
    useOmniModal.getState().invoke({
      id: 'test-selection',
      provider: 'test',
      type: 'selection',
      title: 'Select Item',
      schema: {
        items: [{ id: 'item-123', label: 'Item 123' }]
      },
      onComplete: onCompleteMock,
    });

    render(<UniversalModalEngine />);
    
    const button = screen.getByText('Item 123');
    button.click();

    expect(onCompleteMock).toHaveBeenCalledWith({
      selected: { id: 'item-123', label: 'Item 123' },
      selectedId: 'item-123',
      context: undefined
    });
  });

  it('renders explicit setup-required content for vision_redact', () => {
    useOmniModal.getState().invoke({
      id: 'test-vision',
      provider: 'test',
      // @ts-expect-error - testing specific missing wire-up
      type: 'vision_redact',
      title: 'Vision Redact',
      onComplete: vi.fn(),
    });

    render(<UniversalModalEngine />);
    expect(screen.getByText('Setup Required')).toBeInTheDocument();
    expect(screen.getByText(/not fully wired to the backend yet/i)).toBeInTheDocument();
  });
});
