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
        background: '#C4511A',
        border: '1px solid #C4511A',
        borderRadius: '8px',
        padding: '6px 12px',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#A34316';
        e.currentTarget.style.borderColor = '#A34316';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#C4511A';
        e.currentTarget.style.borderColor = '#C4511A';
      }}
    >
      <Download size={14} color="#ffffff" />
      Install App
    </button>
  );
});

PWAInstallButton.displayName = 'PWAInstallButton';
