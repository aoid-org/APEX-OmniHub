/**
 * OmniMediaLaunchWidget — Right-panel launcher for the GlobalMediaDock.
 *
 * Shows the user's real OmniMedia catalog (compact gallery) and a button to
 * open the full OmniMedia modal. No fabricated, hardcoded, or demo content is
 * ever rendered — only the user's real uploaded catalog (sourced live via
 * OmniMediaGallery → omnilink-port/omnimedia-catalog).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useOmniModal } from '@/stores/omniModalStore';
import { Video } from 'lucide-react';
import { OmniMediaGallery } from './OmniMediaGallery';

const OMNIMEDIA_MODULE_KEY = 'omnimedia';

export function OmniMediaLaunchWidget() {
  const { invoke } = useOmniModal();

  const openOmniMedia = () => {
    invoke({
      id: 'omnimedia-open',
      provider: 'omnidash',
      type: 'module',
      title: 'OmniMedia',
      contextData: { moduleKey: OMNIMEDIA_MODULE_KEY },
      onComplete: async () => {},
      onCancel: () => {},
    });
  };

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid rgba(249,115,22,0.25)',
        background: 'rgba(249,115,22,0.04)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Video style={{ width: 14, height: 14, color: '#f97316', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f97316' }}>
            OmniMedia
          </span>
        </div>
        <button
          type="button"
          data-testid="omnimedia-open-button"
          onClick={openOmniMedia}
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#f97316',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          Open
        </button>
      </div>

      <OmniMediaGallery variant="compact" />
    </div>
  );
}
