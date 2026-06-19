/// <reference types="vite/client" />

declare module 'js-yaml' {
  export function load(input: string): unknown;
  export function dump(input: unknown): string;
}

/** Minimal Cloudflare Pages Function types (avoids @cloudflare/workers-types dep) */
interface EventContext<Env = Record<string, string>> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
}
type PagesFunction<Env = Record<string, string>> = (
  context: EventContext<Env>,
) => Response | Promise<Response>;

/** Minimal Cloudflare Workers KV type (avoids @cloudflare/workers-types dep) */
interface KVNamespace {
  get(key: string, options?: { type?: string }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
