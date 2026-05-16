// Centralized hero badge asset path used by the homepage SVG composition.
// We serve the PNG raster (apex-core-badge.png). The vector source remains at
// /assets/apex-core-badge.svg for direct asset access, but is NOT used as the
// <image href> source: that SVG contains nested feColorMatrix filters which
// collide with the parent SVG's mask + Gaussian-blur DOF pipeline, producing a
// garbled silhouette. The PNG is a flat raster and renders cleanly inside the
// orb regardless of the outer filter stack.

export const HERO_BADGE_ASSET_PATH = '/assets/apex-core-badge.png' as const;

export function getHeroBadgeAssetPath(): string {
  return HERO_BADGE_ASSET_PATH;
}
