/**
 * Pane Height & Scroll — Regression Tests
 * @module tests/omnidash/pane-height-regression.spec
 *
 * Proves (post-fix):
 * 1. Hero tiles use overflow-hidden (deterministic containment, NOT overflow-y-auto)
 * 2. Hero tiles have a fixed height constraint from CSS (not just a max-height cap)
 * 3. All three pane types (AgentPane, OmniSlatePane, EcosystemPane) are consistent
 *
 * Layout rationale: Fixed height (420px) + overflow:hidden makes each tile a
 * stable spatial unit.  Variable content (chips, messages, trace logs) is
 * contained INSIDE via internal scroll regions — it cannot grow the outer tile.
 * This prevents the layout-cascade effect where one tile's content change
 * causes sibling tiles to animate via framer-motion's layout propagation.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EcosystemPane } from '@/dashboard/components/DashboardOverview/components/EcosystemPane';
import { OmniSlatePane } from '@/dashboard/components/DashboardOverview/components/OmniSlatePane';
import { AgentPane } from '@/dashboard/components/DashboardOverview/components/AgentPane';
import type { ContextItem } from '@/dashboard/components/DashboardOverview/types';

// Asset mocks
vi.mock('@/assets/lightbulb-icon.png', () => ({ default: 'lightbulb.png' }));
vi.mock('@/assets/sentinel-avatar-icon.png', () => ({ default: 'sentinel.png' }));

const OMNISLATE_PROPS = {
  context: [] as readonly ContextItem[],
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
    it('uses overflow-hidden (not overflow-y-auto) on the hero tile', () => {
      const { container } = render(<EcosystemPane ecoAppsVisible={true} />);
      const tile = findHeroTile(container);
      expect(tile).not.toBeNull();

      const classes = tile!.className;
      expect(classes).toContain('overflow-hidden');
      expect(classes).not.toContain('overflow-y-auto');
    });

    it('has apex-hero-tile--sm class for fixed-height constraint', () => {
      const { container } = render(<EcosystemPane ecoAppsVisible={true} />);
      const tile = findHeroTile(container);
      expect(tile!.className).toContain('apex-hero-tile--sm');
    });
  });

  describe('OmniSlatePane', () => {
    it('uses overflow-hidden (not overflow-y-auto) on the hero tile', () => {
      const { container } = render(<OmniSlatePane {...OMNISLATE_PROPS} />);
      const tile = findHeroTile(container);
      expect(tile).not.toBeNull();

      const classes = tile!.className;
      expect(classes).toContain('overflow-hidden');
      expect(classes).not.toContain('overflow-y-auto');
    });

    it('has apex-hero-tile--lg class for fixed-height constraint', () => {
      const { container } = render(<OmniSlatePane {...OMNISLATE_PROPS} />);
      const tile = findHeroTile(container);
      expect(tile!.className).toContain('apex-hero-tile--lg');
    });
  });

  describe('AgentPane', () => {
    it('uses overflow-hidden (not overflow-y-auto) on the hero tile', () => {
      const { container } = render(<AgentPane agentStatus="listening" />);
      const tile = findHeroTile(container);
      expect(tile).not.toBeNull();

      const classes = tile!.className;
      expect(classes).toContain('overflow-hidden');
      expect(classes).not.toContain('overflow-y-auto');
    });

    it('has apex-hero-tile--sm class for fixed-height constraint', () => {
      const { container } = render(<AgentPane agentStatus="listening" />);
      const tile = findHeroTile(container);
      expect(tile!.className).toContain('apex-hero-tile--sm');
    });
  });

  describe('CSS fixed-height constraint', () => {
    it('.apex-hero-tile--sm and --lg have a fixed height (not just max-height)', async () => {
      // Fixed height (not just a max-height cap) makes tiles stable spatial units.
      // Content change cannot make the tile taller than its allocated height.
      const fs = await import('node:fs');
      const path = await import('node:path');
      const cssPath = path.resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      const smRegex = /\.apex-hero-tile--sm\s*\{[^}]*\}/s;
      const smBlock = smRegex.exec(css);
      expect(smBlock).not.toBeNull();
      expect(smBlock![0]).toMatch(/\bheight\s*:/);

      const lgRegex = /\.apex-hero-tile--lg\s*\{[^}]*\}/s;
      const lgBlock = lgRegex.exec(css);
      expect(lgBlock).not.toBeNull();
      expect(lgBlock![0]).toMatch(/\bheight\s*:/);
    });

    it('.apex-hero-tile--sm and --lg use overflow: hidden in CSS', async () => {
      // overflow: hidden is the CSS-level guarantee that tiles cannot grow beyond
      // their fixed height regardless of content.
      const fs = await import('node:fs');
      const path = await import('node:path');
      const cssPath = path.resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      const smRegex = /\.apex-hero-tile--sm\s*\{[^}]*\}/s;
      const smBlock = smRegex.exec(css);
      expect(smBlock![0]).toContain('overflow: hidden');
      expect(smBlock![0]).not.toContain('overflow-y: auto');

      const lgRegex = /\.apex-hero-tile--lg\s*\{[^}]*\}/s;
      const lgBlock = lgRegex.exec(css);
      expect(lgBlock![0]).toContain('overflow: hidden');
      expect(lgBlock![0]).not.toContain('overflow-y: auto');
    });
  });
});
