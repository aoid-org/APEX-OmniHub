import { useEffect } from "react";

/**
 * ManifestoPage
 *
 * Thin SPA bridge for the APEX Manifesto.
 * The manifesto is served as a self-contained static HTML document at
 * /manifesto.html (Cloudflare Pages edge-cached). This component
 * handles client-side navigation from within the React SPA by issuing
 * a hard navigation to that asset — preserving the manifesto's own
 * CSS/font/animation isolation and avoiding any React hydration
 * conflicts.
 *
 * Route registrations (App.tsx):
 *   /manifesto          → this component → /manifesto.html
 *   /manifesto.html     → this component → /manifesto.html (idempotent)
 *   /apex-manifesto     → this component → /manifesto.html (legacy compat)
 *   /apex-manifesto.html→ this component → /manifesto.html (legacy compat)
 */
export function ManifestoPage(): null {
  useEffect(() => {
    // Replace history entry so back-button returns cleanly to the SPA.
    globalThis.location.replace("/apex-manifesto.html");
  }, []);

  return null;
}

export default ManifestoPage;

