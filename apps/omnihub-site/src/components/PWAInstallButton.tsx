import { memo } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton = memo(() => {
  const { isInstallable, installPWA } = usePWAInstall();

  // If the PWA is not installable (already installed, or not supported), don't show the harness
  if (!isInstallable) return null;

  return (
    <button
      type="button"
      onClick={installPWA}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(196, 81, 26, 0.15)',
        border: '1px solid rgba(196, 81, 26, 0.4)',
        borderRadius: '8px',
        padding: '6px 12px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(196, 81, 26, 0.25)';
        e.currentTarget.style.borderColor = 'rgba(196, 81, 26, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(196, 81, 26, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(196, 81, 26, 0.4)';
      }}
    >
      <Download size={14} color="#C4511A" />
      Install App
    </button>
  );
});

PWAInstallButton.displayName = 'PWAInstallButton';
