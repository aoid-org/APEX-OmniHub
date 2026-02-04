/**
 * Device Registry Store with Optional Turso Dual-Write
 * SOVEREIGN DATA PLANE INTEGRATION - Phase 3
 * Isolated to lovable-device function - NO shared cross-function imports
 */

// Import Supabase client (already pinned in deno.json if exists, else version-pin below)
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

interface DeviceInfo {
  device_info: Record<string, unknown>;
  last_seen: string;
  device_id: string;
  user_id: string;
  status?: 'trusted' | 'suspect' | 'blocked';
}

type RegistryMode = 'supabase' | 'turso' | 'dual';

/**
 * Get device registry mode from environment
 */
function getRegistryMode(): RegistryMode {
  const mode = Deno.env.get('DEVICE_REGISTRY_MODE') || 'supabase';
  return mode as RegistryMode;
}

/**
 * Structured logging helper
 */
function logEvent(event: string, metadata: Record<string, unknown>) {
  console.log(JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  }));
}

/**
 * Get devices from Supabase (PRIMARY)
 */
async function getDevicesSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<DeviceInfo[]> {
  const { data, error } = await supabase
    .from('device_registry')
    .select('*')
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });

  if (error) {
    throw new Error(`Supabase getDevices failed: ${error.message}`);
  }

  return (data || []).map((d) => ({
    device_id: d.device_id,
    user_id: d.user_id,
    device_info: d.device_info as Record<string, unknown>,
    last_seen: d.last_seen,
    status: d.status,
  }));
}

/**
 * Upsert device to Supabase (PRIMARY)
 */
async function upsertDeviceSupabase(
  supabase: SupabaseClient,
  userId: string,
  device: DeviceInfo
): Promise<void> {
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
    throw new Error(`Supabase upsertDevice failed: ${error.message}`);
  }
}

/**
 * Upsert device to Turso (SECONDARY - fail-safe)
 * Only called if mode is 'turso' or 'dual'
 */
async function upsertDeviceTursoSecondary(
  userId: string,
  device: DeviceInfo,
  requestId: string
): Promise<void> {
  const tursoUrl = Deno.env.get('TURSO_URL');
  const tursoToken = Deno.env.get('TURSO_AUTH_TOKEN');

  if (!tursoUrl || !tursoToken) {
    logEvent('DEVICE_REGISTRY_WRITE_SECONDARY_FAILED', {
      request_id: requestId,
      mode: getRegistryMode(),
      error_code: 'TURSO_CONFIG_MISSING',
      latency_ms: 0,
    });
    return; // Fail safe - continue without Turso
  }

  const startTime = performance.now();
  
  try {
    // Use libsql client for Deno edge runtime
    const { createClient: createLibsqlClient } = await import('npm:@libsql/client@0.14.0/web');
    const client = createLibsqlClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO device_registry (user_id, device_id, device_info, status, last_seen)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        userId,
        device.device_id,
        JSON.stringify(device.device_info),
        device.status || 'suspect',
        device.last_seen,
      ],
    });

    const latency = performance.now() - startTime;
    logEvent('DEVICE_REGISTRY_WRITE_OK', {
      request_id: requestId,
      mode: 'turso_secondary',
      latency_ms: latency,
    });
  } catch (error) {
    const latency = performance.now() - startTime;
    logEvent('DEVICE_REGISTRY_WRITE_SECONDARY_FAILED', {
      request_id: requestId,
      mode: getRegistryMode(),
      error_code: 'TURSO_WRITE_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown',
      latency_ms: latency,
    });
    // Do NOT throw - fail safe for SECONDARY
  }
}

/**
 * Get device registry - reads from PRIMARY (Supabase) only
 */
export async function getDeviceRegistry(
  supabase: SupabaseClient,
  userId: string,
  requestId: string
): Promise<{ devices: DeviceInfo[] }> {
  const startTime = performance.now();
  const devices = await getDevicesSupabase(supabase, userId);
  const latency = performance.now() - startTime;
  
  logEvent('DEVICE_REGISTRY_READ_OK', {
    request_id: requestId,
    mode: getRegistryMode(),
    deviceCount: devices.length,
    latency_ms: latency,
  });
  
  return { devices };
}

/**
 * Upsert device - dual-write if mode is 'dual'
 * PRIMARY = Supabase (fail-fast)
 * SECONDARY = Turso (fail-safe)
 */
export async function upsertDeviceRegistry(
  supabase: SupabaseClient,
  userId: string,
  device: DeviceInfo,
  requestId: string
): Promise<void> {
  const mode = getRegistryMode();
  const startTime = performance.now();
  
  // PRIMARY write - throw if fails
  await upsertDeviceSupabase(supabase, userId, device);
  
  const primaryLatency = performance.now() - startTime;
  logEvent('DEVICE_REGISTRY_WRITE_OK', {
    request_id: requestId,
    mode: 'supabase_primary',
    latency_ms: primaryLatency,
  });
  
  // SECONDARY write - continue if fails
  if (mode === 'turso' || mode === 'dual') {
    await upsertDeviceTursoSecondary(userId, device, requestId);
  }
}
