/// <reference types="vite/client" />

declare module 'js-yaml' {
  export function load(input: string): unknown;
  export function dump(input: unknown): string;
}

/** Minimal Cloudflare Workers KV type (avoids @cloudflare/workers-types dep) */
interface KVNamespace {
  get(key: string, options?: { type?: string }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
