declare module 'vite-react-ssg' {
  import type { RouteObject } from 'react-router-dom';
  import type { ReactNode, ReactElement } from 'react';

  export interface ViteReactSSGOptions {
    readonly routes: readonly RouteObject[];
  }

  export function ViteReactSSG(options: ViteReactSSGOptions): unknown;

  export function Head(props: { children: ReactNode }): ReactElement | null;
}


declare module 'ws' {
  export default class WebSocket {
    constructor(address: string | URL, protocols?: string | readonly string[]);
  }
}
