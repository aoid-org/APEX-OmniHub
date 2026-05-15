// Centralized hero badge asset path used by the homepage SVG composition.

export const HERO_BADGE_ASSET_PATH = '/assets/hero/apex-core-badge.svg' as const;

export function getHeroBadgeAssetPath(): string {
  return HERO_BADGE_ASSET_PATH;
}
