/**
 * OmniMediaPlayer — Adaptive Media Renderer
 * @version 1.0.0
 * @module src/components/omnidash/media/OmniMediaPlayer
 *
 * Interprets the MediaPayload type and renders the correct element:
 * - audio/video → ClientComputeNode (Web Audio API graph)
 * - embed → sandboxed iframe
 *
 * APEX STANDARDS ENFORCED:
 * - Modularity: Delegates compute to ClientComputeNode
 * - Overload-Free: Renders null when no media
 * - Regression-Free: iframe sandboxed with minimal permissions
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// Relative import (not '@/stores/...'): vite.config resolves '@' to
// apps/omnihub-site/src, but omniMediaStore lives in the ROOT src/ package.
// A relative path resolves correctly in both the Vite build and vitest.
import { useOmniMedia } from '../../../../../src/stores/omniMediaStore';
import { ClientComputeNode } from './ClientComputeNode';

export function OmniMediaPlayer() {
  const currentMedia = useOmniMedia((state) => state.currentMedia);

  if (!currentMedia) return null;

  switch (currentMedia.type) {
    case 'video':
    case 'audio':
      return <ClientComputeNode />;

    case 'embed':
      return (
        <iframe
          src={currentMedia.source}
          title={currentMedia.title}
          className="w-full h-full rounded-md border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      );

    default:
      return (
        <div className="text-destructive flex items-center justify-center h-full text-sm">
          Unsupported Media Type
        </div>
      );
  }
}
