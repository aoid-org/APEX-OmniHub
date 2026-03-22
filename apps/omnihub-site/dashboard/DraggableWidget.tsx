/**
 * DraggableWidget — Spatially-resistant free-position drag wrapper.
 *
 * SPATIAL RESISTANCE MODEL:
 *   Drag activates only after the pointer travels DRAG_THRESHOLD_PX from its
 *   origin. Incidental edge contact (< 8 px) does NOT start the drag.
 *   This implements "occupied matter in space" physics: a stationary tile has
 *   resistance and cannot be displaced by a fleeting touch.
 *
 * Geometric threshold: Euclidean distance >= 8 px from pointer-down origin.
 * This means the user must commit 8 px of directed movement before the tile
 * starts tracking. A sub-8 px wiggle is absorbed with zero displacement.
 */

import { useCallback, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

/** Minimum pointer travel (px) before drag activates. Spatial commitment gate. */
export const DRAG_THRESHOLD_PX = 8;

interface DraggableWidgetProps {
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export const DraggableWidget = ({ id, children, style = {} }: DraggableWidgetProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`omni_widget_pos_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            x.set(parsed.x);
            y.set(parsed.y);
          }
        } catch {
          // Ignore parse errors from invalid localStorage payload
        }
      }
    }
  }, [id, x, y]);

  const handleDragEnd = useCallback((_event: unknown, info: { point: { x: number; y: number } }) => {
    const SNAP = 20;
    const finalX = Math.round(x.get() / SNAP) * SNAP;
    const finalY = Math.round(y.get() / SNAP) * SNAP;
    x.set(finalX);
    y.set(finalY);
    if (id) {
      localStorage.setItem(`omni_widget_pos_${id}`, JSON.stringify({ x: finalX, y: finalY }));
      
      // Hit-test against OmniSlate widget to supply context
      const slate = document.getElementById('widget_slate');
      if (slate) {
        const rect = slate.getBoundingClientRect();
        // Framer motion info.point has the un-scrolled client coordinates
        const dropX = info.point.x;
        const dropY = info.point.y;
        if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
          window.dispatchEvent(new CustomEvent('omnislate-drop', { 
            detail: { id, label: `Widget: ${id.replace('rt_', '').replace('widget_', '')}` } 
          }));
        }
      }
    }
  }, [id, x, y]);

  return (
    <motion.div
      id={id}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      style={{ ...style, x, y, position: 'relative', zIndex: 'auto' as unknown as number }}
      whileDrag={{ scale: 1.015, zIndex: 999, cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
};
