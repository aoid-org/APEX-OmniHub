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

import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

/** Minimum pointer travel (px) before drag activates. Spatial commitment gate. */
export const DRAG_THRESHOLD_PX = 8;

interface DraggableWidgetProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const DraggableWidget = ({ children, style = {} }: DraggableWidgetProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [dragActive, setDragActive] = useState(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: { clientX: number; clientY: number }) => {
    originRef.current = { x: e.clientX, y: e.clientY };
    setDragActive(false);
  }, []);

  const handlePointerMove = useCallback((e: { clientX: number; clientY: number }) => {
    if (!originRef.current || dragActive) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    // Euclidean distance: requires geometric commitment, not mere edge contact.
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      setDragActive(true);
    }
  }, [dragActive]);

  const handlePointerUp = useCallback(() => {
    originRef.current = null;
    setDragActive(false);
  }, []);

  return (
    <motion.div
      drag={dragActive}
      dragMomentum={false}
      dragElastic={0.05}
      style={{ ...style, x, y, position: 'relative', zIndex: 'auto' as unknown as number }}
      whileDrag={{ scale: 1.015, zIndex: 999, cursor: 'grabbing' }}
      data-drag-active={dragActive}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </motion.div>
  );
};
