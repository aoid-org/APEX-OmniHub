// Utility exports for hero badge asset path.
// Kept separate from Home.tsx to satisfy react-refresh/only-export-components.

export const HERO_BADGE_ASSET_PATH = '/assets/hero/apex-core-badge.svg' as const;

export function getHeroBadgeAssetPath(): string {
  return HERO_BADGE_ASSET_PATH;
}
