/**
 * Turso Device Registry Adapter
 * Uses @libsql/client for Node (browser compatibility TBD)
 * Cached client, idempotent UPSERT
 */

import type { DeviceRegistryStore, DeviceInfo } from '../types';

// Dynamic import to avoid bundling if not used
let libsqlClient: any = null;

async function getLibsqlClient() {
  if (!libsqlClient) {
    // @ts-expect-error - dynamic import
    libsqlClient = await import('@libsql/client');
  }
  return libsqlClient;
}

export class TursoDeviceRegistry implements DeviceRegistryStore {
  private client: any = null;
  private url: string;
  private authToken: string;
  
  constructor(url: string, authToken: string) {
    this.url = url;
    this.authToken = authToken;
  }
  
  private async getClient() {
    if (!this.client) {
      const libsql = await getLibsqlClient();
      this.client = libsql.createClient({
        url: this.url,
        authToken: this.authToken,
      });
    }
    return this.client;
  }
  
  async getDevices(userId: string): Promise<DeviceInfo[]> {
    const client = await this.getClient();
    const result = await client.execute({
      sql: 'SELECT device_id, device_info, status, last_seen FROM device_registry WHERE user_id = ?',
      args: [userId],
    });
    
    return result.rows.map((row: any) => ({
      device_id: row.device_id as string,
      device_info: row.device_info as string,
      status: row.status as 'trusted' | 'pending' | 'blocked',
      last_seen: row.last_seen as string,
    }));
  }
  
  async upsertDevice(userId: string, device: DeviceInfo): Promise<void> {
    const client = await this.getClient();
    
    // Idempotent upsert
    await client.execute({
      sql: `INSERT OR REPLACE INTO device_registry (user_id, device_id, device_info, status, last_seen)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, device.device_id, device.device_info, device.status, device.last_seen],
    });
  }
}
