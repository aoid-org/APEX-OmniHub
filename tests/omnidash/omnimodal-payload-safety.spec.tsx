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
});
