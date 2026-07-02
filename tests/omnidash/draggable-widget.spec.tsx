import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, createEvent } from '@testing-library/react';

import { DraggableWidget } from '../../apps/omnihub-site/dashboard/DraggableWidget';
import { DRAG_THRESHOLD_PX } from '../../apps/omnihub-site/dashboard/lib/widgetLayout';
import { LayoutContext } from '../../apps/omnihub-site/dashboard/contexts/LayoutContext';
import type { LayoutContextValue } from '../../apps/omnihub-site/dashboard/contexts/LayoutContext';

const noop = () => {};
function makeLayoutCtx(userId?: string): LayoutContextValue {
  return {
    hiddenWidgets: [],
    panelLayout: 'standard',
    toggleWidget: noop,
    setPanelLayout: noop,
    resetWidgetPositions: noop,
    userId,
  };
}

// jsdom omits PointerEvent; React 18 feature-detects it to register pointermove listeners.
if (typeof (globalThis as Record<string, unknown>).PointerEvent === 'undefined') {
  (globalThis as Record<string, unknown>).PointerEvent = MouseEvent;
}

describe('DraggableWidget', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('exports DRAG_THRESHOLD_PX = 8', () => {
    expect(DRAG_THRESHOLD_PX).toBe(8);
  });

  it('renders children', () => {
    render(
      <DraggableWidget>
        <span>content</span>
      </DraggableWidget>,
    );
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('renders with an id and data-testid', () => {
    render(
      <DraggableWidget id="widget_test">
        <span>test</span>
      </DraggableWidget>,
    );
    expect(screen.getByTestId('widget_test')).toBeTruthy();
  });

  it('starts in idle drag mode', () => {
    render(
      <DraggableWidget id="widget_idle">
        <span>idle</span>
      </DraggableWidget>,
    );
    expect(screen.getByTestId('widget_idle')).toHaveAttribute('data-drag-mode', 'idle');
  });

  it('shows DRAG badge after 500ms long press', () => {
    render(
      <DraggableWidget id="widget_lp">
        <span>longpress</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_lp');
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText('DRAG')).toBeTruthy();
    expect(el).toHaveAttribute('data-drag-mode', 'ready');
  });

  it('starts desktop mouse drag readiness in the same pointer gesture', () => {
    render(
      <DraggableWidget id="widget_mouse">
        <span>mouse</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_mouse');
    const pointerDown = createEvent.pointerDown(el, { clientX: 10, clientY: 10 });
    Object.defineProperty(pointerDown, 'pointerType', { value: 'mouse' });
    act(() => {
      fireEvent(el, pointerDown);
    });
    expect(screen.getByText('DRAG')).toBeTruthy();
    expect(el).toHaveAttribute('data-drag-mode', 'ready');
  });

  it('cancels long press when pointer moves > DRAG_THRESHOLD_PX', () => {
    render(
      <DraggableWidget id="widget_move">
        <span>move</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_move');
    fireEvent.pointerDown(el, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el, { clientX: 20, clientY: 0 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(el).toHaveAttribute('data-drag-mode', 'idle');
  });

  it('stays idle when pointer up before 500ms', () => {
    render(
      <DraggableWidget id="widget_up">
        <span>up</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_up');
    fireEvent.pointerDown(el, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerUp(el);
    act(() => { vi.advanceTimersByTime(600); });
    expect(el).toHaveAttribute('data-drag-mode', 'idle');
  });

  it('escape key cancels ready state', () => {
    render(
      <DraggableWidget id="widget_esc">
        <span>esc</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_esc');
    fireEvent.pointerDown(el, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(el).toHaveAttribute('data-drag-mode', 'ready');
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(el).toHaveAttribute('data-drag-mode', 'idle');
  });

  it('click outside cancels ready state', () => {
    render(
      <div>
        <DraggableWidget id="widget_outside">
          <span>outside</span>
        </DraggableWidget>
        <button data-testid="outside-btn">Outside</button>
      </div>,
    );
    const el = screen.getByTestId('widget_outside');
    fireEvent.pointerDown(el, { clientX: 0, clientY: 0 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(el).toHaveAttribute('data-drag-mode', 'ready');
    act(() => {
      fireEvent.pointerDown(screen.getByTestId('outside-btn'));
    });
    expect(el).toHaveAttribute('data-drag-mode', 'idle');
  });

  it('restores position from localStorage on mount (new key format)', () => {
    localStorage.setItem(
      'omnidash_layout_v2:user1:desktop',
      JSON.stringify({ widget_saved: { x: 100, y: 200 } }),
    );
    render(
      <LayoutContext.Provider value={makeLayoutCtx('user1')}>
        <DraggableWidget id="widget_saved">
          <span>saved</span>
        </DraggableWidget>
      </LayoutContext.Provider>,
    );
    const el = screen.getByTestId('widget_saved');
    expect(el).toBeTruthy();
    expect(el.style.transform).toContain('100');
  });

  it('renders without id (no registry/storage ops)', () => {
    render(
      <DraggableWidget>
        <span>no-id</span>
      </DraggableWidget>,
    );
    expect(screen.getByText('no-id')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const { container } = render(
      <DraggableWidget style={{ color: 'red' }}>
        <span>styled</span>
      </DraggableWidget>,
    );
    const div = container.firstChild as HTMLElement;
    expect(div).toBeTruthy();
  });

  it('does not show DRAG badge in idle state', () => {
    render(
      <DraggableWidget id="widget_nobadge">
        <span>nobadge</span>
      </DraggableWidget>,
    );
    expect(screen.queryByText('DRAG')).toBeNull();
  });

  it('unregisters widget on unmount', () => {
    const { unmount } = render(
      <DraggableWidget id="widget_unmount">
        <span>unmount</span>
      </DraggableWidget>,
    );
    unmount();
    expect(screen.queryByTestId('widget_unmount')).toBeNull();
  });

  it('pointer down + small move does not cancel long press timer', () => {
    render(
      <DraggableWidget id="widget_small_move">
        <span>small move</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_small_move');
    fireEvent.pointerDown(el, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el, { clientX: 3, clientY: 3 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(el).toHaveAttribute('data-drag-mode', 'ready');
  });

  it('handlePointerMove returns early when no prior pointer down', () => {
    render(
      <DraggableWidget id="widget_earlyret">
        <span>early return</span>
      </DraggableWidget>,
    );
    const el = screen.getByTestId('widget_earlyret');
    fireEvent.pointerMove(el, { clientX: 20, clientY: 20 });
    expect(el).toHaveAttribute('data-drag-mode', 'idle');
  });

  it('dispatches omnislate-drop when drop point is inside slate', () => {
    const slate = document.createElement('div');
    slate.id = 'widget_slate';
    Object.defineProperty(slate, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 500, bottom: 500, width: 500, height: 500 }),
      configurable: true,
    });
    document.body.appendChild(slate);

    render(
      <DraggableWidget id="widget_slatedrop">
        <span>slate drop</span>
      </DraggableWidget>,
    );

    const el = screen.getByTestId('widget_slatedrop');
    const dropHandler = vi.fn();
    window.addEventListener('omnislate-drop', dropHandler);

    // Simulate long press + drag initiation + drop
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    // Move past threshold to initiate drag
    fireEvent.pointerMove(el, { clientX: 30, clientY: 30, pointerId: 1 });
    // Drop inside slate
    fireEvent.pointerUp(el, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(dropHandler).toHaveBeenCalled();

    window.removeEventListener('omnislate-drop', dropHandler);
    document.body.removeChild(slate);
  });

  it('does not dispatch omnislate-drop when drop point is outside slate', () => {
    const slate = document.createElement('div');
    slate.id = 'widget_slate';
    Object.defineProperty(slate, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 }),
      configurable: true,
    });
    document.body.appendChild(slate);

    render(
      <DraggableWidget id="widget_outsidedrop">
        <span>outside drop</span>
      </DraggableWidget>,
    );

    const el = screen.getByTestId('widget_outsidedrop');
    const dropHandler = vi.fn();
    window.addEventListener('omnislate-drop', dropHandler);

    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.pointerMove(el, { clientX: 30, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 200, clientY: 200, pointerId: 1 });

    expect(dropHandler).not.toHaveBeenCalled();

    window.removeEventListener('omnislate-drop', dropHandler);
    document.body.removeChild(slate);
  });

  it('clamps a dropped widget back within the canvas bounds', () => {
    const canvas = document.createElement('div');
    canvas.className = 'omni-canvas-container';
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 }),
      configurable: true,
    });
    Object.defineProperty(canvas, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 200, configurable: true });
    document.body.appendChild(canvas);

    render(
      <DraggableWidget id="widget_offscreen">
        <span>offscreen</span>
      </DraggableWidget>,
      { container: canvas },
    );

    const el = screen.getByTestId('widget_offscreen');
    // Simulate the widget resolving to a position 500px off-canvas
    // (top-left), as collision-avoidance's outward snap search can produce.
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: -500, top: -500, right: -450, bottom: -450, width: 50, height: 50 }),
      configurable: true,
    });

    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.pointerMove(el, { clientX: 30, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 30, clientY: 30, pointerId: 1 });

    // No saved position (posRef starts at 0,0); myRect.left/top = -500 means
    // the widget is 500px off-canvas, so the clamp must add a +500px delta
    // per axis to pull it back to the canvas origin.
    expect(el.style.transform).toContain('translate3d(500px, 500px, 0)');

    document.body.removeChild(canvas);
  });

  it('does not alter position when the widget is already within canvas bounds', () => {
    const canvas = document.createElement('div');
    canvas.className = 'omni-canvas-container';
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
      configurable: true,
    });
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(canvas);

    render(
      <DraggableWidget id="widget_inbounds">
        <span>inbounds</span>
      </DraggableWidget>,
      { container: canvas },
    );

    const el = screen.getByTestId('widget_inbounds');
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 100, right: 150, bottom: 150, width: 50, height: 50 }),
      configurable: true,
    });

    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.pointerMove(el, { clientX: 30, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 30, clientY: 30, pointerId: 1 });

    // Already well within the 800x600 canvas — clamping must be a no-op.
    expect(el.style.transform).toContain('translate3d(0px, 0px, 0)');

    document.body.removeChild(canvas);
  });
});
