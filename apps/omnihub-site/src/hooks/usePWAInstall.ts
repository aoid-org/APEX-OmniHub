import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'apex_pwa_banner_dismissed';

interface PWAInstallWindow extends Window {
  __deferredPWAEvent?: BeforeInstallPromptEvent;
}

function isStandaloneDisplayMode(): boolean {
  try {
    return globalThis.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function getDeferredPWAEvent(): BeforeInstallPromptEvent | null {
  return (globalThis as unknown as PWAInstallWindow).__deferredPWAEvent ?? null;
}

export interface UsePWAInstallReturn {
  isInstallable: boolean;
  isAlreadyInstalled: boolean;
  isDismissed: boolean;
  installPWA: () => Promise<void>;
  dismissBanner: () => void;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(getDeferredPWAEvent);
  const [isInstallable, setIsInstallable] = useState(() => !isStandaloneDisplayMode() && getDeferredPWAEvent() !== null);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(isStandaloneDisplayMode);
  const [isDismissed, setIsDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    // Already installed as standalone — never show banner.
    if (isStandaloneDisplayMode()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    globalThis.addEventListener('beforeinstallprompt', handler);

    // Track if app gets installed mid-session
    const installedHandler = () => {
      setIsInstallable(false);
      setIsAlreadyInstalled(true);
    };
    globalThis.addEventListener('appinstalled', installedHandler);

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handler);
      globalThis.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return;
    // Consume the event immediately — BeforeInstallPromptEvent.prompt() can only
    // be called once. Clear state before awaiting so a second tap never reaches
    // a spent event (which would throw InvalidStateError silently in prod).
    const pendingPrompt = deferredPrompt;
    setDeferredPrompt(null);
    setIsInstallable(false);
    pendingPrompt.prompt();
    await pendingPrompt.userChoice;
    // Browser will re-fire beforeinstallprompt on a future visit if user dismissed.
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ }
    setIsDismissed(true);
  }, []);

  return { isInstallable, isAlreadyInstalled, isDismissed, installPWA, dismissBanner };
}
