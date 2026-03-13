/**
 * FloatingWindow — PiP Manager (Layer 5)
 * @version 1.0.0
 * @module apps/omnihub-site/src/components/omnidash/FloatingWindow
 *
 * Always-on-top floating windows for picture-in-picture content.
 * Rendered outside the canvas transform layer so they remain
 * screen-relative regardless of pan/zoom state.
 *
 * Uses z-index Z_FLOATING (15000) — above all widgets, below modals.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import {
  memo,
  useCallback,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { motion } from 'framer-motion';
import { X, PictureInPicture2 } from 'lucide-react';
import { useOmniDash, Z_FLOATING, type FloatingWindowConfig } from '@/stores/omniDashStore';
import { GPU_STYLE, SPRING_DAMPED } from '@/lib/motionPresets';

// ============================================================================
// Component
// ============================================================================

interface FloatingWindowProps {
  readonly config: FloatingWindowConfig;
}

export const FloatingWindow = memo(function FloatingWindow({ config }: FloatingWindowProps) {
  const { closeFloating, moveFloating } = useOmniDash();
  const dragStart = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClose = useCallback(() => {
    closeFloating(config.id);
  }, [closeFloating, config.id]);

  // ── Drag via pointer events ──
  const handleDragStart = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        wx: config.position.x,
        wy: config.position.y,
      };
      setIsDragging(true);
    },
    [config.position],
  );

  const handleDragMove = useCallback(
    (e: PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      moveFloating(config.id, {
        x: dragStart.current.wx + dx,
        y: dragStart.current.wy + dy,
      });
    },
    [moveFloating, config.id],
  );

  const handleDragEnd = useCallback(
    (e: PointerEvent) => {
      if (!dragStart.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragStart.current = null;
      setIsDragging(false);
    },
    [],
  );

  return (
    <motion.div
      className={`floating-window${isDragging ? ' is-dragging' : ''}`}
      style={{
        ...GPU_STYLE,
        position: 'fixed',
        top: config.position.y,
        left: config.position.x,
        width: config.size.width,
        height: config.size.height,
        zIndex: Z_FLOATING,
      }}
      initial={{ opacity: 0, scale: 0.8, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 40 }}
      transition={SPRING_DAMPED}
    >
      {/* ── Title Bar ── */}
      <div
        className="floating-titlebar"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        <div className="floating-titlebar-left">
          <PictureInPicture2 size={11} style={{ color: 'var(--od-accent)', opacity: 0.8 }} />
          <span className="floating-title">{config.title}</span>
        </div>
        <button
          type="button"
          className="widget-btn widget-btn-close"
          onClick={handleClose}
          title="Close PiP"
        >
          <X size={11} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="floating-content">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--od-text-tertiary)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          {config.component}
        </div>
      </div>
    </motion.div>
  );
});
