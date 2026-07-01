declare module 'vite-react-ssg' {
  import type { RouteObject } from 'react-router-dom';

  export interface ViteReactSSGOptions {
    readonly routes: readonly RouteObject[];
  }

  export function ViteReactSSG(options: ViteReactSSGOptions): unknown;
}


declare module 'ws' {
  export default class WebSocket {
    constructor(address: string | URL, protocols?: string | readonly string[]);
  }
}
