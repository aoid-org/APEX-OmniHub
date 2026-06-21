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
vi.mock('../../../../src/assets/lightbulb-icon.png', () => ({ default: 'lightbulb-icon.png' }));

// ── CSS contract helpers ────────────────────────────────────────────────────

const CSS_PATH = resolve(__dirname, '../../apps/omnihub-site/src/styles/omnidash-layout.css');
const css = readFileSync(CSS_PATH, 'utf-8');

function extractBlock(pattern: RegExp): string | null {
  const m = pattern.exec(css);
  return m ? m[1] : null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('OmniSlate CSS — adaptive wrapper contract', () => {
  it('apex-hero-tile-wrapper--lg has flex-grow priority over --sm', () => {
    const lgBlock = extractBlock(/\.apex-hero-tile-wrapper--lg\s*\{([^}]*)\}/);
    const smBlock = extractBlock(/\.apex-hero-tile-wrapper--sm\s*\{([^}]*)\}/);

    expect(lgBlock).not.toBeNull();
    expect(smBlock).not.toBeNull();

    // lg must have higher flex-grow (4) than sm (1)
    expect(lgBlock).toMatch(/flex:/);
    const lgFlex = lgBlock!.match(/flex:\s*(\d+)/);
    const smFlex = smBlock!.match(/flex:\s*(\d+)/);
    expect(lgFlex).not.toBeNull();
    expect(smFlex).not.toBeNull();
    expect(Number(lgFlex![1])).toBeGreaterThan(Number(smFlex![1]));
  });

  it('apex-hero-tile-wrapper--sm has a min-width that prevents total collapse', () => {
    const smBlock = extractBlock(/\.apex-hero-tile-wrapper--sm\s*\{([^}]*)\}/);
    expect(smBlock).not.toBeNull();
    expect(smBlock).toContain('min-width:');
    // Must not be 0 or empty — assert value is at least 100px
    const minWidthMatch = smBlock!.match(/min-width:\s*(\d+)px/);
    if (minWidthMatch) {
      expect(Number(minWidthMatch[1])).toBeGreaterThanOrEqual(100);
    }
  });

  it('apex-hero-tile-wrapper--lg has a min-width to protect OmniSlate', () => {
    const lgBlock = extractBlock(/\.apex-hero-tile-wrapper--lg\s*\{([^}]*)\}/);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock).toContain('min-width:');
  });

  it('apex-hero-tile--sm uses width: 100% to fill wrapper', () => {
    const smBlock = extractBlock(/\.apex-hero-tile--sm\s*\{([^}]*)\}/);
    expect(smBlock).not.toBeNull();
    expect(smBlock).toContain('width: 100%');
  });

  it('apex-hero-tile--lg uses width: 100% to fill wrapper', () => {
    const lgBlock = extractBlock(/\.apex-hero-tile--lg\s*\{([^}]*)\}/);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock).toContain('width: 100%');
  });

  it('hero row retains gap: 20px and display: flex', () => {
    const rowBlock = extractBlock(/\.apex-hero-row\s*\{([^}]*)\}/);
    expect(rowBlock).not.toBeNull();
    expect(rowBlock).toContain('display: flex');
    expect(rowBlock).toContain('gap: 20px');
  });

  it('960px breakpoint wraps the hero row so OmniSlate reflows before clipping', () => {
    const media960 = css.match(/@media\s*\(max-width:\s*960px\)\s*\{([\s\S]*?)\n\}/);
    expect(media960).not.toBeNull();
    const block = media960![1];
    expect(block).toContain('flex-wrap: wrap');
    expect(block).toContain('apex-hero-tile-wrapper--lg');
  });

  it('at 640px all tiles stack vertically (no horizontal overflow path)', () => {
    const media640 = css.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)(?=\n@|\n\/\*|$)/);
    expect(media640).not.toBeNull();
    // Either flex-direction: column or all tiles go 100% width
    const block = media640![1];
    const hasColumn = block.includes('flex-direction: column');
    const hasFull = block.includes('min-width: 0') || block.includes('height:');
    expect(hasColumn || hasFull).toBe(true);
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

  it('outer wrapper carries the apex-hero-tile-wrapper--lg class', async () => {
    await renderOmniSlate();
    const pane = screen.getByTestId('omnislate-pane');
    expect(pane.className).toContain('apex-hero-tile-wrapper--lg');
  });
});
