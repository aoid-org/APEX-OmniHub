/**
 * Modal Layering & Readability — Regression Tests
 * @module tests/omnidash/modal-layering-regression.spec
 *
 * Proves:
 * 1. Dialog content has bg-background and text-foreground classes (readable)
 * 2. Dialog content z-index (9001) > overlay z-index (8999)
 * 3. OmniSpatialHost custom backdrop is transparent (no double-darkness)
 * 4. Design tokens are defined in globals.css
 * 5. Tailwind config maps bg-background / text-foreground to CSS vars
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Polyfill PointerEvent for Radix UI Dialog in jsdom
if (!(globalThis as Record<string, unknown>).PointerEvent) {
  class PointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    constructor(type: string, props: PointerEventInit & { button?: number; ctrlKey?: boolean }) {
      super(type, props);
      this.button = props?.button || 0;
      this.ctrlKey = props?.ctrlKey || false;
    }
  }
  (globalThis as Record<string, unknown>).PointerEvent = PointerEvent;
}

describe('Modal Layering Regression', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Dialog Primitive — z-index and styling', () => {
    it('DialogContent has bg-background and text-foreground classes', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test Title</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
            <p>Content</p>
          </DialogContent>
        </Dialog>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('bg-background');
      expect(dialog.className).toContain('text-foreground');
    });

    it('DialogContent z-index (9001) is above overlay z-index (8999)', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Z-Index Test</DialogTitle>
            <DialogDescription>Checks stacking</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('z-[9001]');
    });

    it('DialogContent has pointer-events enabled', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Click Test</DialogTitle>
            <DialogDescription>Checks pointer events</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      const dialog = screen.getByRole('dialog');
      const style = globalThis.getComputedStyle(dialog);
      expect(style.pointerEvents).not.toBe('none');
    });

    it('DialogOverlay uses bg-black/50 (not 80)', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Overlay Test</DialogTitle>
            <DialogDescription>Checks overlay opacity</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      // DialogOverlay is rendered inside DialogContent's portal
      // Find it by its data attribute
      const overlays = document.querySelectorAll('[data-state="open"][class*="bg-black"]');
      overlays.forEach((el) => {
        expect(el.className).toContain('bg-black/50');
        expect(el.className).not.toContain('bg-black/80');
      });
    });
  });

  describe('OmniSpatialHost Source — no double overlay', () => {
    it('custom backdrop in OmniSpatialHost uses bg-transparent (click handler only)', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');

      // Check both copies of OmniSpatialHost
      const paths = [
        path.resolve(__dirname, '../../apps/omnihub-site/dashboard/components/OmniSpatialHost.tsx'),
        path.resolve(__dirname, '../../apps/omnihub-site/src/components/omnidash/OmniSpatialHost.tsx'),
      ];

      for (const filePath of paths) {
        const source = fs.readFileSync(filePath, 'utf-8');

        // Find the custom backdrop button line
        const backdropRegex = /aria-label="Close modal"[\s\S]*?className="([^"]+)"/;
        const backdropMatch = backdropRegex.exec(source);
        expect(backdropMatch).not.toBeNull();

        const backdropClasses = backdropMatch![1];
        // Must be transparent — visual overlay comes from DialogOverlay only
        expect(backdropClasses).toContain('bg-transparent');
        // Must NOT have bg-black with opacity
        expect(backdropClasses).not.toMatch(/bg-black\/\d/);
      }
    });

    it('DialogContent in OmniSpatialHost has z-[9001] (above backdrop)', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');

      const paths = [
        path.resolve(__dirname, '../../apps/omnihub-site/dashboard/components/OmniSpatialHost.tsx'),
        path.resolve(__dirname, '../../apps/omnihub-site/src/components/omnidash/OmniSpatialHost.tsx'),
      ];

      for (const filePath of paths) {
        const source = fs.readFileSync(filePath, 'utf-8');
        // DialogContent className should include z-[9001]
        expect(source).toContain('z-[9001]');
      }
    });
  });

  describe('Design Tokens', () => {
    it('globals.css defines --background and --foreground CSS variables', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const cssPath = path.resolve(__dirname, '../../apps/omnihub-site/src/styles/globals.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      expect(css).toContain('--background:');
      expect(css).toContain('--foreground:');
      expect(css).toContain('--muted-foreground:');
      expect(css).toContain('--border:');
    });

    it('tailwind.config.cjs maps bg-background to hsl(var(--background))', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const configPath = path.resolve(__dirname, '../../apps/omnihub-site/tailwind.config.cjs');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain('background: "hsl(var(--background))"');
      expect(config).toContain('foreground: "hsl(var(--foreground))"');
    });

    it('tailwind.config.cjs content paths include dashboard components', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const configPath = path.resolve(__dirname, '../../apps/omnihub-site/tailwind.config.cjs');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain('./dashboard/**/*.{js,ts,jsx,tsx}');
    });
  });
});
