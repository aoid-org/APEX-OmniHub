/**
 * Stub for @/components/DemoVideoPlayer under root vitest.
 * Real implementation: apps/omnihub-site/src/components/DemoVideoPlayer.tsx
 * Replaced at runtime by vi.mock in omnihub-site tests.
 */
interface DemoVideoPlayerProps {
  sourceUrl: string;
  label?: string;
}

export const DemoVideoPlayer = ({ sourceUrl }: DemoVideoPlayerProps) => sourceUrl;
export default DemoVideoPlayer;
