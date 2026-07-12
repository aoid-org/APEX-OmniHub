/**
 * Shared authentication utilities for Supabase Edge Functions
 *
 * Provides standardized JWT validation and user authentication
 * to eliminate duplication across functions.
 *
 * Author: OmniLink APEX
 * Date: 2026-01-19
 */

import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Initialize Supabase client with service role
 * @returns Configured Supabase client
 */
export function createSupabaseClient(): ReturnType<typeof createClient> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Initialize Supabase client scoped to the authenticated user (RLS enforced)
 * @param req - The incoming request with Authorization header
 * @returns Configured Supabase client with user context
 */
export function createScopedSupabaseClient(req: Request): ReturnType<typeof createClient> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  const authHeader = req.headers.get('Authorization');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

/**
 * Validate JWT token and get authenticated user
 * @param authHeader - Authorization header value
 * @param supabase - Supabase client instance
 * @returns Authentication result
 */
export async function authenticateUser(authHeader: string | null, supabase: ReturnType<typeof createClient>): Promise<AuthResult> {
  if (!authHeader) {
    return { success: false, error: 'Authentication required' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Invalid authorization header format' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return { success: false, error: 'Invalid or expired session' };
    }

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get client IP address from request
 * @param req - The request object
 * @returns Client IP address
 */
export function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

/**
 * Get client user agent from request
 * @param req - The request object
 * @returns User agent string
 */
export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * Create standardized error response for authentication failures
 * @param error - Error message
 * @param status - HTTP status code (default: 401)
 * @returns Response object
 */
export function createAuthErrorResponse(error: string, status: number = 401) {
  return new Response(
    JSON.stringify({
      error: 'unauthorized',
      message: error,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create standardized error response for method not allowed
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns Response object
 */
export function createMethodNotAllowedResponse(allowedMethods: string[] = ['POST']) {
  return new Response(
    JSON.stringify({
      error: 'method_not_allowed',
      message: `Only ${allowedMethods.join(', ')} requests are allowed`,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': allowedMethods.join(', '),
      },
    }
  );
}

/**
 * Create standardized error response for internal server errors
 * @param message - Error message (sanitized for client)
 * @returns Response object
 */
export function createInternalErrorResponse(message: string = 'An unexpected error occurred') {
  return new Response(
    JSON.stringify({
      error: 'internal_error',
      message,
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Error thrown when WebSocket authentication fails.
 * Callers should map this to a 401 response via unauthorizedWebSocketResponse().
 */
export class AuthError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Authenticate a WebSocket upgrade request BEFORE upgrading.
 *
 * Browsers cannot set an Authorization header on WebSocket connections,
 * so the access token is accepted from (in priority order):
 *   1. `token` query parameter (standard WS auth transport)
 *   2. `Authorization: Bearer <token>` header (non-browser clients)
 *
 * @param req - The incoming upgrade request
 * @returns The authenticated user
 * @throws AuthError when the token is missing, invalid, or expired
 */
export async function verifyWebSocketAuth(req: Request): Promise<{ user: User }> {
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const authHeader = req.headers.get('Authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromQuery ?? tokenFromHeader;

  if (!token) {
    throw new AuthError('Missing authentication token');
  }

  const supabase = createSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthError('Invalid or expired session');
  }

  return { user };
}

/**
 * Standard 401 response for failed WebSocket authentication.
 * Plain-text body: WS upgrade failures cannot deliver a JSON body to browser clients.
 */
export function unauthorizedWebSocketResponse(): Response {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'Content-Type': 'text/plain' },
  });
}
