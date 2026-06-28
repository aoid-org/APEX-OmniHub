/**
 * OmniMediaModule — Full OmniMedia catalog + player modal.
 *
 * A bespoke modal (own dialog content, not ModuleShell — OmniMedia isn't a
 * module-state resource, it's a media catalog) opened via module key
 * `omnimedia` (see OmniMediaLaunchWidget's "Open OmniMedia" button).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useOmniMedia } from '@/stores/omniMediaStore';
import { OmniMediaGallery } from '../media/OmniMediaGallery';
import { OmniMediaPlayer } from '../media/OmniMediaPlayer';

interface Props {
  readonly onClose: () => void;
}

export default function OmniMediaModule({ onClose }: Props) {
  const currentMedia = useOmniMedia((s) => s.currentMedia);

  return (
    <div className="flex flex-col gap-4" data-testid="omnimedia-module">
      {currentMedia && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border/20 bg-black">
          <OmniMediaPlayer />
        </div>
      )}

      <div>
        <span className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">
          Your media
        </span>
        <OmniMediaGallery variant="full" />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-4 text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}
