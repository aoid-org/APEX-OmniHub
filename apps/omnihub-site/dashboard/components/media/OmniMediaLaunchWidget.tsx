/**
 * OmniMediaLaunchWidget — Right-panel launcher for the GlobalMediaDock.
 *
 * Shows the user's real OmniMedia catalog (compact gallery) and a button to
 * open the full OmniMedia modal. Demo embeds are opt-in only — gated behind
 * VITE_ENABLE_OMNIMEDIA_DEMOS — so reviewers without uploaded media can still
 * verify embed playback, but no fabricated content shows by default.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useOmniMedia } from '@/stores/omniMediaStore';
import { useOmniModal } from '@/stores/omniModalStore';
import { Play, Video } from 'lucide-react';
import { OmniMediaGallery } from './OmniMediaGallery';

const OMNIMEDIA_MODULE_KEY = 'omnimedia';

interface DemoClip {
  readonly id: string;
  readonly title: string;
  readonly provider: string;
  readonly source: string;
}

const DEMO_CLIPS: readonly DemoClip[] = [
  {
    id: 'bbb',
    title: 'Big Buck Bunny',
    provider: 'YouTube',
    source: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1',
  },
  {
    id: 'elephants-dream',
    title: 'Elephants Dream',
    provider: 'YouTube',
    source: 'https://www.youtube-nocookie.com/embed/wX8KsNMUAUo?autoplay=1',
  },
];

const DEMOS_ENABLED = import.meta.env.VITE_ENABLE_OMNIMEDIA_DEMOS === 'true';

export function OmniMediaLaunchWidget() {
  const { loadMedia, setDocked } = useOmniMedia();
  const { invoke } = useOmniModal();

  const launchDemo = async (clip: DemoClip) => {
    await loadMedia(
      { id: clip.id, source: clip.source, type: 'embed', title: clip.title, provider: clip.provider },
      true,
    );
    setDocked(true);
  };

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

      {DEMOS_ENABLED && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Demo
          </span>
          {DEMO_CLIPS.map((clip) => (
            <button
              key={clip.id}
              type="button"
              data-testid="omnimedia-demo-clip"
              onClick={() => void launchDemo(clip)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 7,
                padding: '6px 10px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,115,22,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <Play style={{ width: 12, height: 12, color: '#f97316', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clip.title}
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Demo · {clip.provider}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
