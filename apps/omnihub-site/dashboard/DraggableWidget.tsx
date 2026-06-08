/**
 * DraggableWidget — Free-position drag with collision-aware snap-lock.
 *
 * LONG-PRESS ACTIVATION MODEL:
 *   Drag activates only after a 500ms long-press. Incidental touch / scroll
 *   (pointer moves > 8px before timer fires) cancels the timer and keeps
 *   the widget non-draggable. This prevents accidental drags during scroll.
 *
 * DRAG MODE STATE MACHINE:
 *   idle → (500ms hold) → ready → (drag start) → dragging → (drag end) → idle
 *   ready → (Escape / click outside / pointer-up before drag) → idle
 *
 * SNAP-LOCK COLLISION AVOIDANCE:
 *   On drag end the widget resolves to the nearest available space that does
 *   not overlap any sibling widget. Search expands outward in square shells
 *   (SNAP-grid steps) until a free slot is found, then animates smoothly.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

/** Minimum pointer travel (px) before drag cancels the long-press timer. */
export const DRAG_THRESHOLD_PX = 8;

/** Long-press duration before drag mode activates (ms). */
const LONG_PRESS_MS = 500;

/** Grid step used for snapping and collision search (px). */
const SNAP = 20;

/** Maximum outward search radius when resolving collisions (px). */
const MAX_SEARCH_RADIUS = 800;

/** Drag mode type — drives framer-motion drag prop and visual feedback. */
type DragMode = 'idle' | 'ready' | 'dragging';

// ─── Widget Registry ─────────────────────────────────────────────────────────
// Module-level map: widgetId → live DOM element.
// Read only on dragEnd — no reactive subscriptions, no re-renders.

const widgetRegistry = new Map<string, HTMLElement>();

function registerWidget(id: string, el: HTMLElement) {
  widgetRegistry.set(id, el);
}

function unregisterWidget(id: string) {
  widgetRegistry.delete(id);
}

// ─── Collision Helpers ────────────────────────────────────────────────────────

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

/**
 * Returns the nearest position (snapped to SNAP grid) where the given
 * proposed rect does not overlap any of the provided sibling rects.
 * Searches square shells outward from the proposed point.
 */
function findFreePosition(
  proposed: { left: number; top: number; width: number; height: number },
  siblings: DOMRect[],
): { left: number; top: number } {
  const hasCollision = (left: number, top: number): boolean => {
    const r = {
      left,
      top,
      right: left + proposed.width,
      bottom: top + proposed.height,
    };
    return siblings.some((s) => rectsOverlap(r, s));
  };

  // Snap proposed position to grid first
  const snapLeft = Math.round(proposed.left / SNAP) * SNAP;
  const snapTop = Math.round(proposed.top / SNAP) * SNAP;

  if (!hasCollision(snapLeft, snapTop)) {
    return { left: snapLeft, top: snapTop };
  }

  // Expand outward in square shells until a free slot is found
  for (let radius = SNAP; radius <= MAX_SEARCH_RADIUS; radius += SNAP) {
    // Top and bottom edges
    for (let dx = -radius; dx <= radius; dx += SNAP) {
      const candidates = [
        { left: snapLeft + dx, top: snapTop - radius },
        { left: snapLeft + dx, top: snapTop + radius },
      ];
      for (const c of candidates) {
        if (c.top >= 0 && !hasCollision(c.left, c.top)) return c;
      }
    }
    // Left and right edges (skip corners already covered above)
    for (let dy = -radius + SNAP; dy < radius; dy += SNAP) {
      const candidates = [
        { left: snapLeft - radius, top: snapTop + dy },
        { left: snapLeft + radius, top: snapTop + dy },
      ];
      for (const c of candidates) {
        if (c.top >= 0 && !hasCollision(c.left, c.top)) return c;
      }
    }
  }

  return { left: snapLeft, top: snapTop };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DraggableWidgetProps {
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export const DraggableWidget = ({ id, children, style = {} }: DraggableWidgetProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const elRef = useRef<HTMLDivElement>(null);

  const [dragMode, setDragMode] = useState<DragMode>('idle');
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore persisted position and register in registry
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (id) {
      registerWidget(id, el);

      const saved = localStorage.getItem(`omni_widget_pos_${id}`);
      if (saved) {
        try {
          const parsed: unknown = JSON.parse(saved);
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            'x' in parsed &&
            'y' in parsed &&
            typeof (parsed as Record<string, unknown>).x === 'number' &&
            typeof (parsed as Record<string, unknown>).y === 'number'
          ) {
            x.set((parsed as { x: number; y: number }).x);
            y.set((parsed as { x: number; y: number }).y);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return () => {
      if (id) unregisterWidget(id);
    };
  }, [id, x, y]);

  // Escape key cancels 'ready' state
  useEffect(() => {
    if (dragMode !== 'ready') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDragMode('idle');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dragMode]);

  // Click outside cancels 'ready' state
  useEffect(() => {
    if (dragMode !== 'ready') return;

    const handlePointerDown = (e: PointerEvent) => {
      const el = elRef.current;
      if (el && !el.contains(e.target as Node)) {
        setDragMode('idle');
      }
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
      if (!pointerOriginRef.current) return;
      const dx = e.clientX - pointerOriginRef.current.x;
      const dy = e.clientY - pointerOriginRef.current.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        // User is scrolling — cancel long-press timer; stay idle
        cancelLongPress();
        pointerOriginRef.current = null;
      }
    },
    [cancelLongPress],
  );

  const handlePointerUp = useCallback(() => {
    cancelLongPress();
    pointerOriginRef.current = null;
    // Only reset to idle if not in dragging state (dragging has its own end handler)
    setDragMode((prev) => (prev === 'dragging' ? prev : 'idle'));
  }, [cancelLongPress]);

  const handleDragStart = useCallback(() => {
    setDragMode('dragging');
  }, []);

  const handleDragEnd = useCallback(
    (_event: unknown, info: { point: { x: number; y: number } }) => {
      setDragMode('idle');
      pointerOriginRef.current = null;

      if (!elRef.current) return;

      // Current visual rect (includes current motion offset)
      const myRect = elRef.current.getBoundingClientRect();

      // Collect all sibling rects (excluding self)
      const siblings: DOMRect[] = [];
      widgetRegistry.forEach((el, regId) => {
        if (regId !== id) siblings.push(el.getBoundingClientRect());
      });

      // Find nearest non-colliding snapped position
      const free = findFreePosition(
        { left: myRect.left, top: myRect.top, width: myRect.width, height: myRect.height },
        siblings,
      );

      // Compute the delta to apply to current motion values
      const deltaX = free.left - myRect.left;
      const deltaY = free.top - myRect.top;
      const finalX = x.get() + deltaX;
      const finalY = y.get() + deltaY;

      // Animate smoothly to resolved position
      animate(x, finalX, { type: 'spring', stiffness: 300, damping: 30 });
      animate(y, finalY, { type: 'spring', stiffness: 300, damping: 30 });

      if (id) {
        localStorage.setItem(
          `omni_widget_pos_${id}`,
          JSON.stringify({ x: finalX, y: finalY }),
        );

        // OmniSlate drop detection
        const slate = document.getElementById('widget_slate');
        if (slate) {
          const rect = slate.getBoundingClientRect();
          const { x: dropX, y: dropY } = info.point;
          if (
            dropX >= rect.left &&
            dropX <= rect.right &&
            dropY >= rect.top &&
            dropY <= rect.bottom
          ) {
            globalThis.window.dispatchEvent(
              new CustomEvent('omnislate-drop', {
                detail: { id, label: `Widget: ${id.replace('rt_', '').replace('widget_', '')}` },
              }),
            );
          }
        }
      }
    },
    [id, x, y],
  );

  // Visual feedback styles for drag mode
  const dragModeStyle: CSSProperties =
    dragMode === 'idle'
      ? {}
      : {
          boxShadow: '0 0 0 2px rgba(249,115,22,0.5)',
          cursor: dragMode === 'dragging' ? 'grabbing' : 'grab',
        };

  return (
    <motion.div
      ref={elRef}
      id={id}
      drag={dragMode !== 'idle'}
      dragMomentum={false}
      dragElastic={0.05}
      style={{
        ...style,
        ...dragModeStyle,
        x,
        y,
        position: 'relative',
        zIndex: 'auto' as unknown as number,
      }}
      whileDrag={{ scale: 1.015, zIndex: 999 }}
      data-testid={id}
      data-drag-mode={dragMode}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      {/* DRAG badge — visible in ready/dragging states */}
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
    </motion.div>
  );
};
