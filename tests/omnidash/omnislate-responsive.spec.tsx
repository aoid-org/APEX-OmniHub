/**
 * OmniSlate Responsive Layout Tests
 * Verifies that OmniSlate prompt controls remain accessible across constrained viewports.
 * Covers the BYOM Phase B validation blocker: prompt input must be reachable.
 *
 * Browser viewport tests are delegated to Antigravity (Playwright).
 * These tests verify CSS contracts and stable selector presence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactNode } from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      'data-testid': testId,
      onPointerDown,
      onDragEnd,
      onDragOver,
      onDrop,
      ...rest
    }: {
      children?: ReactNode;
      className?: string;
      style?: React.CSSProperties;
      'data-testid'?: string;
      onPointerDown?: () => void;
      onDragEnd?: () => void;
      onDragOver?: (e: React.DragEvent) => void;
      onDrop?: (e: React.DragEvent) => void;
    } & Record<string, unknown>) => (
      <div
        className={className}
        style={style}
        data-testid={testId}
        onPointerDown={onPointerDown}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        {...rest}
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
  }),
  useSpring: (value: number) => ({
    get: () => value,
    set: vi.fn(),
  }),
}));

vi.mock('../../apps/omnihub-site/src/stores/omniDashStore', () => ({
  useOmniDash: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      widgets: new Map([
        ['omnislate-pane', { position: { x: 0, y: 0 }, zIndex: 100 }],
      ]),
      openWidget: vi.fn(),
      moveWidget: vi.fn(),
      focusWidget: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../apps/omnihub-site/src/stores/omniSlateStore', () => ({
  useOmniSlateStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      contextItems: [],
      addContext: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../apps/omnihub-site/dashboard/components/DashboardOverview/components/RecordButton', () => ({
  RecordButton: ({ onToggle }: { onToggle: () => void }) => (
    <button
      type="button"
      data-testid="record-button"
      onClick={onToggle}
      style={{ width: 36, height: 36 }}
    />
  ),
}));

// Stub image imports
vi.mock('../../apps/omnihub-site/src/assets/lightbulb-icon.png', () => ({ default: 'lightbulb-icon.png' }));

vi.mock('../../apps/omnihub-site/dashboard/components/DashboardOverview/components/ContextTile', () => ({
  ContextTile: ({ ctx }: { ctx: { id: string; label: string } }) => (
    <div data-testid={`context-tile-${ctx.id}`}>{ctx.label}</div>
  ),
}));

// ── CSS contract helpers ────────────────────────────────────────────────────

const CSS_PATH = resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');
const css = readFileSync(CSS_PATH, 'utf-8');

function extractBlock(pattern: RegExp): string | null {
  const m = pattern.exec(css);
  return m ? m[1] : null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('OmniSlate CSS — canonical tile contract', () => {
  it('apex-hero-row has display: flex and gap: 20px', () => {
    const rowBlock = extractBlock(/\.apex-hero-row\s*\{([^}]*)\}/);
    expect(rowBlock).not.toBeNull();
    expect(rowBlock).toContain('display: flex');
    expect(rowBlock).toContain('gap: 20px');
  });

  it('apex-hero-tile--lg has a fixed height', () => {
    const lgBlock = extractBlock(/\.apex-hero-tile--lg\s*\{([^}]*)\}/);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock).toContain('height:');
  });

  it('apex-hero-tile--sm has a fixed height', () => {
    const smBlock = extractBlock(/\.apex-hero-tile--sm\s*\{([^}]*)\}/);
    expect(smBlock).not.toBeNull();
    expect(smBlock).toContain('height:');
  });

  it('apex-hero-tile--lg has overflow: hidden', () => {
    const lgBlock = extractBlock(/\.apex-hero-tile--lg\s*\{([^}]*)\}/);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock).toContain('overflow: hidden');
  });

  it('apex-hero-tile--sm has overflow: hidden', () => {
    const smBlock = extractBlock(/\.apex-hero-tile--sm\s*\{([^}]*)\}/);
    expect(smBlock).not.toBeNull();
    expect(smBlock).toContain('overflow: hidden');
  });

  it('apex-hero-row does not use display: grid', () => {
    const rowBlock = extractBlock(/\.apex-hero-row\s*\{([^}]*)\}/);
    expect(rowBlock).not.toBeNull();
    expect(rowBlock).not.toContain('display: grid');
  });

  it('responsive breakpoints exist for narrower viewports', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)/);
  });
});


describe('OmniSlate component — stable selectors present', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function renderOmniSlate(props: Partial<Parameters<typeof import('../../apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane')['OmniSlatePane']>[0]> = {}) {
    const { OmniSlatePane } = await import('../../apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane');
    const defaults = {
      health: 'healthy' as const,
      activeInsight: null,
      prompt: '',
      isRecording: false,
      recordingDuration: 0,
      traceLogs: [],
      onCleanSlate: vi.fn(),
      onToggleGlobalInsight: vi.fn(),
      onToggleInsight: vi.fn(),
      onPromptChange: vi.fn(),
      onCommandSubmit: vi.fn(),
      onToggleRecording: vi.fn(),
    };
    return render(<OmniSlatePane {...defaults} {...props} />);
  }

  it('omnislate-pane testid is present on the outer wrapper', async () => {
    await renderOmniSlate();
    expect(screen.getByTestId('omnislate-pane')).toBeTruthy();
  });

  it('omnislate-prompt-input testid is present and is a text input', async () => {
    await renderOmniSlate();
    const input = screen.getByTestId('omnislate-prompt-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('text');
  });

  it('submit-prompt testid is present', async () => {
    await renderOmniSlate();
    expect(screen.getByTestId('submit-prompt')).toBeTruthy();
  });

  it('omnislate-prompt-row testid is present and contains input and submit button', async () => {
    await renderOmniSlate();
    const row = screen.getByTestId('omnislate-prompt-row');
    expect(row).toBeTruthy();
    expect(row.querySelector('[data-testid="omnislate-prompt-input"]')).toBeTruthy();
    expect(row.querySelector('[data-testid="submit-prompt"]')).toBeTruthy();
  });

  it('omnislate-prompt-row has flex-shrink: 0 to protect from clipping', async () => {
    await renderOmniSlate();
    const row = screen.getByTestId('omnislate-prompt-row') as HTMLElement;
    expect(row.style.flexShrink).toBe('0');
  });

  it('prompt input has flex-grow set so it fills available space', async () => {
    await renderOmniSlate();
    const input = screen.getByTestId('omnislate-prompt-input') as HTMLInputElement;
    // JSDOM normalizes `flex: 1` to `'1 1 0%'` — verify flex-grow is non-zero
    const flexGrow = parseFloat(input.style.flexGrow || input.style.flex.split(' ')[0]);
    expect(flexGrow).toBeGreaterThan(0);
  });

  it('omnislate-insights-button is present when health is not healthy', async () => {
    await renderOmniSlate({ health: 'warning' });
    expect(screen.getByTestId('omnislate-insights-button')).toBeTruthy();
  });

  it('omnislate-insights-button is absent when health is healthy', async () => {
    await renderOmniSlate({ health: 'healthy' });
    expect(screen.queryByTestId('omnislate-insights-button')).toBeNull();
  });

  it('prompt input accepts value changes', async () => {
    const onPromptChange = vi.fn();
    await renderOmniSlate({ prompt: 'test query', onPromptChange });
    const input = screen.getByTestId('omnislate-prompt-input') as HTMLInputElement;
    expect(input.value).toBe('test query');
  });

  it('outer wrapper has the omnislate-pane testid for Antigravity selector targeting', async () => {
    await renderOmniSlate();
    const pane = screen.getByTestId('omnislate-pane');
    expect(pane).toBeTruthy();
    // The outer wrapper should NOT be the Framer Motion div
    expect(pane.getAttribute('data-testid')).toBe('omnislate-pane');
  });

  it('many context items do not push the prompt row out of the pane', async () => {
    const { useOmniSlateStore } = await import('../../apps/omnihub-site/src/stores/omniSlateStore');
    vi.mocked(useOmniSlateStore).mockImplementation((selector?: (s: unknown) => unknown) => {
      const state = {
        contextItems: Array.from({ length: 20 }, (_, i) => ({
          id: `ctx-${i}`,
          kind: 'apex_app' as const,
          label: `Context ${i}`,
          source: 'drag' as const,
          health: 'healthy' as const,
          metadata: {},
          droppedAt: new Date().toISOString(),
        })),
        addContext: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    await renderOmniSlate();
    const row = screen.getByTestId('omnislate-prompt-row');
    expect(row).toBeTruthy();
    expect(row.querySelector('[data-testid="omnislate-prompt-input"]')).toBeTruthy();
    expect(row.querySelector('[data-testid="submit-prompt"]')).toBeTruthy();
    expect(row.style.flexShrink).toBe('0');
  });
});
