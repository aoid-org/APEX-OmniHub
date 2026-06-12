/**
 * ModuleRenderer - Component Tests
 * @module tests/omnidash/module-renderer.spec
 *
 * OMNI-TEST UNIVERSAL - AAA pattern enforced.
 * Tests focus on deterministic logic: unknown key fallback and Suspense
 * boundary rendering. Lazy-component loading is covered by individual
 * module component tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock useOmniModuleState so module sub-deps resolve cleanly
vi.mock('@/hooks/useOmniModuleState', () => ({
  useOmniModuleState: vi.fn(() => ({
    moduleKey: 'test',
    isLoading: false,
    error: null,
    title: 'Test',
    description: '',
    stats: [],
    items: [],
    actions: [],
    content: null,
  })),
}));

// Mock all lazy modules with deterministic stubs that resolve synchronously
vi.mock('@/dashboard/components/modules/OmniSkillsModule', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mod-omniskills"><button onClick={onClose}>close</button></div>
  ),
}));
vi.mock('@/dashboard/components/modules/PhysiOmniModule', () => ({
  default: () => <div data-testid="mod-physiomni" />,
}));
vi.mock('@/dashboard/components/modules/AuditsModule', () => ({
  default: () => <div data-testid="mod-audits" />,
}));
vi.mock('@/dashboard/components/modules/LinksModule', () => ({
  default: () => <div data-testid="mod-links" />,
}));
vi.mock('@/dashboard/components/modules/AutomationsModule', () => ({
  default: () => <div data-testid="mod-automations" />,
}));
vi.mock('@/dashboard/components/modules/WorkflowsModule', () => ({
  default: () => <div data-testid="mod-workflows" />,
}));
vi.mock('@/dashboard/components/modules/FilesModule', () => ({
  default: () => <div data-testid="mod-files" />,
}));
vi.mock('@/dashboard/components/modules/BillingModule', () => ({
  default: () => <div data-testid="mod-billing" />,
}));
vi.mock('@/dashboard/components/modules/SettingsModule', () => ({
  default: () => <div data-testid="mod-settings" />,
}));
vi.mock('@/dashboard/components/modules/TranslationModule', () => ({
  default: () => <div data-testid="mod-translation" />,
}));

import { ModuleRenderer } from '@/dashboard/components/ModuleRenderer';

describe('ModuleRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Unknown moduleKey - fallback rendering', () => {
    it('shows "Module data unavailable." for unknown key', () => {
      render(<ModuleRenderer moduleKey="nonexistent" onClose={vi.fn()} />);
      expect(screen.getByText('Module data unavailable.')).toBeInTheDocument();
    });

    it('shows "Module data unavailable." for empty string key', () => {
      render(<ModuleRenderer moduleKey="" onClose={vi.fn()} />);
      expect(screen.getByText('Module data unavailable.')).toBeInTheDocument();
    });

    it('does not call onClose for unknown key render', () => {
      const onClose = vi.fn();
      render(<ModuleRenderer moduleKey="ghost" onClose={onClose} />);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Known moduleKey - Suspense boundary', () => {
    it('does NOT render fallback text for known key', async () => {
      await act(async () => {
        render(<ModuleRenderer moduleKey="omniskills" onClose={vi.fn()} />);
      });
      expect(screen.queryByText('Module data unavailable.')).not.toBeInTheDocument();
    });

    // Verify Suspense boundary renders for each known module key
    it.each([
      'physiomni', 'audits', 'links', 'automations',
      'workflows', 'files', 'billing', 'settings', 'translation'
    ])('does not show unavailable fallback for key "%s"', async (key) => {
      await act(async () => {
        render(<ModuleRenderer moduleKey={key} onClose={vi.fn()} />);
      });
      expect(screen.queryByText('Module data unavailable.')).not.toBeInTheDocument();
    });
  });
});
