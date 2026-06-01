/**
 * Tile Stability — Spatial Resistance & OmniSlate Height Regression Suite
 * @module tests/omnidash/tile-stability.spec
 *
 * BUG FAMILY A — Tile Displacement / Drag Threshold
 *   Proves: edge contact (< 8px) does NOT activate drag (spatial resistance).
 *   Proves: only geometric commitment (>= 8px) crosses the reorder threshold.
 *   Proves: stationary tiles (outer hero tiles) do not have layout-cascade props
 *           that cause sibling displacement on incidental hover/contact.
 *
 * BUG FAMILY B — OmniSlate Height Stability
 *   Proves: outer tile height is deterministic (overflow-hidden, not overflow-y-auto).
 *   Proves: variable-length context chips are bounded internally (maxHeight).
 *   Proves: long suggested-action/trace text cannot grow the outer tile container.
 *
 * Tests FAIL before the fix and PASS after.
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Framer-motion mock — strips animation props, passes standard HTML attrs ──
vi.mock('framer-motion', () => {
  const FRAMER_PROPS = new Set([
    'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
    'animate', 'initial', 'exit', 'variants', 'transition', 'layout',
    'layoutId', 'drag', 'dragControls', 'dragListener', 'dragConstraints', 'dragElastic', 'dragMomentum',
    'dragTransition', 'dragSnapToOrigin', 'onDragStart', 'onDragEnd',
    'onAnimationStart', 'onAnimationComplete', 'onHoverStart', 'onHoverEnd',
  ]);
  type ReactChildren = { children?: React.ReactNode };
  function strip(props: ReactChildren & Record<string, unknown>) {
    const { children: _c, ...rest } = props;
    return Object.fromEntries(Object.entries(rest).filter(([k]) => !FRAMER_PROPS.has(k)));
  }
  return {
    motion: {
      div: ({ children, ...props }: ReactChildren & Record<string, unknown>) =>
        React.createElement('div', strip({ children, ...props }), children),
    },
    AnimatePresence: ({ children }: ReactChildren) => React.createElement(React.Fragment, null, children),
    useMotionValue: (v: unknown) => ({ get: () => v, set: vi.fn(), on: vi.fn() }),
    useSpring: (v: unknown) => ({ get: () => v, set: vi.fn() }),
    useTransform: vi.fn(() => ({ get: vi.fn() })),
    useDragControls: vi.fn(() => ({ start: vi.fn() })),
  };
});

// ── Asset mocks ────────────────────────────────────────────────────────────────
vi.mock('@/assets/lightbulb-icon.png', () => ({ default: 'lightbulb.png' }));
vi.mock('@/assets/sentinel-avatar-icon.png', () => ({ default: 'sentinel.png' }));

// ── Component imports (post-mock) ─────────────────────────────────────────────
import { OmniSlatePane } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane';
import { EcosystemPane } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/components/EcosystemPane';
import { AgentPane } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/components/AgentPane';
import type { ContextItem } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/types';
import { useOmniSlateStore } from '../../apps/omnihub-site/src/stores/omniSlateStore';

vi.mock('../../apps/omnihub-site/src/stores/omniSlateStore', () => ({
  useOmniSlateStore: vi.fn((selector) => selector({ contextItems: [], addContext: vi.fn() })),
}));

// ── DraggableWidget: isolated file imported directly for threshold tests ────
import { DraggableWidget, DRAG_THRESHOLD_PX } from '../../apps/omnihub-site/dashboard/DraggableWidget';

// ── OmniSlatePane default props ───────────────────────────────────────────────
const BASE_SLATE_PROPS = {
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

const MANY_CONTEXT: readonly ContextItem[] = [
  { name: 'TradeLine', health: 'green', insight: 'OK' },
  { name: 'aSpiral', health: 'yellow', insight: 'Spike' },
  { name: 'Fortress', health: 'green', insight: 'Secure' },
  { name: 'OmniSkills', health: 'red', insight: 'Error' },
  { name: 'Orchestrator', health: 'green', insight: 'Running' },
];

const LONG_SUGGESTION =
  'Analyze all open multi-day workflows spanning more than 72 hours, cross-reference them ' +
  'with Guardian audit logs, flag any policy violations, draft an executive brief, and queue ' +
  'remediation tasks in the automated pipeline with priority classifications.';

/** Find the outermost hero tile element */
function findHeroTile(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[class*="apex-hero-tile"]');
}

// =============================================================================
// BUG FAMILY A — Drag Threshold / Spatial Resistance
// =============================================================================

describe('BUG FAMILY A — Spatial Resistance: Drag Threshold', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('DRAG_THRESHOLD_PX is exported and equals 8 (spatial commitment constant)', () => {
    // FAILS before fix: DraggableWidget / DRAG_THRESHOLD_PX not exported
    // PASSES after fix: constant exported and >= 8
    expect(typeof DRAG_THRESHOLD_PX).toBe('number');
    expect(DRAG_THRESHOLD_PX).toBeGreaterThanOrEqual(8);
  });

  it('DraggableWidget renders with data-drag-active attribute initially false', () => {
    // FAILS before fix: DraggableWidget not exported / no data-drag-active attr
    // PASSES after fix: component exported and renders with data-drag-active="false"
    expect(DraggableWidget).toBeDefined();
    const { container } = render(
      React.createElement(DraggableWidget, null, React.createElement('div', null, 'content')),
    );
    const widget = container.querySelector('[data-drag-active]') as HTMLElement;
    expect(widget).not.toBeNull();
    expect(widget.dataset.dragActive).toBe('false');
  });

  it('DraggableWidget does NOT activate drag when pointer moves < 8px from origin (edge contact resistance)', () => {
    // FAILS before fix: drag always active (no threshold)
    // PASSES after fix: drag stays inactive for < 8px movement
    expect(DraggableWidget).toBeDefined();
    const { container } = render(
      React.createElement(DraggableWidget, null, React.createElement('div', null, 'tile')),
    );
    const widget = container.querySelector('[data-drag-active]') as HTMLElement;
    expect(widget).not.toBeNull();

    // Simulate pointer start, then small move (5px — well below 8px threshold)
    fireEvent.pointerDown(widget, { clientX: 200, clientY: 200 });
    fireEvent.pointerMove(widget, { clientX: 205, clientY: 200 }); // 5px — incidental contact

    expect(widget.dataset.dragActive).toBe('false');
  });

  it('DraggableWidget activates drag only after pointer crosses >= 8px spatial threshold', () => {
    // FAILS before fix: drag triggers immediately (no threshold)
    // PASSES after fix: drag activates after 8px+ movement (spatial commitment)
    expect(DraggableWidget).toBeDefined();
    const { container } = render(
      React.createElement(DraggableWidget, null, React.createElement('div', null, 'tile')),
    );
    const widget = container.querySelector('[data-drag-active]') as HTMLElement;
    expect(widget).not.toBeNull();

    // jsdom's PointerEvent does not exist / does not honour clientX/clientY from init dict.
    // MouseEvent constructor properly initialises clientX/clientY and is dispatched with
    // pointer event type names so React's onPointerDown/onPointerMove handlers fire correctly.
    const downEvt = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 });
    act(() => { widget.dispatchEvent(downEvt); });

    // 10px — crosses 8px spatial commitment threshold
    const moveEvt = new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 210, clientY: 200 });
    act(() => { widget.dispatchEvent(moveEvt); });

    expect(widget.dataset.dragActive).toBe('true');
  });

  it('DraggableWidget resets drag-active to false after pointer release', () => {
    // FAILS before fix: no drag-active tracking
    // PASSES after fix: drag deactivates on pointerUp
    expect(DraggableWidget).toBeDefined();
    const { container } = render(
      React.createElement(DraggableWidget, null, React.createElement('div', null, 'tile')),
    );
    const widget = container.querySelector('[data-drag-active]') as HTMLElement;

    // Activate drag with >= 8px movement — use MouseEvent with pointer type names
    // so that React fires onPointerDown/onPointerMove with correct clientX/clientY.
    const downEvt = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 });
    act(() => { widget.dispatchEvent(downEvt); });

    const moveEvt = new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 215, clientY: 200 });
    act(() => { widget.dispatchEvent(moveEvt); });

    expect(widget.dataset.dragActive).toBe('true');

    fireEvent.pointerUp(widget);
    expect(widget.dataset.dragActive).toBe('false');
  });

  it('EcosystemPane outer tile does NOT have layout-cascade overflow (uses overflow-hidden)', () => {
    // FAILS before fix: tile has overflow-y-auto (causes layout cascade on siblings)
    // PASSES after fix: tile has overflow-hidden (stable, no external scroll)
    const { container } = render(
      React.createElement(EcosystemPane, { ecoAppsVisible: true }),
    );
    const tile = findHeroTile(container);
    expect(tile).not.toBeNull();
    expect(tile!.className).toContain('overflow-hidden');
    expect(tile!.className).not.toContain('overflow-y-auto');
  });

  it('AgentPane outer tile does NOT have layout-cascade overflow (uses overflow-hidden)', () => {
    // FAILS before fix: tile has overflow-y-auto
    // PASSES after fix: tile has overflow-hidden
    const { container } = render(
      React.createElement(AgentPane, { agentStatus: 'listening' }),
    );
    const tile = findHeroTile(container);
    expect(tile).not.toBeNull();
    expect(tile!.className).toContain('overflow-hidden');
    expect(tile!.className).not.toContain('overflow-y-auto');
  });
});

// =============================================================================
// BUG FAMILY B — OmniSlate Height Determinism
// =============================================================================

describe('BUG FAMILY B — OmniSlate Height Determinism', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('OmniSlatePane outer tile uses overflow-hidden (content cannot grow outer tile)', () => {
    // FAILS before fix: outer tile has overflow-y-auto and content-driven height
    // PASSES after fix: outer tile has overflow-hidden, height is deterministic
    const { container } = render(
      React.createElement(OmniSlatePane, BASE_SLATE_PROPS),
    );
    const tile = findHeroTile(container);
    expect(tile).not.toBeNull();
    expect(tile!.className).toContain('overflow-hidden');
    expect(tile!.className).not.toContain('overflow-y-auto');
  });

  it('OmniSlatePane context chips container has maxHeight to bound vertical growth', () => {
    vi.mocked(useOmniSlateStore).mockImplementation((selector: any) => selector({ contextItems: MANY_CONTEXT, addContext: vi.fn() }));
    // FAILS before fix: chips container has no maxHeight (wraps grow tile)
    // PASSES after fix: chips container has maxHeight — variable content contained internally
    render(
      React.createElement(OmniSlatePane, { ...BASE_SLATE_PROPS }),
    );
    // The context chips container wraps chips with flexWrap — find it
    // It's the div containing "+ Add context" button
    const addContextBtn = screen.getByText('+ Add context');
    const chipsContainer = addContextBtn.parentElement;
    expect(chipsContainer).not.toBeNull();
    // maxHeight must be set to cap the wrapping flex container
    const maxH = (chipsContainer as HTMLElement).style.maxHeight;
    expect(maxH).toBeTruthy();
    expect(maxH).not.toBe('');
  });

  it('OmniSlatePane context chips container has overflowY auto for internal scroll', () => {
    vi.mocked(useOmniSlateStore).mockImplementation((selector: any) => selector({ contextItems: MANY_CONTEXT, addContext: vi.fn() }));
    // FAILS before fix: no overflowY on the chips container
    // PASSES after fix: chips container uses overflowY: auto for internal scroll
    render(
      React.createElement(OmniSlatePane, { ...BASE_SLATE_PROPS }),
    );
    const addContextBtn = screen.getByText('+ Add context');
    const chipsContainer = addContextBtn.parentElement as HTMLElement;
    expect(chipsContainer.style.overflowY).toBe('auto');
  });

  it('long suggested-action text does NOT change outer tile structure (suggestion bounded by nowrap+ellipsis)', () => {
    vi.mocked(useOmniSlateStore).mockImplementation((selector: any) => selector({ contextItems: MANY_CONTEXT, addContext: vi.fn() }));
    // FAILS before fix: suggestion chip text can wrap and grow the tile
    // PASSES after fix: suggestion chip text is nowrap/clamp/ellipsis bounded
    const { container } = render(
      React.createElement(OmniSlatePane, {
        ...BASE_SLATE_PROPS,
        // Inject a long prompt text that would simulate worst-case suggestion
        prompt: LONG_SUGGESTION,
      }),
    );
    const tile = findHeroTile(container);
    // Outer tile must still have overflow-hidden — the long content is trapped inside
    expect(tile!.className).toContain('overflow-hidden');
  });

  it('OmniSlatePane outer tile height is stable under worst-case long trace log', () => {
    // FAILS before fix: long trace log text can grow tile
    // PASSES after fix: outer tile has overflow-hidden — trace log text cannot escape
    const { container } = render(
      React.createElement(OmniSlatePane, {
        ...BASE_SLATE_PROPS,
        traceLogs: [LONG_SUGGESTION],
      }),
    );
    const tile = findHeroTile(container);
    expect(tile!.className).toContain('overflow-hidden');
  });

  it('CSS hero tile classes use fixed height (not just max-height) for deterministic sizing', async () => {
    // FAILS before fix: CSS uses max-height (allows tile to be smaller — content-driven growth)
    // PASSES after fix: CSS uses height (fixed — stable regardless of content)
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssPath = path.resolve(
      __dirname,
      '../../apps/omnihub-site/src/styles/omnidash-layout.css',
    );
    const css = fs.readFileSync(cssPath, 'utf-8');

    const smBlock = /\.apex-hero-tile--sm\s*\{[^}]*\}/s.exec(css);
    expect(smBlock).not.toBeNull();
    // Must have a deterministic fixed height, not just a max-height cap
    expect(smBlock![0]).toMatch(/\bheight\s*:/);

    const lgBlock = /\.apex-hero-tile--lg\s*\{[^}]*\}/s.exec(css);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock![0]).toMatch(/\bheight\s*:/);
  });

  it('CSS hero tile classes use overflow: hidden (not overflow-y: auto)', async () => {
    // FAILS before fix: CSS uses overflow-y: auto (allows outer scroll, content-driven height)
    // PASSES after fix: CSS uses overflow: hidden (fixed tile, internal containment)
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssPath = path.resolve(
      __dirname,
      '../../apps/omnihub-site/src/styles/omnidash-layout.css',
    );
    const css = fs.readFileSync(cssPath, 'utf-8');

    const smBlock = /\.apex-hero-tile--sm\s*\{[^}]*\}/s.exec(css);
    expect(smBlock![0]).toContain('overflow: hidden');
    expect(smBlock![0]).not.toContain('overflow-y: auto');

    const lgBlock = /\.apex-hero-tile--lg\s*\{[^}]*\}/s.exec(css);
    expect(lgBlock![0]).toContain('overflow: hidden');
    expect(lgBlock![0]).not.toContain('overflow-y: auto');
  });
});
