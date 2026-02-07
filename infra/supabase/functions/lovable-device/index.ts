import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { createAnonClient, createServiceClient } from "../_shared/supabaseClient.ts";

interface DeviceInfo {
  device_info: Record<string, unknown>;
  last_seen: string;
  device_id: string;
  user_id: string;
  status?: 'trusted' | 'suspect' | 'blocked';
}

interface DeviceRegistryResponse {
  devices: DeviceInfo[];
}

/**
 * Fetch device registry directly from Supabase device_registry table
 * Replaces Lovable API dependency
 */
async function getDeviceRegistry(userId: string): Promise<DeviceRegistryResponse> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('device_registry')
    .select('*')
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch device registry: ${error.message}`);
  }

  const devices: DeviceInfo[] = (data || []).map((d) => ({
    device_id: d.device_id,
    user_id: d.user_id,
    device_info: d.device_info as Record<string, unknown>,
    last_seen: d.last_seen,
    status: d.status,
  }));

  return { devices };
}

/**
 * Upsert device directly to Supabase device_registry table
 * Replaces Lovable API dependency
 */
async function upsertDevice(userId: string, device: DeviceInfo): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('device_registry')
    .upsert({
      user_id: userId,
      device_id: device.device_id,
      device_info: device.device_info,
      status: device.status || 'suspect',
      last_seen: device.last_seen,
    }, {
      onConflict: 'user_id,device_id',
    });

  if (error) {
    throw new Error(`Failed to upsert device: ${error.message}`);
  }
}

function json(data: unknown, corsHeaders: HeadersInit, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function unauthorized(corsHeaders: HeadersInit): Response {
  return json({ error: 'unauthorized' }, corsHeaders, 401);
}

/**
 * Resolve user ID from request headers, query params, or Supabase auth.
 * Returns the userId or null if unauthenticated.
 */
async function resolveUserId(req: Request): Promise<string | null> {
  const headerUserId = req.headers.get('x-user-id') ?? new URL(req.url).searchParams.get('user_id');
  if (headerUserId) return headerUserId;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabase = createAnonClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function handleGet(userId: string, corsHeaders: HeadersInit): Promise<Response> {
  try {
    const registry = await getDeviceRegistry(userId);
    return json(registry, corsHeaders, 200);
  } catch (error) {
    console.error('Device registry fetch failed:', error);
    return json({ error: 'registry_fetch_failed', message: errorMessage(error) }, corsHeaders, 500);
  }
}

async function handlePost(req: Request, userId: string, corsHeaders: HeadersInit): Promise<Response> {
  try {
    const body = (await req.json()) as { device: DeviceInfo };
    if (!body?.device?.device_id) {
      return json({ error: 'invalid_payload', message: 'Missing device_id' }, corsHeaders, 400);
    }
    await upsertDevice(userId, body.device);
    return json({ status: 'ok' }, corsHeaders, 200);
  } catch (error) {
    console.error('Device upsert failed:', error);
    return json({ error: 'upsert_failed', message: errorMessage(error) }, corsHeaders, 500);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  try {
    const userId = await resolveUserId(req);
    if (!userId) return unauthorized(corsHeaders);

    if (req.method === 'GET') return handleGet(userId, corsHeaders);
    if (req.method === 'POST') return handlePost(req, userId, corsHeaders);

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Lovable device function error:', error);
    return json({ error: 'server_error', message: errorMessage(error) }, corsHeaders, 500);
  }
});
