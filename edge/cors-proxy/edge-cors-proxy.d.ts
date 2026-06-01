export declare const MAX_UPSTREAM_BYTES: number;
export declare function corsHeaders(origin: string | null): Record<string, string>;
export declare function isAllowedOrigin(origin: string | null): boolean;
export declare function isUnsafeHostname(hostname: string): boolean;
export declare function isAllowedTargetHost(
  hostname: string,
  allowedTargetHosts?: Set<string>,
): boolean;

export declare function validateTargetUrl(
  value: string,
  allowedTargetHosts?: Set<string>,
): { ok: true; url: URL } | { ok: false; error: string };

declare const corsWorker: {
  fetch(request: Request, env?: { APEX_CORS_PROXY_ALLOWED_TARGET_HOSTS?: string }): Promise<Response>;
};
export default corsWorker;
