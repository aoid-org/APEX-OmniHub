/**
 * DraggableWidget — Free-position drag with collision-aware snap-lock.
 *
 * Uses native pointer capture (pointerdown/pointermove/pointerup) instead of
 * framer-motion drag. Positions are stored via widgetLayout.ts under a
 * consolidated key scoped by userId and breakpoint.
 *
 * LONG-PRESS ACTIVATION MODEL:
 *   Drag activates only after a 500ms long-press. Incidental touch / scroll
 *   (pointer moves > 8px before timer fires) cancels the timer and keeps
 *   the widget non-draggable. This prevents accidental drags during scroll.
 *
 * DRAG MODE STATE MACHINE:
 *   idle → (500ms hold) → ready → (pointer move) → dragging → (pointer up) → idle
 *   ready → (Escape / click outside / pointer-up before drag) → idle
 *
 * SNAP-LOCK COLLISION AVOIDANCE:
 *   On drag end the widget resolves to the nearest available space that does
 *   not overlap any sibling widget. Search expands outward in square shells
 *   (SNAP-grid steps) until a free slot is found.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useState, useRef, useCallback, useEffect, useContext } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import {
  resolveCollisions,
  resolveAlignment,
  clampToCanvas,
  loadLayout,
  saveLayout,
  detectBreakpoint,
  migrateFromLegacy,
  DRAG_THRESHOLD_PX,
  ALIGN_THRESHOLD_PX,
} from './lib/widgetLayout';
import type { WidgetPositionMap, Rect } from './lib/widgetLayout';
import { LayoutContext } from './contexts/LayoutContext';

/** Long-press duration before drag mode activates (ms). */
const LONG_PRESS_MS = 500;

/** Spring animation duration (ms). */
const SPRING_DURATION_MS = 200;

/**
 * Flick-to-set (mobile/tablet only): after a long-press pick-up, a fast flick
 * release sends the widget's context flying into OmniSlate without needing a
 * precise drop. Tuned so a deliberate flick clears the bar but a slow drag does
 * not. Desktop keeps precise drag-and-drop only.
 */
const FLICK_VELOCITY_PX_PER_MS = 0.5;
const FLICK_MIN_DISTANCE_PX = 24;
const FLICK_FLY_MS = 360;

type DragMode = 'idle' | 'ready' | 'dragging';

// ─── Widget Registry ─────────────────────────────────────────────────────────
const widgetRegistry = new Map<string, HTMLElement>();

function registerWidget(id: string, el: HTMLElement) {
  widgetRegistry.set(id, el);
}

function unregisterWidget(id: string) {
  widgetRegistry.delete(id);
}

// ─── Magnetic Alignment Guide Lines ───────────────────────────────────────────
// Two singleton overlay lines (vertical = x-axis snap, horizontal = y-axis snap)
// lazily parented to the canvas and reused — never created/destroyed per move.
let guideX: HTMLDivElement | null = null;
let guideY: HTMLDivElement | null = null;

function ensureGuides(canvas: HTMLElement): { gx: HTMLDivElement; gy: HTMLDivElement } {
  if (!guideX || guideX.parentElement !== canvas) {
    guideX = document.createElement('div');
    guideX.dataset.omniAlignGuide = 'x';
    guideX.style.cssText =
      'position:absolute;top:0;width:1px;pointer-events:none;background:rgba(249,115,22,0.45);z-index:998;display:none;';
    canvas.appendChild(guideX);
  }
  if (!guideY || guideY.parentElement !== canvas) {
    guideY = document.createElement('div');
    guideY.dataset.omniAlignGuide = 'y';
    guideY.style.cssText =
      'position:absolute;left:0;height:1px;pointer-events:none;background:rgba(249,115,22,0.45);z-index:998;display:none;';
    canvas.appendChild(guideY);
  }
  return { gx: guideX, gy: guideY };
}

function hideGuides(): void {
  if (guideX) guideX.style.display = 'none';
  if (guideY) guideY.style.display = 'none';
}

/**
 * Live, read-only alignment feedback while dragging. Finds the nearest sibling
 * edge/center within ALIGN_THRESHOLD_PX per axis and positions the guide line(s)
 * there; hides the line for any axis with no match. No position mutation here —
 * snapping is applied only at drag-end via resolveAlignment.
 */
function updateAlignmentGuides(canvas: HTMLElement, myRect: DOMRect, siblings: Rect[]): void {
  const { gx, gy } = ensureGuides(canvas);
  const cRect = canvas.getBoundingClientRect();

  const mCenterX = (myRect.left + myRect.right) / 2;
  const mCenterY = (myRect.top + myRect.bottom) / 2;

  let matchX: number | null = null;
  let bestX = ALIGN_THRESHOLD_PX;
  let matchY: number | null = null;
  let bestY = ALIGN_THRESHOLD_PX;

  for (const s of siblings) {
    const sCenterX = (s.left + s.right) / 2;
    const sCenterY = (s.top + s.bottom) / 2;
    for (const from of [myRect.left, myRect.right, mCenterX]) {
      for (const to of [s.left, s.right, sCenterX]) {
        const d = Math.abs(from - to);
        if (d <= bestX) { bestX = d; matchX = to; }
      }
    }
    for (const from of [myRect.top, myRect.bottom, mCenterY]) {
      for (const to of [s.top, s.bottom, sCenterY]) {
        const d = Math.abs(from - to);
        if (d <= bestY) { bestY = d; matchY = to; }
      }
    }
  }

  if (matchX !== null) {
    gx.style.left = `${matchX - cRect.left + canvas.scrollLeft}px`;
    gx.style.top = `${canvas.scrollTop}px`;
    gx.style.height = `${canvas.clientHeight}px`;
    gx.style.display = 'block';
  } else {
    gx.style.display = 'none';
  }

  if (matchY !== null) {
    gy.style.top = `${matchY - cRect.top + canvas.scrollTop}px`;
    gy.style.left = `${canvas.scrollLeft}px`;
    gy.style.width = `${canvas.clientWidth}px`;
    gy.style.display = 'block';
  } else {
    gy.style.display = 'none';
  }
}

// ─── Layout Store ────────────────────────────────────────────────────────────
// Module-level cache so all DraggableWidget instances share positions.
let cachedUserId = '';
let cachedBreakpoint = '';
let cachedPositions: WidgetPositionMap = {};
let migrationDone = false;

function ensureLayoutLoaded(userId: string): WidgetPositionMap {
  const bp = detectBreakpoint();
  if (!migrationDone && userId) {
    migrateFromLegacy(userId, bp);
    migrationDone = true;
  }
  if (userId !== cachedUserId || bp !== cachedBreakpoint) {
    cachedUserId = userId;
    cachedBreakpoint = bp;
    cachedPositions = loadLayout(userId, bp);
  }
  return cachedPositions;
}

function persistPosition(userId: string, widgetId: string, x: number, y: number): void {
  const bp = detectBreakpoint();
  cachedPositions = { ...cachedPositions, [widgetId]: { x, y } };
  if (userId) {
    saveLayout(userId, bp, cachedPositions);
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DraggableWidgetProps {
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export const DraggableWidget = ({ id, children, style = {} }: DraggableWidgetProps) => {
  const layoutCtx = useContext(LayoutContext);
  const userId = layoutCtx?.userId ?? '';
  const elRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [dragMode, setDragMode] = useState<DragMode>('idle');
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Most recent pointer-move sample (position + time) for flick velocity.
  const flickSampleRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // Restore persisted position and register in registry
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (id) {
      registerWidget(id, el);
      const positions = ensureLayoutLoaded(userId);
      const saved = positions[id];
      if (saved) {
        posRef.current = { x: saved.x, y: saved.y };
        el.style.transform = `translate(${saved.x}px, ${saved.y}px)`;
      }
    }

    return () => {
      if (id) unregisterWidget(id);
    };
  }, [id, userId]);

  // Escape key cancels 'ready' state
  useEffect(() => {
    if (dragMode !== 'ready') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDragMode('idle');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dragMode]);

  // Click outside cancels 'ready' state
  useEffect(() => {
    if (dragMode !== 'ready') return;

    const handlePointerDown = (e: PointerEvent) => {
      const el = elRef.current;
      if (el && !el.contains(e.target as Node)) setDragMode('idle');
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [dragMode]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };
    cancelLongPress();

    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setDragMode('ready');
    }, LONG_PRESS_MS);
  }, [cancelLongPress]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Handle active dragging with pointer capture
      if (dragStartPos.current && elRef.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        const newX = dragStartPos.current.offsetX + dx;
        const newY = dragStartPos.current.offsetY + dy;
        posRef.current = { x: newX, y: newY };
        elRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        // Sample for flick velocity (mobile/tablet flick-to-set).
        flickSampleRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };

        // Live magnetic-alignment guide lines (read-only; snapping is applied at
        // drag-end via resolveAlignment). Direct-DOM only — no React state thrash.
        const canvas = elRef.current.closest('.omni-canvas-container');
        if (canvas instanceof HTMLElement && id) {
          const myRect = elRef.current.getBoundingClientRect();
          const sibs: Rect[] = [];
          widgetRegistry.forEach((sibEl, regId) => {
            if (regId !== id) {
              const r = sibEl.getBoundingClientRect();
              sibs.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
            }
          });
          updateAlignmentGuides(canvas, myRect, sibs);
        }
        return;
      }

      // Pre-drag: check if pointer moved too far (cancel long-press)
      if (!pointerOriginRef.current) return;
      const dx = e.clientX - pointerOriginRef.current.x;
      const dy = e.clientY - pointerOriginRef.current.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        cancelLongPress();
        pointerOriginRef.current = null;
      }
    },
    [cancelLongPress, id],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // End active drag
      if (dragStartPos.current && elRef.current) {
        elRef.current.releasePointerCapture?.(e.pointerId);
        dragStartPos.current = null;
        setDragMode('idle');
        pointerOriginRef.current = null;
        hideGuides();

        const el = elRef.current;
        const myRect = el.getBoundingClientRect();

        // Collect sibling rects
        const siblings: { left: number; top: number; right: number; bottom: number }[] = [];
        widgetRegistry.forEach((sibEl, regId) => {
          if (regId !== id) {
            const r = sibEl.getBoundingClientRect();
            siblings.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
          }
        });

        // Magnetic alignment first — snap flush to a near neighbor edge/center
        // (per axis, within threshold). Collision-avoidance still has final say.
        const aligned = resolveAlignment(
          { left: myRect.left, top: myRect.top, width: myRect.width, height: myRect.height },
          siblings,
        );

        // Resolve collisions
        const free = resolveCollisions(
          { left: aligned.left, top: aligned.top, width: myRect.width, height: myRect.height },
          siblings,
        );

        // Clamp to the visible canvas area last — collision resolution can
        // walk a widget's snap search outward past the container edge, which
        // `overflow:auto` cannot recover from in the negative direction (no
        // negative scroll), silently making the widget unreachable.
        let resolvedLeft = free.left;
        let resolvedTop = free.top;
        const canvasEl = el.closest('.omni-canvas-container');
        if (canvasEl instanceof HTMLElement) {
          const cRect = canvasEl.getBoundingClientRect();
          const canvasRelative = {
            x: free.left - cRect.left + canvasEl.scrollLeft,
            y: free.top - cRect.top + canvasEl.scrollTop,
          };
          const clamped = clampToCanvas(
            canvasRelative,
            myRect.width,
            myRect.height,
            canvasEl.clientWidth,
            canvasEl.clientHeight,
          );
          resolvedLeft = free.left + (clamped.x - canvasRelative.x);
          resolvedTop = free.top + (clamped.y - canvasRelative.y);
        }

        const deltaX = resolvedLeft - myRect.left;
        const deltaY = resolvedTop - myRect.top;
        const finalX = posRef.current.x + deltaX;
        const finalY = posRef.current.y + deltaY;

        // Animate to resolved position
        posRef.current = { x: finalX, y: finalY };
        el.style.transition = `transform ${SPRING_DURATION_MS}ms cubic-bezier(0.25,0.1,0.25,1)`;
        el.style.transform = `translate(${finalX}px, ${finalY}px)`;
        setTimeout(() => { el.style.transition = ''; }, SPRING_DURATION_MS);

        if (id) {
          persistPosition(userId, id, finalX, finalY);

          const slate = document.getElementById('widget_slate');
          if (slate) {
            const rect = slate.getBoundingClientRect();
            const droppedOnSlate =
              e.clientX >= rect.left && e.clientX <= rect.right &&
              e.clientY >= rect.top && e.clientY <= rect.bottom;

            // Flick-to-set (mobile/tablet only): a fast flick release sends the
            // widget's context flying into OmniSlate without a precise drop.
            let isFlick = false;
            if (detectBreakpoint() !== 'desktop' && flickSampleRef.current) {
              const dt = performance.now() - flickSampleRef.current.t;
              const dist = Math.hypot(e.clientX - flickSampleRef.current.x, e.clientY - flickSampleRef.current.y);
              isFlick = dt > 0 && dist >= FLICK_MIN_DISTANCE_PX && dist / dt >= FLICK_VELOCITY_PX_PER_MS;
            }

            if (droppedOnSlate || isFlick) {
              globalThis.window.dispatchEvent(
                new CustomEvent('omnislate-drop', {
                  detail: { id, label: `Widget: ${id.replace('rt_', '').replace('widget_', '')}` },
                }),
              );
              if (isFlick) {
                // "Fly" the widget toward OmniSlate, then settle back in place —
                // the widget persists; only its context is sent.
                const elRect = el.getBoundingClientRect();
                const toX = finalX + (rect.left + rect.width / 2) - (elRect.left + elRect.width / 2);
                const toY = finalY + (rect.top + rect.height / 2) - (elRect.top + elRect.height / 2);
                el.style.transition = `transform ${FLICK_FLY_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${FLICK_FLY_MS}ms`;
                el.style.transform = `translate(${toX}px, ${toY}px) scale(0.25)`;
                el.style.opacity = '0.35';
                setTimeout(() => {
                  el.style.transition = 'transform 240ms ease, opacity 240ms ease';
                  el.style.transform = `translate(${finalX}px, ${finalY}px) scale(1)`;
                  el.style.opacity = '1';
                  setTimeout(() => { el.style.transition = ''; }, 240);
                }, FLICK_FLY_MS);
                el.style.zIndex = '';
                flickSampleRef.current = null;
                return;
              }
            }
          }
        }

        flickSampleRef.current = null;
        // Reset scale
        el.style.transform = `translate(${finalX}px, ${finalY}px) scale(1)`;
        el.style.zIndex = '';
        return;
      }

      cancelLongPress();
      pointerOriginRef.current = null;
      setDragMode((prev) => (prev === 'dragging' ? prev : 'idle'));
    },
    [cancelLongPress, id, userId],
  );

  // Start drag when in ready state and pointer moves
  const handleDragInitiate = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragMode !== 'ready') return;

      const el = elRef.current;
      if (!el) return;

      el.setPointerCapture?.(e.pointerId);
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: posRef.current.x,
        offsetY: posRef.current.y,
      };
      setDragMode('dragging');

      // Visual: lift widget
      el.style.zIndex = '999';
      el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px) scale(1.015)`;
    },
    [dragMode],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragMode === 'ready' && pointerOriginRef.current) {
        const dx = e.clientX - pointerOriginRef.current.x;
        const dy = e.clientY - pointerOriginRef.current.y;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          handleDragInitiate(e);
          return;
        }
      }
      handlePointerMove(e);
    },
    [dragMode, handlePointerMove, handleDragInitiate],
  );

  const dragModeStyle: CSSProperties =
    dragMode === 'idle'
      ? {}
      : {
          boxShadow: '0 0 0 2px rgba(249,115,22,0.5)',
          cursor: dragMode === 'dragging' ? 'grabbing' : 'grab',
        };

  return (
    <div
      ref={elRef}
      id={id}
      style={{
        ...style,
        ...dragModeStyle,
        position: 'relative',
        touchAction: dragMode !== 'idle' ? 'none' : undefined,
      }}
      data-testid={id}
      data-drag-mode={dragMode}
      onPointerDown={handlePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
      {dragMode !== 'idle' && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 1000,
            background: 'rgba(249,115,22,0.9)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.08em',
            padding: '2px 5px',
            borderRadius: 4,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          DRAG
        </div>
      )}
    </div>
  );
};
