import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';

import type { Layout as ReactGridLayoutItem } from 'react-grid-layout';

const ResponsiveWithWidth = WidthProvider(Responsive);

export type Layout = ReactGridLayoutItem[];
export type ResponsiveGridLayoutProps = React.ComponentProps<typeof ResponsiveWithWidth>;

export function ResponsiveGridLayout({
  className,
  children,
  ...props
}: Readonly<ResponsiveGridLayoutProps>) {
  const wrapperClassName = className
    ? `responsive-grid-layout ${className}`
    : 'responsive-grid-layout';

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

export function DragHandle({ className, visibilityClass }: Readonly<DragHandleProps>) {
  const classes = ['drag-handle', 'custom-drag-handle', className, visibilityClass]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');

  return (
    <div className={classes} aria-label="drag handle">
      ⠿
    </div>
  );
}
