import React from 'react';

export type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isResizable?: boolean;
};

export type Layout = LayoutItem[];

type ResponsiveGridLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  layouts?: Partial<Record<string, Layout>>;
  breakpoints?: Record<string, number>;
  cols?: Record<string, number>;
  rowHeight?: number;
  onLayoutChange?: (currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => void;
  draggableHandle?: string;
  margin?: [number, number];
};

export const ResponsiveGridLayout: React.FC<ResponsiveGridLayoutProps> = ({
  className,
  children,
  layouts,
  onLayoutChange,
  breakpoints: _breakpoints,
  cols: _cols,
  rowHeight: _rowHeight,
  draggableHandle: _draggableHandle,
  margin: _margin,
  ...rest
}) => {
  React.useEffect(() => {
    if (!onLayoutChange) {
      return;
    }
    const current = layouts?.lg ?? [];
    onLayoutChange(current, layouts ?? {});
  }, [layouts, onLayoutChange]);

  return (
    <div
      data-testid="responsive-grid"
      className={['responsive-grid-layout', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
};

type DragHandleProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  visibilityClass?: string;
};

export const DragHandle: React.FC<DragHandleProps> = ({
  className,
  visibilityClass,
  children,
  ...rest
}) => (
  <div
    className={['drag-handle custom-drag-handle', visibilityClass, className].filter(Boolean).join(' ')}
    aria-label="drag handle"
    role="button"
    tabIndex={0}
    {...rest}
  >
    {children ?? '⠿'}
  </div>
);
