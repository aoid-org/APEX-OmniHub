import { assertMutationEnvelope, type ApexExecutionEnvelope } from './apex-control-plane.ts';
/**
 * Shared Request Utilities for Edge Functions
 *
 * Common patterns extracted to reduce code duplication across edge functions
 */

/**
 * Extract client IP from request headers
 */
export function getClientIp(req: Request): string {
    return req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(req: Request): string {
    return req.headers.get('user-agent') || 'unknown';
}

/**
 * Create a standardized JSON error response
 */
export function createErrorResponse(
    error: string,
    message: string,
    status: number,
    corsHeaders: Record<string, string>
): Response {
    return new Response(
        JSON.stringify({ error, message }),
        {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
    );
}

/**
 * Create a standardized JSON success response
 */
export function createSuccessResponse(
    data: unknown,
    corsHeaders: Record<string, string>,
    additionalHeaders?: Record<string, string>
): Response {
    return new Response(
        JSON.stringify(data),
        {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                ...additionalHeaders,
            }
        }
    );
}

/**
 * Validate HTTP method
 */
export function validateMethod(
    req: Request,
    allowedMethods: string[],
    corsHeaders: Record<string, string>
): Response | null {
    if (!allowedMethods.includes(req.method)) {
        return createErrorResponse(
            'method_not_allowed',
            `Only ${allowedMethods.join(', ')} requests are allowed`,
            405,
            corsHeaders
        );
    }
    return null;
}

/**
 * Supabase client type (minimal interface to avoid circular dependencies)
 */
interface SupabaseClient {
    auth: {
        getUser(token: string): Promise<{
            data: { user: unknown };
            error: unknown;
        }>;
    };
}

/**
 * Get authenticated user from JWT token
 */
export async function getAuthenticatedUser(
    req: Request,
    supabase: SupabaseClient,
    corsHeaders: Record<string, string>
): Promise<{ user: unknown; error: Response | null }> {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
        return {
            user: null,
            error: createErrorResponse(
                'unauthorized',
                'Authentication required',
                401,
                corsHeaders
            )
        };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
        return {
            user: null,
            error: createErrorResponse(
                'unauthorized',
                'Invalid or expired session',
                401,
                corsHeaders
            )
        };
    }

    return { user, error: null };
}

export function getMutationEnvelope(req: Request, body: Record<string, unknown>, corsHeaders: Record<string, string>): { envelope: ApexExecutionEnvelope | null; error: Response | null } {
    try {
        const envelope = assertMutationEnvelope(req.method, body.envelope ?? body);
        return { envelope, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'invalid_mutation_envelope';
        return { envelope: null, error: createErrorResponse('invalid_mutation_envelope', message, message === 'apex_stale_event' ? 409 : 400, corsHeaders) };
    }
}
