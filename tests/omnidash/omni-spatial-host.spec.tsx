import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/stores/omniModalStore', () => ({
  useOmniModal: vi.fn(() => ({
    activeModal: null,
    isOpen: false,
    close: vi.fn(),
    abortModal: vi.fn(),
  })),
  resolveRenderMode: vi.fn(() => 'dialog'),
}));

vi.mock('@/lib/motionPresets', () => ({
  SPRING_DAMPED: { type: 'spring', damping: 20, stiffness: 300 },
  GPU_STYLE: { willChange: 'transform' },
}));

vi.mock('@/lib/OmniAppShell', () => ({
  registerOmniAppShell: vi.fn(),
}));

vi.mock('@/lib/iframeOriginPolicy', () => ({
  sanitiseIframeUrl: vi.fn(() => ({ allowed: true, profile: 'default', reason: '' })),
  getSandboxAttribute: vi.fn(() => 'allow-scripts allow-same-origin'),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) =>
    open ? <div data-testid="omni-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('dashboard/components/OmniSpatialDialogRenderers', () => ({
  DialogModeRenderer: ({ modal }: { modal: { type: string; title: string }; isProcessing: boolean; onAction: () => void; onClose: () => void }) => (
    <div data-testid="dialog-mode-renderer">type:{modal.type}</div>
  ),
}));

import { OmniSpatialHost } from '../../apps/omnihub-site/dashboard/components/OmniSpatialHost';
import { useOmniModal, resolveRenderMode } from '@/stores/omniModalStore';
import type { OmniModalConfig } from '@/stores/omniModalStore';

const makeModal = (overrides: Partial<OmniModalConfig> = {}): OmniModalConfig => ({
  id: 'test-modal',
  provider: 'test',
  type: 'oauth',
  title: 'Test Modal',
  onComplete: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  ...overrides,
});

describe('OmniSpatialHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const portalRoot = document.getElementById('omni-portal-root');
    if (!portalRoot) {
      const el = document.createElement('div');
      el.id = 'omni-portal-root';
      document.body.appendChild(el);
    }
  });

  it('renders without crashing when no modal is open', () => {
    const { container } = render(<OmniSpatialHost />);
    expect(container).toBeTruthy();
  });

  it('renders dialog when modal is open in dialog mode', () => {
    const modal = makeModal({ type: 'oauth', provider: 'Stripe' });
    vi.mocked(useOmniModal).mockReturnValue({
      activeModal: modal,
      isOpen: true,
      close: vi.fn(),
      abortModal: vi.fn(),
    } as ReturnType<typeof useOmniModal>);
    vi.mocked(resolveRenderMode).mockReturnValue('dialog');

    render(<OmniSpatialHost />);
    expect(screen.getByTestId('omni-dialog')).toBeTruthy();
  });

  it('renders nothing visible when isOpen is false', () => {
    vi.mocked(useOmniModal).mockReturnValue({
      activeModal: null,
      isOpen: false,
      close: vi.fn(),
      abortModal: vi.fn(),
    } as ReturnType<typeof useOmniModal>);

    const { container } = render(<OmniSpatialHost />);
    expect(container.querySelector('[data-testid="omni-dialog"]')).toBeNull();
  });

  it('renders spatial mode overlay when renderMode is spatial', () => {
    const modal = makeModal({ type: 'module', contextData: { appType: 'editor' } });
    vi.mocked(useOmniModal).mockReturnValue({
      activeModal: modal,
      isOpen: true,
      close: vi.fn(),
      abortModal: vi.fn(),
    } as ReturnType<typeof useOmniModal>);
    vi.mocked(resolveRenderMode).mockReturnValue('spatial');

    act(() => {
      render(<OmniSpatialHost />);
    });
    expect(screen.queryByTestId('omni-dialog')).toBeNull();
  });

  it('renders sandbox mode overlay when renderMode is sandbox', () => {
    const modal = makeModal({ type: 'module', contextData: { entryUrl: 'https://example.com' } });
    vi.mocked(useOmniModal).mockReturnValue({
      activeModal: modal,
      isOpen: true,
      close: vi.fn(),
      abortModal: vi.fn(),
    } as ReturnType<typeof useOmniModal>);
    vi.mocked(resolveRenderMode).mockReturnValue('sandbox');

    act(() => {
      render(<OmniSpatialHost />);
    });
    expect(screen.queryByTestId('omni-dialog')).toBeNull();
  });

  it('renders with a portal root element', () => {
    const portalRoot = document.getElementById('omni-portal-root');
    expect(portalRoot).toBeTruthy();
    render(<OmniSpatialHost />);
    expect(portalRoot).toBeTruthy();
  });
});
