/**
 * Data Plane Configuration - Environment Handling
 * NO secrets in code - use env only
 * Must NOT crash on missing optional envs
 */

import type { DataPlaneMode, VectorPersistenceMode } from './types';

export interface DataPlaneConfig {
  deviceRegistryMode: DataPlaneMode;
  vectorPersistenceMode: VectorPersistenceMode;
  
  // Supabase (always required for PRIMARY)
  supabaseUrl: string;
  supabaseKey: string;
  
  // Turso (required only if mode includes turso)
  tursoUrl?: string;
  tursoAuthToken?: string;
  
  // TiDB (required only if vectorPersistenceMode === 'tidb')
  tidbHost?: string;
  tidbPort?: number;
  tidbUser?: string;
  tidbPassword?: string;
  tidbDatabase?: string;
  tidbCaPath?: string;
}

/**
 * Load configuration from environment variables
 * Validates required vars based on mode
 */
export function loadDataPlaneConfig(): DataPlaneConfig {
  const deviceRegistryMode = (import.meta.env.VITE_DEVICE_REGISTRY_MODE || 'supabase') as DataPlaneMode;
  const vectorPersistenceMode = (import.meta.env.VITE_VECTOR_PERSISTENCE_MODE || 'off') as VectorPersistenceMode;
  
  // Supabase always required (PRIMARY in all modes)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required');
  }
  
  const config: DataPlaneConfig = {
    deviceRegistryMode,
    vectorPersistenceMode,
    supabaseUrl,
    supabaseKey,
  };
  
  // Turso required if mode includes turso
  if (deviceRegistryMode === 'turso' || deviceRegistryMode === 'dual') {
    config.tursoUrl = import.meta.env.VITE_TURSO_URL;
    config.tursoAuthToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;
    
    if (!config.tursoUrl || !config.tursoAuthToken) {
      throw new Error('VITE_TURSO_URL and VITE_TURSO_AUTH_TOKEN required for turso/dual mode');
    }
  }
  
  // TiDB required if vectorPersistenceMode === 'tidb'
  if (vectorPersistenceMode === 'tidb') {
    config.tidbHost = import.meta.env.VITE_TIDB_HOST;
    config.tidbPort = import.meta.env.VITE_TIDB_PORT ? parseInt(import.meta.env.VITE_TIDB_PORT, 10) : undefined;
    config.tidbUser = import.meta.env.VITE_TIDB_USER;
    config.tidbPassword = import.meta.env.VITE_TIDB_PASSWORD;
    config.tidbDatabase = import.meta.env.VITE_TIDB_DATABASE;
    config.tidbCaPath = import.meta.env.VITE_TIDB_CA_PATH;
    
    if (!config.tidbHost || !config.tidbUser || !config.tidbPassword || !config.tidbDatabase) {
      throw new Error('TiDB config incomplete: VITE_TIDB_HOST, VITE_TIDB_USER, VITE_TIDB_PASSWORD, VITE_TIDB_DATABASE required');
    }
  }
  
  return config;
}
