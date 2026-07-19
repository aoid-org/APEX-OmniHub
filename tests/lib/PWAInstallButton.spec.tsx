import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PWAInstallButton } from '../../apps/omnihub-site/src/components/PWAInstallButton';


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

describe('PWAInstallButton', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing when isInstallable is false', () => {
    setHookState({ isInstallable: false });
    const { container } = render(<PWAInstallButton />);
    expect(container.firstChild).toBeNull();
  });

  it('renders fixed button by default when isInstallable is true', () => {
    setHookState({ isInstallable: true });
    render(<PWAInstallButton />);
    const btn = screen.getByRole('button', { name: 'Install App' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toBe('pwa-install-fixed');
  });

  it('renders inline button when inline is true and isInstallable is true', () => {
    setHookState({ isInstallable: true });
    render(<PWAInstallButton inline />);
    const btn = screen.getByRole('button', { name: 'Install PWA App' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).not.toBe('pwa-install-fixed');
    expect(btn.className).toContain('flex');
  });

  it('calls installPWA when clicked', () => {
    const installPWA = vi.fn();
    setHookState({ isInstallable: true, installPWA });
    render(<PWAInstallButton inline />);
    fireEvent.click(screen.getByRole('button', { name: 'Install PWA App' }));
    expect(installPWA).toHaveBeenCalledOnce();
  });
});
