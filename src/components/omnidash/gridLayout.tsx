import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export { type Layout } from 'react-grid-layout/legacy';

const ResponsiveWithWidth = WidthProvider(Responsive);

export type ResponsiveGridLayoutProps = React.ComponentProps<typeof ResponsiveWithWidth>;

export function ResponsiveGridLayout({
  className,
  children,
  ...props
}: Readonly<ResponsiveGridLayoutProps>) {
  const wrapperClassName = className
    ? `responsive-grid-layout ${className}`
    : 'responsive-grid-layout';

/**
 * Responsive-only layout wrapper (non-draggable, non-resizable).
 * Prevents interference with OmniCanvas global drag/pan interactions.
 */
export function ResponsiveGridLayout(props: ResponsiveProps): JSX.Element {
  return (
    <div className={wrapperClassName}>
      <ResponsiveWithWidth className={className} {...props}>
        {children}
      </ResponsiveWithWidth>
    </div>
  );
}

interface DragHandleProps {
  readonly className?: string;
  readonly visibilityClass?: string;
}

export function DragHandle({
  className,
  visibilityClass = 'text-white/0 group-hover:text-white/30',
}: Readonly<DragHandleProps>) {
  const classes = [
    'drag-handle',
    'custom-drag-handle',
    'absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing hover:text-white/60 transition-colors z-20',
    visibilityClass,
    className,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');

  return (
    <div className={classes} aria-label="drag handle">
      ⠿
    </div>
  );
}
