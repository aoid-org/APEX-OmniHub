export declare const MAX_UPSTREAM_BYTES: number;
export declare function corsHeaders(origin: string | null): Record<string, string>;
export declare function isAllowedOrigin(origin: string | null): boolean;
export declare function isUnsafeHostname(hostname: string): boolean;
export declare function validateTargetUrl(
  value: string,
): { ok: true; url: URL } | { ok: false; error: string };

declare const corsWorker: {
  fetch(request: Request): Promise<Response>;
};
export default corsWorker;
