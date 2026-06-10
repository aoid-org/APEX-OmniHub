import { memo } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * PWAInstallBanner
 *
 * Shows a bottom-anchored install prompt when the browser fires `beforeinstallprompt`.
 * Requires a registered service worker — see src/main.tsx for SW registration.
 *
 * APEX PWA INVARIANT: This component MUST remain rendered globally in App.tsx.
 * Removal breaks the live-site PWA download flow. Guarded by: scripts/ci/check-pwa-integrity.mjs
 */
export const PWAInstallBanner = memo(() => {
  const { isInstallable, isAlreadyInstalled, isDismissed, installPWA, dismissBanner } =
    usePWAInstall();

  if (!isInstallable || isAlreadyInstalled || isDismissed) return null;

  return (
    <header
      aria-label="Install APEX OmniHub app"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '14px 20px',
        background: 'rgba(11, 20, 30, 0.96)',
        borderTop: '1px solid rgba(196, 81, 26, 0.35)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.45)',
        fontFamily: 'var(--font, "Space Grotesk", sans-serif)',
      }}
    >
      {/* Icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(196, 81, 26, 0.18)',
            border: '1px solid rgba(196, 81, 26, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 2v10m0 0-3-3m3 3 3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2"
              stroke="#C4511A"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.93)', lineHeight: 1.3 }}>
            Install APEX OmniHub
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 1.4, marginTop: 2 }}>
            Add to your home screen for faster access
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={installPWA}
          style={{
            background: '#C4511A',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            letterSpacing: '-0.1px',
            transition: 'background 0.18s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#D46025'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#C4511A'; }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          aria-label="Dismiss install prompt"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.38)',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      </div>
    </header>
  );
});

PWAInstallBanner.displayName = 'PWAInstallBanner';
