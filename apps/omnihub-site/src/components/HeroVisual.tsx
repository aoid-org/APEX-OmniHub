

/**
 * Theme-aware hero visual that swaps between light and dark PNG assets.
 * Falls back to SVG if PNGs fail to load.
 */
export function HeroVisual() {
  const src = '/assets/hero-new.png';

  return (
    <div className="hero-visual" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="hero-visual__image"
        loading="eager"
      />
    </div>
  );
}
