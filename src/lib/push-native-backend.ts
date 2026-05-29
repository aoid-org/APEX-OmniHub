/**
 * Register device token with Supabase backend
 */
export async function registerTokenWithBackend(token: string, platform: string): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Get device info with type assertions
    const { Device } = await import('@capacitor/device');
    const deviceInfo = await Device.getInfo() as unknown as { appVersion: string; osVersion: string; model: string };
    const deviceId = await Device.getId();

    // Upsert token
    const { error } = await supabase.rpc('upsert_push_device_token', {
        p_user_id: user.id,
        p_device_id: deviceId.identifier,
        p_platform: platform,
        p_token: token,
        p_app_version: deviceInfo.appVersion,
        p_os_version: deviceInfo.osVersion,
        p_device_model: deviceInfo.model,
    });

    if (error) {
        throw error;
    }

    console.warn('[PushNative] Token registered with backend successfully');
}
