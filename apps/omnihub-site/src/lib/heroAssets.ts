// FIXED: apex-core-badge.svg was never committed. Badge is now inline SVG in Home.tsx.
// This file is retained for API compatibility but the path constant is deprecated.

/** @deprecated Badge is now inline SVG — this path points to a non-existent file. */
export const HERO_BADGE_ASSET_PATH = '/assets/hero/apex-core-badge.svg' as const;

/** @deprecated Badge is now inline SVG in Home.tsx. */
export function getHeroBadgeAssetPath(): string {
  return HERO_BADGE_ASSET_PATH;
}
