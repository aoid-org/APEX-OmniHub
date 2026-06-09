import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'apex_pwa_banner_dismissed';

export interface UsePWAInstallReturn {
  isInstallable: boolean;
  isAlreadyInstalled: boolean;
  isDismissed: boolean;
  installPWA: () => Promise<void>;
  dismissBanner: () => void;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    // Already installed as standalone — never show banner
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAlreadyInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Track if app gets installed mid-session
    const installedHandler = () => {
      setIsInstallable(false);
      setIsAlreadyInstalled(true);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
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
