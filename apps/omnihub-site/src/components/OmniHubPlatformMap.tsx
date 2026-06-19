/**
 * OmniHubPlatformMap — React wrapper for the embeddable starmap section.
 *
 * Loads /omnihub-starmap.js once (idempotent) and mounts the section into
 * a host div. Designed to drop in alongside other landing-page sections
 * on apexomnihub.icu (same React/Vite app as the existing site).
 *
 * Usage on the landing page:
 *   import OmniHubPlatformMap from './components/OmniHubPlatformMap';
 *   ...
 *   <OmniHubPlatformMap />
 *
 * Or with options:
 *   <OmniHubPlatformMap ctaHref="/request-access" demoHref="/demo" />
 */
import { useEffect, useRef, CSSProperties } from 'react';

declare global {
  interface Window {
    OmniHubStarmap?: {
      mount: (
        host: HTMLElement,
        options?: { ctaHref?: string; demoHref?: string; threeSrc?: string }
      ) => void;
    };
  }
}

const SCRIPT_SRC = '/omnihub-starmap.js';
const SCRIPT_ID  = 'ohsm-script';

function loadScriptOnce(): Promise<void> {
  if (globalThis.window === undefined) return Promise.resolve();
  if (globalThis.window.OmniHubStarmap) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((res) => {
      if (globalThis.window.OmniHubStarmap) { res(); return; }
      existing.addEventListener('load', () => res(), { once: true });
    });
  }
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.defer = true;
    s.onload  = () => res();
    s.onerror = () => rej(new Error('Failed to load omnihub-starmap.js'));
    document.head.appendChild(s);
  });
}

interface OmniHubPlatformMapProps {
  id?: string;
  ctaHref?: string;
  demoHref?: string;
  threeSrc?: string;
  className?: string;
  style?: CSSProperties;
}

export default function OmniHubPlatformMap({
  id = 'platform-map',
  ctaHref  = '/request-access',
  demoHref = '/demo',
  threeSrc = '/vendor/three.min.js',
  className = '',
  style,
}: Readonly<OmniHubPlatformMapProps>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadScriptOnce()
      .then(() => {
        if (cancelled || !ref.current || !globalThis.window.OmniHubStarmap) return;
        globalThis.window.OmniHubStarmap.mount(ref.current, { ctaHref, demoHref, threeSrc });
      })
      .catch((err: unknown) => {
        // Soft-fail: keep the page healthy; show nothing rather than crash.
        console.error('[OmniHubPlatformMap]', err);
      });
    return () => { cancelled = true; };
  }, [ctaHref, demoHref, threeSrc]);

  return (
    <section
      ref={ref}
      id={id}
      className={`omnihub-platform-map-host ${className}`.trim()}
      style={style}
      aria-label="Platform capability map"
    />
  );
}
