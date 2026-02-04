/**
 * Data Plane Factory - Single Export Point
 * Routes to appropriate adapter based on configuration
 */

import type { DataPlane } from './types';
import { loadDataPlaneConfig } from './config';
import { SupabaseDeviceRegistry } from './adapters/supabase';
import { TursoDeviceRegistry } from './adapters/turso';
import { DualDeviceRegistry } from './adapters/dual';
import { TiDBVectorPersistence } from './adapters/tidb';

/**
 * Create Data Plane instance based on environment configuration
 * Lazy-loaded, single instance per mode
 */
export function createDataPlane(): DataPlane {
  const config = loadDataPlaneConfig();
  
  // Device Registry routing
  let deviceRegistry;
  switch (config.deviceRegistryMode) {
    case 'supabase':
      deviceRegistry = new SupabaseDeviceRegistry(config.supabaseUrl, config.supabaseKey);
      break;
    
    case 'turso':
      if (!config.tursoUrl || !config.tursoAuthToken) {
        throw new Error('Turso configuration missing');
      }
      deviceRegistry = new TursoDeviceRegistry(config.tursoUrl, config.tursoAuthToken);
      break;
    
    case 'dual':
      if (!config.tursoUrl || !config.tursoAuthToken) {
        throw new Error('Turso configuration missing for dual mode');
      }
      deviceRegistry = new DualDeviceRegistry(
        config.supabaseUrl,
        config.supabaseKey,
        config.tursoUrl,
        config.tursoAuthToken
      );
      break;
    
    default:
      throw new Error(`Unknown device registry mode: ${config.deviceRegistryMode}`);
  }
  
  // Vector Persistence routing (optional)
  const vectorPersistence = config.vectorPersistenceMode === 'tidb' 
    ? new TiDBVectorPersistence() 
    : undefined;
  
  return {
    deviceRegistry,
    vectorPersistence,
  };
}

// Export types for consumers
export type { DataPlane, DeviceInfo, DeviceRegistryStore, VectorPersistenceStore } from './types';
export type { DataPlaneMode, VectorPersistenceMode } from './types';
