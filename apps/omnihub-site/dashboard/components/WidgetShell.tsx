/**
 * WidgetShell — Widget Exoskeleton (Layer 3)
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/components/WidgetShell
 *
 * The draggable, resizable container for every widget on the OmniCanvas.
 * Provides: title bar, drag handle, resize handles, minimize/maximize/close,
 * focus-on-click (z-index promotion), and GPU-composited transforms.
 *
 * Uses native pointer events for drag — deeply integrated with APEX's
 * zustand store pattern (high switching cost per IP Moat Layer 3).
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
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Maximize2, Minimize2, X, GripHorizontal } from 'lucide-react';
import { useOmniDash, type WidgetConfig } from '@/stores/omniDashStore';
import { useOmniModal } from '@/stores/omniModalStore';
import { GPU_STYLE, SPRING_NATURAL } from '@/lib/motionPresets';

// ============================================================================
// Component
// ============================================================================

interface WidgetShellProps {
  readonly widget: WidgetConfig;
}

export const WidgetShell = memo(function WidgetShell({ widget }: WidgetShellProps) {
  const {
    moveWidget,
    resizeWidget,
    focusWidget,
    minimiseWidget,
    maximiseWidget,
    restoreWidget,
    closeWidget,
  } = useOmniDash();

  const { invoke } = useOmniModal();

  const shellRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Focus on any interaction ──
  const handleFocus = useCallback(() => {
    focusWidget(widget.id);
  }, [focusWidget, widget.id]);

  // ── Drag via pointer events ──
  const handleDragStart = useCallback(
    (e: PointerEvent) => {
      if (widget.maximised) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        wx: widget.position.x,
        wy: widget.position.y,
      };
      setIsDragging(true);
      focusWidget(widget.id);

      // Start long press timer
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        dragStart.current = null;
        
        // Trigger Widget Lifecycle Modal
        invoke({
          id: `lifecycle-${widget.id}`,
          provider: 'OmniDash',
          type: 'selection',
          title: `Widget: ${widget.title}`,
          description: 'Manage this widget',
          renderMode: 'dialog',
          onComplete: async (data) => {
            if (data.action === 'close') closeWidget(widget.id);
            if (data.action === 'maximise') maximiseWidget(widget.id);
          },
        });
      }, 600); // 600ms long press threshold
    },
    [focusWidget, widget.id, widget.position, widget.maximised, widget.title, clearLongPress, invoke, closeWidget, maximiseWidget],
  );

  const handleDragMove = useCallback(
    (e: PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      // If moved more than 5px, cancel long press
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        clearLongPress();
      }

      moveWidget(widget.id, {
        x: dragStart.current.wx + dx,
        y: dragStart.current.wy + dy,
      });
    },
    [moveWidget, widget.id, clearLongPress],
  );

  const handleDragEnd = useCallback(
    (e: PointerEvent) => {
      clearLongPress();
      if (!dragStart.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragStart.current = null;
      setIsDragging(false);
    },
    [clearLongPress],
  );

  // ── Resize via pointer events (SE corner) ──
  const handleResizeStart = useCallback(
    (e: PointerEvent) => {
      if (widget.maximised) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: widget.size.width,
        h: widget.size.height,
      };
      setIsResizing(true);
      focusWidget(widget.id);
    },
    [focusWidget, widget.id, widget.size, widget.maximised],
  );

  const handleResizeMove = useCallback(
    (e: PointerEvent) => {
      if (!resizeStart.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      resizeWidget(widget.id, {
        width: Math.max(280, resizeStart.current.w + dx),
        height: Math.max(200, resizeStart.current.h + dy),
      });
    },
    [resizeWidget, widget.id],
  );

  const handleResizeEnd = useCallback(
    (e: PointerEvent) => {
      if (!resizeStart.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      resizeStart.current = null;
      setIsResizing(false);
    },
    [],
  );

  // ── Title bar actions ──
  const handleMinimise = useCallback(() => minimiseWidget(widget.id), [minimiseWidget, widget.id]);
  const handleMaximise = useCallback(() => {
    if (widget.maximised) {
      restoreWidget(widget.id);
    } else {
      maximiseWidget(widget.id);
    }
  }, [maximiseWidget, restoreWidget, widget.id, widget.maximised]);
  const handleClose = useCallback(() => closeWidget(widget.id), [closeWidget, widget.id]);

  // ── Position & size styles ──
  const positionStyle = widget.maximised
    ? { top: 0, left: 0, width: '100%', height: '100%' }
    : {
        top: widget.position.y,
        left: widget.position.x,
        width: widget.size.width,
        height: widget.size.height,
      };

  return (
    <AnimatePresence>
      {!widget.minimised && (
        <motion.div
          ref={shellRef}
          className={`widget-shell${isDragging ? ' is-dragging' : ''}${widget.maximised ? ' is-maximised' : ''}`}
          style={{
            ...GPU_STYLE,
            ...positionStyle,
            zIndex: widget.zIndex,
          }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={SPRING_NATURAL}
          onPointerDown={handleFocus}
        >
          {/* ── Title Bar / Drag Handle ── */}
          <div
            className="widget-titlebar"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <div className="widget-titlebar-left">
              <GripHorizontal size={14} className="widget-grip" />
              <span className="widget-title">{widget.title}</span>
            </div>
            <div className="widget-titlebar-actions">
              <button
                type="button"
                className="widget-btn"
                onClick={handleMinimise}
                title="Minimise"
              >
                <Minus size={12} />
              </button>
              <button
                type="button"
                className="widget-btn"
                onClick={handleMaximise}
                title={widget.maximised ? 'Restore' : 'Maximise'}
              >
                {widget.maximised ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              <button
                type="button"
                className="widget-btn widget-btn-close"
                onClick={handleClose}
                title="Close"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* ── Content Area ── */}
          <div className="widget-content">
            <div className="widget-content-inner">
              {/* Widget content is rendered by OmniCanvas via component registry */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--od-text-tertiary)',
                fontSize: 13,
                fontWeight: 600,
              }}>
                {widget.component}
              </div>
            </div>
          </div>

          {/* ── Resize Handle (SE corner) ── */}
          {!widget.maximised && (
            <div
              className={`widget-resize-handle${isResizing ? ' is-resizing' : ''}`}
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
