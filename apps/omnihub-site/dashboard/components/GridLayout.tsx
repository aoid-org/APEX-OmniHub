/**
 * OmniDash responsive layout primitives.
 *
 * IMPORTANT: OmniDash now runs inside the global OmniCanvas drag/zoom system.
 * This wrapper intentionally disables react-grid-layout dragging/resizing so
 * card-level interactions never steal pointer events from the canvas host.
 */
import {
  Responsive,
  WidthProvider,
  type LegacyResponsiveReactGridLayoutProps as ResponsiveProps,
} from 'react-grid-layout/legacy';
import type { JSX } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export { type Layout } from 'react-grid-layout/legacy';

const BaseResponsiveGridLayout = WidthProvider(Responsive);

/**
 * Responsive-only layout wrapper (non-draggable, non-resizable).
 * Prevents interference with OmniCanvas global drag/pan interactions.
 */
export function ResponsiveGridLayout(props: Omit<ResponsiveProps, 'width'> & { width?: number }): JSX.Element {
  return (
    <BaseResponsiveGridLayout
      {...props}
      isDraggable={false}
      isResizable={false}
      draggableHandle={undefined}
      draggableCancel="*"
      useCSSTransforms={false}
      compactType="vertical"
      preventCollision={false}
    />
  );
}

interface DragHandleProps {
  /** Optional visibility classes for decorative drag affordance. */
  visibilityClass?: string;
}

/** Decorative six-dot handle retained for visual continuity (not interactive). */
export const DragHandle = ({
  visibilityClass = 'text-white/0 group-hover:text-white/30',
}: DragHandleProps): JSX.Element => (
  <div
    className={`absolute top-0 right-0 p-3 h-10 w-10 pointer-events-none ${visibilityClass} hover:text-white/60 transition-colors z-20`}
    aria-hidden="true"
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  </div>
);
