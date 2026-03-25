/**
 * useViewport — Deterministic viewport breakpoint detection
 *
 * Apple-standard breakpoints:
 *   Mobile:  ≤640px
 *   Tablet:  641–1024px
 *   Desktop: >1024px
 *
 * Uses matchMedia for paint-free, debounce-free detection.
 * SSR-safe: defaults to desktop when window is unavailable.
 */
import { useState, useEffect } from "react";

/** Breakpoint thresholds (px) */
const MOBILE_MAX = 640;
const TABLET_MAX = 1024;

export interface ViewportState {
  /** True when viewport width ≤ 640px */
  readonly isMobile: boolean;
  /** True when viewport width is 641–1024px */
  readonly isTablet: boolean;
  /** True when viewport width > 1024px */
  readonly isDesktop: boolean;
  /** Current viewport width in pixels */
  readonly width: number;
}

function getViewport(): ViewportState {
  if (typeof globalThis === "undefined" || !globalThis.document) {
    return { isMobile: false, isTablet: false, isDesktop: true, width: 1440 };
  }
  const w = globalThis.innerWidth;
  return {
    isMobile: w <= MOBILE_MAX,
    isTablet: w > MOBILE_MAX && w <= TABLET_MAX,
    isDesktop: w > TABLET_MAX,
    width: w,
  };
}

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(getViewport);

  useEffect(() => {
    const mobileQuery = globalThis.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const tabletQuery = globalThis.matchMedia(
      `(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`,
    );

    const update = () => {
      setViewport(getViewport());
    };

    mobileQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);

    // Sync on mount in case SSR default differs
    update();

    return () => {
      mobileQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);

  return viewport;
}
