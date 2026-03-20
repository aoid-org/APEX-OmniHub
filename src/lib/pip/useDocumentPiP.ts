/**
 * useDocumentPiP — React Hook for Document Picture-in-Picture API
 *
 * Wraps the documentPictureInPicture API with React createPortal so that
 * arbitrary React subtrees can be rendered into a detached PiP window.
 * Stylesheets are copied from the main document to ensure visual consistency.
 *
 * Memory heap stays anchored to the main browser thread; the PiP window
 * only receives the portal mount point.
 *
 * @module lib/pip/useDocumentPiP
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { useState, useCallback, useEffect, useRef, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Types
// ============================================================================

export interface PiPOptions {
  /** Width of the PiP window in pixels. */
  width?: number;
  /** Height of the PiP window in pixels. */
  height?: number;
}

export interface UseDocumentPiPReturn {
  /** Whether the browser supports Document Picture-in-Picture. */
  isSupported: boolean;
  /** Whether a PiP window is currently open. */
  isPiPActive: boolean;
  /** Open a PiP window. Resolves once the window is ready. */
  requestPiP: (options?: PiPOptions) => Promise<void>;
  /** Close the PiP window if open. */
  closePiP: () => void;
  /** Reference to the raw PiP Window object (null when inactive). */
  pipWindow: Window | null;
  /** Portal component — renders children into the PiP window's document.body. */
  PiPPortal: FC<{ children: ReactNode }>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Copies all stylesheets (both <link> and <style> elements) from the source
 * document into the target document so that portalled content retains styling.
 */
function copyStylesheets(source: Document, target: Document): void {
  // Copy <link rel="stylesheet"> elements
  const linkElements = source.querySelectorAll('link[rel="stylesheet"]');
  linkElements.forEach((link) => {
    const clone = target.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = (link as HTMLLinkElement).href;
    if ((link as HTMLLinkElement).media) {
      clone.media = (link as HTMLLinkElement).media;
    }
    target.head.appendChild(clone);
  });

  // Copy inline <style> elements
  const styleElements = source.querySelectorAll('style');
  styleElements.forEach((style) => {
    const clone = target.createElement('style');
    clone.textContent = style.textContent;
    target.head.appendChild(clone);
  });
}

// ============================================================================
// Hook
// ============================================================================

export function useDocumentPiP(): UseDocumentPiPReturn {
  const isSupported =
    globalThis.window !== undefined &&
    'documentPictureInPicture' in globalThis;

  const [pipWindow, setPiPWindow] = useState<Window | null>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Track the current PiP window in a ref so cleanup callbacks always have the
  // latest reference without depending on React state scheduling.
  const pipWindowRef = useRef<Window | null>(null);

  /**
   * Handle the PiP window's pagehide event (fired when the user closes the
   * PiP window via its native chrome controls).
   */
  const handlePiPClose = useCallback(() => {
    pipWindowRef.current = null;
    setPiPWindow(null);
    setIsPiPActive(false);
  }, []);

  const requestPiP = useCallback(
    async (options?: PiPOptions) => {
      if (!isSupported) {
        console.warn('[useDocumentPiP] Document Picture-in-Picture is not supported in this browser.');
        return;
      }

      // If there is already an active PiP window, close it first.
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        handlePiPClose();
      }

      try {
        // The documentPictureInPicture API is not yet in lib.dom.d.ts, so we
        // cast through the global to access it.
        const dpip = (globalThis as unknown as Record<string, unknown>)['documentPictureInPicture'] as {
          requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
        };

        const win = await dpip.requestWindow({
          width: options?.width,
          height: options?.height,
        });

        // Copy stylesheets so portalled content looks correct.
        copyStylesheets(document, win.document);

        // Listen for the PiP window closing.
        win.addEventListener('pagehide', handlePiPClose);

        pipWindowRef.current = win;
        setPiPWindow(win);
        setIsPiPActive(true);
      } catch (err) {
        console.error('[useDocumentPiP] Failed to open PiP window:', err);
        handlePiPClose();
      }
    },
    [isSupported, handlePiPClose],
  );

  const closePiP = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      handlePiPClose();
    }
  }, [handlePiPClose]);

  // Clean up on unmount — close any lingering PiP window.
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.removeEventListener('pagehide', handlePiPClose);
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
    };
  }, [handlePiPClose]);

  // ------------------------------------------------------------------
  // PiPPortal component
  // ------------------------------------------------------------------

  const PiPPortal: FC<{ children: ReactNode }> = useCallback(
    ({ children }: { children: ReactNode }) => {
      if (!pipWindow) {
        return null;
      }
      return createPortal(children, pipWindow.document.body);
    },
    [pipWindow],
  ) as FC<{ children: ReactNode }>;

  return {
    isSupported,
    isPiPActive,
    requestPiP,
    closePiP,
    pipWindow,
    PiPPortal,
  };
}
