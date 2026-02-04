/**
 * Dual-Write Device Registry Adapter
 * PRIMARY = Supabase (fail if it fails)
 * SECONDARY = Turso (log + metric, continue if it fails)
 */

import type { DeviceRegistryStore, DeviceInfo } from '../types';
import { SupabaseDeviceRegistry } from './supabase';
import { TursoDeviceRegistry } from './turso';

export class DualDeviceRegistry implements DeviceRegistryStore {
  private primary: SupabaseDeviceRegistry;
  private secondary: TursoDeviceRegistry;
  
  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    tursoUrl: string,
    tursoAuthToken: string
  ) {
    this.primary = new SupabaseDeviceRegistry(supabaseUrl, supabaseKey);
    this.secondary = new TursoDeviceRegistry(tursoUrl, tursoAuthToken);
  }
  
  async getDevices(userId: string): Promise<DeviceInfo[]> {
    // Read from PRIMARY only
    return this.primary.getDevices(userId);
  }
  
  async upsertDevice(userId: string, device: DeviceInfo): Promise<void> {
    // Write to PRIMARY first - throw if fails
    await this.primary.upsertDevice(userId, device);
    
    // Write to SECONDARY - log + continue if fails
    try {
      await this.secondary.upsertDevice(userId, device);
    } catch (error) {
      // Log but don't throw
      console.error('[DUAL-WRITE] SECONDARY (Turso) failed:', error);
      
      // TODO: Add metric emission here when metrics system is available
      // metrics.increment('dataplane.dual_write.secondary_failed');
    }
  }
}
