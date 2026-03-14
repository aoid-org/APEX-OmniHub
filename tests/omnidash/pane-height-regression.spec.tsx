/**
 * Pane Height & Scroll — Regression Tests
 * @module tests/omnidash/pane-height-regression.spec
 *
 * Proves:
 * 1. Hero tiles have a max-height constraint (via CSS class)
 * 2. Hero tiles use overflow-y-auto (not overflow-hidden) for internal scrolling
 * 3. All three pane types (AgentPane, OmniSlatePane, EcosystemPane) are consistent
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EcosystemPane } from '@/dashboard/components/DashboardOverview/components/EcosystemPane';
import { OmniSlatePane } from '@/dashboard/components/DashboardOverview/components/OmniSlatePane';
import { AgentPane } from '@/dashboard/components/DashboardOverview/components/AgentPane';

// Asset mocks
vi.mock('@/assets/lightbulb-icon.png', () => ({ default: 'lightbulb.png' }));

const OMNISLATE_PROPS = {
  context: [] as readonly { name: string; health: string; insight: string }[],
  health: 'green' as const,
  activeInsight: null,
  prompt: '',
  isRecording: false,
  recordingDuration: 0,
  traceLogs: [] as string[],
  onCleanSlate: vi.fn(),
  onToggleGlobalInsight: vi.fn(),
  onToggleInsight: vi.fn(),
  onPromptChange: vi.fn(),
  onCommandSubmit: vi.fn(),
  onToggleRecording: vi.fn(),
};

/**
 * Helper: find the outermost hero tile element in the rendered output.
 * Hero tiles use the apex-hero-tile CSS class.
 */
function findHeroTile(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[class*="apex-hero-tile"]');
}

describe('Pane Height Regression', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('EcosystemPane', () => {
    it('uses overflow-y-auto (not overflow-hidden) on the hero tile', () => {
      const { container } = render(<EcosystemPane ecoAppsVisible={true} />);
      const tile = findHeroTile(container);
      expect(tile).not.toBeNull();

      const classes = tile!.className;
      expect(classes).toContain('overflow-y-auto');
      expect(classes).not.toContain('overflow-hidden');
    });

    it('has apex-hero-tile--sm class for max-height constraint', () => {
      const { container } = render(<EcosystemPane ecoAppsVisible={true} />);
      const tile = findHeroTile(container);
      expect(tile!.className).toContain('apex-hero-tile--sm');
    });
  });

  describe('OmniSlatePane', () => {
    it('uses overflow-y-auto (not overflow-hidden) on the hero tile', () => {
      const { container } = render(<OmniSlatePane {...OMNISLATE_PROPS} />);
      const tile = findHeroTile(container);
      expect(tile).not.toBeNull();

      const classes = tile!.className;
      expect(classes).toContain('overflow-y-auto');
      expect(classes).not.toContain('overflow-hidden');
    });

    it('has apex-hero-tile--lg class for max-height constraint', () => {
      const { container } = render(<OmniSlatePane {...OMNISLATE_PROPS} />);
      const tile = findHeroTile(container);
      expect(tile!.className).toContain('apex-hero-tile--lg');
    });
  });

  describe('AgentPane', () => {
    it('uses overflow-y-auto (not overflow-hidden) on the hero tile', () => {
      const { container } = render(<AgentPane agentStatus="idle" />);
      const tile = findHeroTile(container);
      expect(tile).not.toBeNull();

      const classes = tile!.className;
      expect(classes).toContain('overflow-y-auto');
      expect(classes).not.toContain('overflow-hidden');
    });

    it('has apex-hero-tile--sm class for max-height constraint', () => {
      const { container } = render(<AgentPane agentStatus="idle" />);
      const tile = findHeroTile(container);
      expect(tile!.className).toContain('apex-hero-tile--sm');
    });
  });

  describe('CSS max-height constraint', () => {
    it('.apex-hero-tile--sm and --lg classes exist in omnidash-layout.css with max-height', async () => {
      // This test reads the CSS file directly to verify the constraint exists
      const fs = await import('node:fs');
      const path = await import('node:path');
      const cssPath = path.resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Both tile sizes must have max-height defined
      const smBlock = css.match(/\.apex-hero-tile--sm\s*\{[^}]*\}/s);
      expect(smBlock).not.toBeNull();
      expect(smBlock![0]).toContain('max-height');

      const lgBlock = css.match(/\.apex-hero-tile--lg\s*\{[^}]*\}/s);
      expect(lgBlock).not.toBeNull();
      expect(lgBlock![0]).toContain('max-height');
    });

    it('.apex-hero-tile--sm and --lg use overflow-y: auto in CSS', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const cssPath = path.resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      const smBlock = css.match(/\.apex-hero-tile--sm\s*\{[^}]*\}/s);
      expect(smBlock![0]).toContain('overflow-y: auto');

      const lgBlock = css.match(/\.apex-hero-tile--lg\s*\{[^}]*\}/s);
      expect(lgBlock![0]).toContain('overflow-y: auto');
    });
  });
});
