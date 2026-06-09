import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PWAInstallBanner } from '@omnihub/components/PWAInstallBanner';

// Mock the hook — component tests should not exercise hook internals
vi.mock('@omnihub/hooks/usePWAInstall', () => ({
  usePWAInstall: vi.fn(),
}));

import { usePWAInstall } from '@omnihub/hooks/usePWAInstall';

function setHookState(overrides: Partial<ReturnType<typeof usePWAInstall>>) {
  (usePWAInstall as ReturnType<typeof vi.fn>).mockReturnValue({
    isInstallable: false,
    isAlreadyInstalled: false,
    isDismissed: false,
    installPWA: vi.fn(),
    dismissBanner: vi.fn(),
    ...overrides,
  });
}

describe('PWAInstallBanner', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing when isInstallable is false', () => {
    setHookState({ isInstallable: false });
    const { container } = render(<PWAInstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when already installed', () => {
    setHookState({ isInstallable: true, isAlreadyInstalled: true });
    const { container } = render(<PWAInstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when banner is dismissed', () => {
    setHookState({ isInstallable: true, isDismissed: true });
    const { container } = render(<PWAInstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when installable and not dismissed', () => {
    setHookState({ isInstallable: true });
    render(<PWAInstallBanner />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Install APEX OmniHub')).toBeInTheDocument();
    expect(screen.getByText(/Add to your home screen/)).toBeInTheDocument();
  });

  it('calls installPWA when Install button is clicked', () => {
    const installPWA = vi.fn();
    setHookState({ isInstallable: true, installPWA });
    render(<PWAInstallBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(installPWA).toHaveBeenCalledOnce();
  });

  it('calls dismissBanner when dismiss button is clicked', () => {
    const dismissBanner = vi.fn();
    setHookState({ isInstallable: true, dismissBanner });
    render(<PWAInstallBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }));
    expect(dismissBanner).toHaveBeenCalledOnce();
  });

  it('has correct aria-label on the banner', () => {
    setHookState({ isInstallable: true });
    render(<PWAInstallBanner />);
    expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Install APEX OmniHub app');
  });
});
