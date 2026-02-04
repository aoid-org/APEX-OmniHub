/**
 * Supabase Device Registry Adapter
 * Default behavior - unchanged from current implementation
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DeviceRegistryStore, DeviceInfo } from '../types';

export class SupabaseDeviceRegistry implements DeviceRegistryStore {
  private client: SupabaseClient;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }
  
  async getDevices(userId: string): Promise<DeviceInfo[]> {
    const { data, error } = await this.client
      .from('device_registry')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Supabase getDevices failed: ${error.message}`);
    }
    
    return data || [];
  }
  
  async upsertDevice(userId: string, device: DeviceInfo): Promise<void> {
    const { error } = await this.client
      .from('device_registry')
      .upsert({
        user_id: userId,
        device_id: device.device_id,
        device_info: device.device_info,
        status: device.status,
        last_seen: device.last_seen,
      }, {
        onConflict: 'user_id,device_id'
      });
    
    if (error) {
      throw new Error(`Supabase upsertDevice failed: ${error.message}`);
    }
  }
}
