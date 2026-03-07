import { useState, useEffect } from 'react';

/**
 * Theme-aware hero visual that swaps between light and dark PNG assets.
 */
export function HeroVisual() {
    const [theme, setTheme] = useState<string>(
    () => document.documentElement.dataset.theme ?? 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme ?? 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const src =
    theme === 'dark' ? '/assets/hero-night.png' : '/assets/hero-light.png';

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
