declare module 'react-grid-layout/legacy' {
  import type { ComponentType } from 'react';
  import type { Layout, Layouts, ResponsiveProps } from 'react-grid-layout';

  export const Responsive: ComponentType<ResponsiveProps>;
  export function WidthProvider<T>(component: T): T;
  export type LegacyResponsiveReactGridLayoutProps = ResponsiveProps;
  export type { Layout, Layouts };
}
