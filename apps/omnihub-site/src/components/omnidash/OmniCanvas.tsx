/**
 * APEX OmniDash — Canvas Host (Layer 2: Coordinate Boundary)
 * @version 6.1.0
 * @module apps/omnihub-site/src/components/omnidash/OmniCanvas
 *
 * The Coordinate Boundary: Acts as the position:relative bounding box
 * covering the entire available viewport. Manages the Cartesian coordinate
 * mapping of all child WidgetShell elements.
 *
 * APEX STANDARDS ENFORCED:
 * - Modularity: Pure presentational container — zero business logic
 * - Performance: overflow:hidden prevents scroll reflows, GPU layer isolation
 * - Regression-Free: Shell (sidebar/header) never enters this boundary
 * - Overload-Free: Single responsibility — coordinate mapping only
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface OmniCanvasProps {
  /** WidgetShell instances to render on the spatial canvas. */
  readonly children: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

/**
 * OmniCanvas — The spatial coordinate boundary.
 *
 * RULES:
 * 1. All children must be absolutely positioned (via WidgetShell)
 * 2. The shell (sidebar, header) must NEVER be a child of this component
 * 3. This component must NEVER be wrapped by physics or drag contexts
 */
export const OmniCanvas = memo(function OmniCanvas({ children }: Readonly<OmniCanvasProps>) {
  return (
    <div
      className="omni-canvas"
      data-testid="omni-canvas"
      style={{
        position: 'relative',
        flex: 1,
        overflow: 'hidden',
        // Prevent text selection during widget drag operations
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Reserve touch actions for pointer events
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
});
