/**
 * Hero visual — single transparent PNG asset (theme-agnostic).
 */
export function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <img
        src="/assets/hero-image.png"
        alt=""
        className="hero-visual__image"
        loading="eager"
      />
    </div>
  );
}
