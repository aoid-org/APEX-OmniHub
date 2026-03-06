/**
 * APEX OmniDash — Widget Shell (Layer 3: Hardware Exoskeleton)
 * @version 6.1.0
 * @module apps/omnihub-site/src/components/omnidash/WidgetShell
 *
 * The Hardware Exoskeleton: A required wrapper for ALL presentational widgets
 * on the OmniDash spatial canvas.
 *
 * Performance Architecture (web-research validated):
 *   - Position stored in useRef during drag — ZERO React re-renders during movement
 *   - Visual updates applied via requestAnimationFrame — syncs with browser paint cycle
 *   - setPointerCapture locks events to element even when pointer leaves bounds
 *   - GPU compositing via transform: translate3d(x, y, 0) — never top/left
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same widget ID + position → identical render
 * - Modularity: Wraps any ReactNode — pure HOC pattern
 * - Performance: Zero reflows — only animates transform and opacity
 * - Regression-Free: will-change applied only during active drag to prevent layer explosion
 * - Overload-Free: Cleanup on unmount — no leaked listeners
 * - Security: Pointer events only — no drag HTML5 API (prevents data exfiltration)
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import {
  memo,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion } from 'framer-motion';
import { SPRING_SNAPPY, GPU_STYLE } from '@/lib/motionPresets';
import { useOmniDashStore, type WidgetLayout } from '@/stores/omniDashStore';
import { GripHorizontal, Minimize2, X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface WidgetShellProps {
  /** Unique widget identifier — must match a key in omniDashStore layouts. */
  readonly widgetId: string;
  /** Display title shown in the title bar. */
  readonly title: string;
  /** The presentational widget content. */
  readonly children: ReactNode;
  /** Optional: hide the title bar for full-bleed widgets. */
  readonly chromeless?: boolean;
  /** Optional: minimum width constraint. */
  readonly minWidth?: number;
  /** Optional: minimum height constraint. */
  readonly minHeight?: number;
  /** Optional: callback when close button is clicked. */
  readonly onClose?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const TITLE_BAR_HEIGHT = 36;

// ============================================================================
// Component
// ============================================================================

export const WidgetShell = memo(function WidgetShell({
  widgetId,
  title,
  children,
  chromeless = false,
  minWidth = 200,
  minHeight = 120,
  onClose,
}: Readonly<WidgetShellProps>) {
  // ── Store selectors ──
  const layout = useOmniDashStore((s) => s.layouts[widgetId]);
  const bringToFront = useOmniDashStore((s) => s.bringToFront);
  const updatePosition = useOmniDashStore((s) => s.updatePosition);

  // ── Refs for zero-rerender drag ──
  const shellRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ clientX: 0, clientY: 0 });
  const dragStartLayout = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);
  const isMinimized = useRef(false);

  // ── Fallback layout ──
  const safeLayout: WidgetLayout = layout ?? {
    x: 0, y: 0, w: 400, h: 300, z: 10,
  };

  // ── Pointer Down: Begin drag ──
  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Only drag from title bar (check data attribute)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging.current = true;
    dragStartPos.current = { clientX: e.clientX, clientY: e.clientY };
    dragStartLayout.current = { x: safeLayout.x, y: safeLayout.y };

    // Lock pointer events to this element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Elevate to foreground
    bringToFront(widgetId);

    // Apply will-change only during drag (prevents layer explosion)
    if (shellRef.current) {
      shellRef.current.style.willChange = 'transform';
    }
  }, [safeLayout.x, safeLayout.y, widgetId, bringToFront]);

  // ── Pointer Move: Update position via rAF ──
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !shellRef.current) return;

    const deltaX = e.clientX - dragStartPos.current.clientX;
    const deltaY = e.clientY - dragStartPos.current.clientY;

    const newX = dragStartLayout.current.x + deltaX;
    const newY = Math.max(0, dragStartLayout.current.y + deltaY); // Clamp top

    // Cancel previous frame
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    // Schedule visual update on next paint cycle
    rafId.current = requestAnimationFrame(() => {
      if (shellRef.current) {
        shellRef.current.style.transform = `translate3d(${String(newX)}px, ${String(newY)}px, 0)`;
      }
    });
  }, []);

  // ── Pointer Up: Commit position to store ──
  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    isDragging.current = false;

    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Cancel any pending rAF
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    // Calculate final position
    const deltaX = e.clientX - dragStartPos.current.clientX;
    const deltaY = e.clientY - dragStartPos.current.clientY;
    const finalX = dragStartLayout.current.x + deltaX;
    const finalY = Math.max(0, dragStartLayout.current.y + deltaY);

    // Remove will-change to free GPU layer
    if (shellRef.current) {
      shellRef.current.style.willChange = 'auto';
    }

    // Commit to zustand store → triggers debounced persistence
    updatePosition(widgetId, finalX, finalY);
  }, [widgetId, updatePosition]);

  // ── Click handler: bring to front on any click ──
  const handleClick = useCallback(() => {
    bringToFront(widgetId);
  }, [widgetId, bringToFront]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // ── Minimize toggle ──
  const handleMinimize = useCallback(() => {
    isMinimized.current = !isMinimized.current;
    if (shellRef.current) {
      const content = shellRef.current.querySelector('[data-widget-content]');
      if (content instanceof HTMLElement) {
        content.style.display = isMinimized.current ? 'none' : 'block';
      }
    }
  }, []);

  return (
    <motion.div
      ref={shellRef}
      className="widget-shell glass"
      data-testid={`widget-shell-${widgetId}`}
      data-widget-id={widgetId}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SNAPPY}
      style={{
        position: 'absolute',
        transform: `translate3d(${String(safeLayout.x)}px, ${String(safeLayout.y)}px, 0)`,
        width: safeLayout.w,
        minWidth,
        minHeight: chromeless ? minHeight : minHeight + TITLE_BAR_HEIGHT,
        zIndex: safeLayout.z,
        ...GPU_STYLE,
        // Glassmorphism inherited from .glass class
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {/* ── Title Bar (Drag Handle) ── */}
      {!chromeless && (
        <div
          data-drag-handle
          className="widget-shell-titlebar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: TITLE_BAR_HEIGHT,
            padding: '0 12px',
            cursor: 'grab',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <GripHorizontal
            style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }}
          />
          <span
            style={{
              flex: 1,
              fontSize: 11,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>

          {/* Window controls */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
            style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              minHeight: 'auto', minWidth: 'auto',
            }}
            title="Minimize"
          >
            <Minimize2 style={{ width: 12, height: 12 }} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                minHeight: 'auto', minWidth: 'auto',
              }}
              title="Close"
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      )}

      {/* ── Widget Content ── */}
      <div
        data-widget-content
        style={{
          flex: 1,
          overflow: 'auto',
          padding: chromeless ? 0 : undefined,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
});
