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
      className="pwa-install-fixed"
      style={{
        border: '1px solid #C4511A',
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
