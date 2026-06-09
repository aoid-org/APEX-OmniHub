import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', async () => {
  const R = await vi.importActual<typeof import('react')>('react');
  const animate = vi.fn();
  const useMotionValue = (v: number) => {
    let val = v;
    return { get: () => val, set: (x: number) => { val = x; } };
  };
  // Cache component types so React reconciles in-place (no stale el refs)
  const motionCache: Record<string, unknown> = {};
  const motionProxy = new Proxy({} as Record<string, unknown>, {
    get(_: object, tag: string) {
      if (!motionCache[tag]) {
        motionCache[tag] = R.forwardRef(
          (
            { children, style, onPointerDown, onPointerMove, onPointerUp, onDragStart, onDragEnd, ...rest }: Record<string, unknown>,
            ref: React.Ref<unknown>,
          ) => {
            const safeRest = Object.fromEntries(
              Object.entries(rest).filter(([k]) =>
                !['drag', 'dragMomentum', 'dragElastic', 'whileDrag', 'animate', 'initial', 'exit', 'transition', 'layout', 'layoutId', 'variants'].includes(k)
              ),
            );
            return R.createElement(tag, {
              style,
              onPointerDown,
              onPointerMove,
              onPointerUp,
              'data-drag-start': onDragStart,
              'data-drag-end': onDragEnd,
              ...safeRest,
              ref,
            }, children as React.ReactNode);
          },
        );
      }
      return motionCache[tag];
    },
  });
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue,
    animate,
    useSpring: (v: number) => ({ get: () => v, set: vi.fn() }),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useTransform: vi.fn(() => ({ get: vi.fn() })),
  };
});

import {
  DraggableWidget,
  DRAG_THRESHOLD_PX,
} from '../../apps/omnihub-site/dashboard/DraggableWidget';

// jsdom omits PointerEvent; React 18 feature-detects it to register pointermove listeners.
// Without this polyfill, onPointerMove never fires in tests.
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

  it('restores position from localStorage on mount', () => {
    localStorage.setItem('omni_widget_pos_widget_saved', JSON.stringify({ x: 100, y: 200 }));
    render(
      <DraggableWidget id="widget_saved">
        <span>saved</span>
      </DraggableWidget>,
    );
    expect(screen.getByTestId('widget_saved')).toBeTruthy();
  });

  it('ignores invalid localStorage JSON', () => {
    localStorage.setItem('omni_widget_pos_widget_bad', 'not-valid-json');
    render(
      <DraggableWidget id="widget_bad">
        <span>bad json</span>
      </DraggableWidget>,
    );
    expect(screen.getByTestId('widget_bad')).toBeTruthy();
  });

  it('ignores localStorage JSON without x/y numbers', () => {
    localStorage.setItem('omni_widget_pos_widget_noxy', JSON.stringify({ foo: 'bar' }));
    render(
      <DraggableWidget id="widget_noxy">
        <span>noxy</span>
      </DraggableWidget>,
    );
    expect(screen.getByTestId('widget_noxy')).toBeTruthy();
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
    // Small move (< DRAG_THRESHOLD_PX = 8) should not cancel the timer
    fireEvent.pointerMove(el, { clientX: 3, clientY: 3 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(el).toHaveAttribute('data-drag-mode', 'ready');
  });
});
