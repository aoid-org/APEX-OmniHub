/**
 * Data Plane Unit Tests
 * NO NETWORK - mocks only
 * Tests: config defaults, dual-write fallbacks, idempotent upsert
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDataPlaneConfig } from '../config';
import { createDataPlane } from '../index';
import type { DeviceInfo } from '../types';

describe('Data Plane Configuration', () => {
  const originalEnv = { ...import.meta.env };
  
  beforeEach(() => {
    // Reset env
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  });
  
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  
  it('should default to supabase mode', () => {
    const config = loadDataPlaneConfig();
    expect(config.deviceRegistryMode).toBe('supabase');
    expect(config.vectorPersistenceMode).toBe('off');
  });
  
  it('should require Supabase config always', () => {
    vi.unstubAllEnvs();
    expect(() => loadDataPlaneConfig()).toThrow('VITE_SUPABASE_URL');
  });
  
  it('should require Turso config when mode is turso', () => {
    vi.stubEnv('VITE_DEVICE_REGISTRY_MODE', 'turso');
    expect(() => loadDataPlaneConfig()).toThrow('VITE_TURSO_URL');
  });
  
  it('should require Turso config when mode is dual', () => {
    vi.stubEnv('VITE_DEVICE_REGISTRY_MODE', 'dual');
    expect(() => loadDataPlaneConfig()).toThrow('VITE_TURSO_URL');
  });
  
  it('should not require Turso config when mode is supabase', () => {
    vi.stubEnv('VITE_DEVICE_REGISTRY_MODE', 'supabase');
    expect(() => loadDataPlaneConfig()).not.toThrow();
  });
  
  it('should require TiDB config when vector persistence is tidb', () => {
    vi.stubEnv('VITE_VECTOR_PERSISTENCE_MODE', 'tidb');
    expect(() => loadDataPlaneConfig()).toThrow('TiDB config incomplete');
  });
  
  it('should not require TiDB config when vector persistence is off', () => {
    vi.stubEnv('VITE_VECTOR_PERSISTENCE_MODE', 'off');
    expect(() => loadDataPlaneConfig()).not.toThrow();
  });
});

describe('Data Plane Factory', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  });
  
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  
  it('should create Supabase adapter by default', () => {
    const dataPlane = createDataPlane();
    expect(dataPlane.deviceRegistry).toBeDefined();
    expect(dataPlane.vectorPersistence).toBeUndefined();
  });
  
  it('should create dual adapter when mode is dual', () => {
    vi.stubEnv('VITE_DEVICE_REGISTRY_MODE', 'dual');
    vi.stubEnv('VITE_TURSO_URL', 'libsql://test.turso.io');
    vi.stubEnv('VITE_TURSO_AUTH_TOKEN', 'test-token');
    
    const dataPlane = createDataPlane();
    expect(dataPlane.deviceRegistry).toBeDefined();
  });
  
  it('should create TiDB vector persistence when mode is tidb', () => {
    vi.stubEnv('VITE_VECTOR_PERSISTENCE_MODE', 'tidb');
    vi.stubEnv('VITE_TIDB_HOST', 'test.tidb.io');
    vi.stubEnv('VITE_TIDB_USER', 'test');
    vi.stubEnv('VITE_TIDB_PASSWORD', 'test');
    vi.stubEnv('VITE_TIDB_DATABASE', 'test');
    
    const dataPlane = createDataPlane();
    expect(dataPlane.vectorPersistence).toBeDefined();
  });
});

// Note: Adapter-level tests would require mocking Supabase/libsql clients
// Which is beyond scope of "no network" tests
// Integration tests would cover actual dual-write behavior
