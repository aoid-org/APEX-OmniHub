/**
 * DraggableWidget — Free-position drag with collision-aware snap-lock.
 *
 * SPATIAL RESISTANCE MODEL:
 *   Drag activates only after the pointer travels DRAG_THRESHOLD_PX from its
 *   origin. Incidental edge contact (< 8 px) does NOT start the drag.
 *
 * SNAP-LOCK COLLISION AVOIDANCE:
 *   On drag end the widget resolves to the nearest available space that does
 *   not overlap any sibling widget. Search expands outward in square shells
 *   (SNAP-grid steps) until a free slot is found, then animates smoothly.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

/** Minimum pointer travel (px) before drag activates. */
export const DRAG_THRESHOLD_PX = 8;

/** Grid step used for snapping and collision search (px). */
const SNAP = 20;

/** Maximum outward search radius when resolving collisions (px). */
const MAX_SEARCH_RADIUS = 800;

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

  const [testDragActive, setTestDragActive] = useState(false);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);

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

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };
    setTestDragActive(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerOriginRef.current || testDragActive) return;
      const dx = e.clientX - pointerOriginRef.current.x;
      const dy = e.clientY - pointerOriginRef.current.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        setTestDragActive(true);
      }
    },
    [testDragActive],
  );

  const handlePointerUp = useCallback(() => {
    pointerOriginRef.current = null;
    setTestDragActive(false);
  }, []);

  const handleDragEnd = useCallback(
    (_event: unknown, info: { point: { x: number; y: number } }) => {
      setTestDragActive(false);
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

  return (
    <motion.div
      ref={elRef}
      id={id}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      style={{ ...style, x, y, position: 'relative', zIndex: 'auto' as unknown as number }}
      whileDrag={{ scale: 1.015, zIndex: 999, cursor: 'grabbing' }}
      data-testid={id}
      data-drag-active={testDragActive}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
};
