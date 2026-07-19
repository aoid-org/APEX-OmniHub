import { memo } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

interface Props {
  readonly inline?: boolean;
}

export const PWAInstallButton = memo(({ inline }: Props) => {
  const { isInstallable, installPWA } = usePWAInstall();

  // If the PWA is not installable (already installed, or not supported), don't show the harness
  if (!isInstallable) return null;

  if (inline) {
    return (
      <button
        type="button"
        onClick={installPWA}
        className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
      >
        <Download size={13} />
        Install PWA App
      </button>
    );
  }

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
      <Download size={14} />
      Install App
    </button>
  );
});

PWAInstallButton.displayName = 'PWAInstallButton';
