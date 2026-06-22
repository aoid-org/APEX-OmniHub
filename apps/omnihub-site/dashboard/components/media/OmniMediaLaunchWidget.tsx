/**
 * OmniMediaLaunchWidget — Right-panel launcher for the GlobalMediaDock.
 * Provides a curated set of demo embeds so reviewers can verify full
 * video playback behaviour without leaving the dashboard.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useOmniMedia } from '@/stores/omniMediaStore';
import { Play, Video } from 'lucide-react';

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

export function OmniMediaLaunchWidget() {
  const { loadMedia, setDocked } = useOmniMedia();

  const launch = async (clip: DemoClip) => {
    await loadMedia(
      { id: clip.id, source: clip.source, type: 'embed', title: clip.title, provider: clip.provider },
      true,
    );
    setDocked(true);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Video style={{ width: 14, height: 14, color: '#f97316', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f97316' }}>
          OmniMedia
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {DEMO_CLIPS.map((clip) => (
          <button
            key={clip.id}
            type="button"
            onClick={() => void launch(clip)}
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
              <div style={{ fontSize: 10, color: '#64748b' }}>{clip.provider}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
