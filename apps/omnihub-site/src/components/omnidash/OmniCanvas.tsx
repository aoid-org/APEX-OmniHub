/**
 * OmniCanvas — Spatial Canvas Host (Layer 2)
 * @version 1.0.0
 * @module apps/omnihub-site/src/components/omnidash/OmniCanvas
 *
 * The infinite canvas that hosts all WidgetShell and FloatingWindow instances.
 * Provides the coordinate space for widget positioning and handles canvas-level
 * interactions (pan, zoom, click-to-deselect).
 *
 * ARCHITECTURE:
 * - Position: relative, full viewport of the center column
 * - GPU compositing via will-change on the transform layer
 * - Widgets are absolutely positioned children
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useCallback, useRef, type MouseEvent } from 'react';
import { useOmniDash } from '../../stores/omniDashStore';
import { WidgetShell } from './WidgetShell';
import { FloatingWindow } from './FloatingWindow';
import { GPU_STYLE } from '../../lib/motionPresets';

export const OmniCanvas = memo(function OmniCanvas() {
  const widgets = useOmniDash(s => s.widgets);
  const floatingWindows = useOmniDash(s => s.floatingWindows);
  const canvasOffset = useOmniDash(s => s.canvasOffset);
  const canvasScale = useOmniDash(s => s.canvasScale);
  const canvasRef = useRef<HTMLDivElement>(null);

  const widgetArray = Array.from(widgets.values());
  const floatingArray = Array.from(floatingWindows.values());

  const handleCanvasClick = useCallback((e: MouseEvent) => {
    // Only fire on the canvas itself, not on child widgets
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('omni-canvas-inner')) {
      // Deselect — future use for multi-select
    }
  }, []);

  return (
    <div
      ref={canvasRef}
      className="omni-canvas"
      onClick={handleCanvasClick}
    >
      {/* Transform layer for pan/zoom */}
      <div
        className="omni-canvas-inner"
        style={{
          ...GPU_STYLE,
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Widget shells */}
        {widgetArray.map(widget => (
          <WidgetShell key={widget.id} widget={widget} />
        ))}
      </div>

      {/* Floating PiP windows — outside transform layer, always screen-relative */}
      {floatingArray.map(floating => (
        <FloatingWindow key={floating.id} config={floating} />
      ))}
    </div>
  );
});
