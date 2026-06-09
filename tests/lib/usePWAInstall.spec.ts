import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '@omnihub/hooks/usePWAInstall';

// Helper: construct a BeforeInstallPromptEvent-shaped object
function makePromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  return Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}

describe('usePWAInstall', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts with isInstallable false and isDismissed false', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.isAlreadyInstalled).toBe(false);
  });

  it('sets isInstallable true when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => {
      window.dispatchEvent(makePromptEvent());
    });
    expect(result.current.isInstallable).toBe(true);
  });

  it('sets isAlreadyInstalled true when matchMedia standalone matches', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isAlreadyInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('sets isAlreadyInstalled true and isInstallable false on appinstalled', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { window.dispatchEvent(makePromptEvent()); });
    expect(result.current.isInstallable).toBe(true);
    act(() => { window.dispatchEvent(new Event('appinstalled')); });
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isAlreadyInstalled).toBe(true);
  });

  it('installPWA clears deferredPrompt and hides banner on accepted', async () => {
    const { result } = renderHook(() => usePWAInstall());
    const promptEvent = makePromptEvent('accepted');
    act(() => { window.dispatchEvent(promptEvent); });
    expect(result.current.isInstallable).toBe(true);
    await act(async () => { await result.current.installPWA(); });
    expect(promptEvent.prompt).toHaveBeenCalledOnce();
    expect(result.current.isInstallable).toBe(false);
  });

  it('installPWA clears prompt even when outcome is dismissed', async () => {
    const { result } = renderHook(() => usePWAInstall());
    const promptEvent = makePromptEvent('dismissed');
    act(() => { window.dispatchEvent(promptEvent); });
    await act(async () => { await result.current.installPWA(); });
    expect(promptEvent.prompt).toHaveBeenCalledOnce();
    expect(result.current.isInstallable).toBe(false);
  });

  it('installPWA is a no-op when deferredPrompt is null', async () => {
    const { result } = renderHook(() => usePWAInstall());
    // Should not throw
    await act(async () => { await result.current.installPWA(); });
    expect(result.current.isInstallable).toBe(false);
  });

  it('dismissBanner sets isDismissed true and persists to localStorage', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { result.current.dismissBanner(); });
    expect(result.current.isDismissed).toBe(true);
    expect(localStorage.getItem('apex_pwa_banner_dismissed')).toBe('1');
  });

  it('reads dismissed state from localStorage on mount', () => {
    localStorage.setItem('apex_pwa_banner_dismissed', '1');
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isDismissed).toBe(true);
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => usePWAInstall());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });
});
