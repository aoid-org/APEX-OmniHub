import { describe, it, expect } from 'vitest';
import {
  mapRolesToTrustTier,
  extractBearerToken,
  SchemaRegistry,
  RBACEngine,
  registerDefaultGatewayPolicies,
} from '../../../src/omnihub-gateway/middleware/TriforceGuardian';
import { z } from 'zod';

describe('mapRolesToTrustTier', () => {
  it('maps admin roles to GOD_MODE', () => {
    expect(mapRolesToTrustTier(['admin'])).toBe('GOD_MODE');
    expect(mapRolesToTrustTier(['super_admin'])).toBe('GOD_MODE');
    expect(mapRolesToTrustTier(['owner'])).toBe('GOD_MODE');
    expect(mapRolesToTrustTier(['god_mode'])).toBe('GOD_MODE');
  });

  it('maps operator roles to OPERATOR', () => {
    expect(mapRolesToTrustTier(['operator'])).toBe('OPERATOR');
    expect(mapRolesToTrustTier(['manager'])).toBe('OPERATOR');
    expect(mapRolesToTrustTier(['developer'])).toBe('OPERATOR');
    expect(mapRolesToTrustTier(['editor'])).toBe('OPERATOR');
    expect(mapRolesToTrustTier(['engineer'])).toBe('OPERATOR');
  });

  it('maps viewer roles to PERIPHERAL', () => {
    expect(mapRolesToTrustTier(['viewer'])).toBe('PERIPHERAL');
    expect(mapRolesToTrustTier(['reader'])).toBe('PERIPHERAL');
    expect(mapRolesToTrustTier(['member'])).toBe('PERIPHERAL');
  });

  it('maps unknown roles to PUBLIC', () => {
    expect(mapRolesToTrustTier(['unknown'])).toBe('PUBLIC');
    expect(mapRolesToTrustTier([])).toBe('PUBLIC');
  });

  it('is case-insensitive', () => {
    expect(mapRolesToTrustTier(['ADMIN'])).toBe('GOD_MODE');
    expect(mapRolesToTrustTier(['Operator'])).toBe('OPERATOR');
  });

  it('uses highest privilege when multiple roles present', () => {
    expect(mapRolesToTrustTier(['viewer', 'admin'])).toBe('GOD_MODE');
    expect(mapRolesToTrustTier(['member', 'operator'])).toBe('OPERATOR');
  });
});

describe('extractBearerToken', () => {
  it('extracts token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('returns null for missing header', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null for non-Bearer headers', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
    expect(extractBearerToken('Token abc123')).toBeNull();
  });

  it('returns null for Bearer with empty token', () => {
    expect(extractBearerToken('Bearer ')).toBeNull();
    expect(extractBearerToken('Bearer   ')).toBeNull();
  });

  it('is case-insensitive for Bearer prefix', () => {
    expect(extractBearerToken('bearer abc')).toBe('abc');
    expect(extractBearerToken('BEARER abc')).toBe('abc');
  });

  it('trims whitespace', () => {
    expect(extractBearerToken('  Bearer  token  ')).toBe('token');
  });
});

describe('SchemaRegistry', () => {
  it('validates params against registered schema', () => {
    const registry = new SchemaRegistry();
    registry.register('test/method', z.object({ name: z.string() }));

    expect(registry.validate('test/method', { name: 'valid' })).toBeNull();
    expect(registry.validate('test/method', { name: 123 })).not.toBeNull();
  });

  it('returns null for unregistered methods', () => {
    const registry = new SchemaRegistry();
    expect(registry.validate('unknown', {})).toBeNull();
  });

  it('has() returns correct membership', () => {
    const registry = new SchemaRegistry();
    registry.register('test', z.object({}));
    expect(registry.has('test')).toBe(true);
    expect(registry.has('other')).toBe(false);
  });
});

describe('RBACEngine', () => {
  it('denies unregistered methods in fail-closed mode', () => {
    const engine = new RBACEngine(true);
    const { authorized } = engine.evaluate('unknown/method', 'OPERATOR');
    expect(authorized).toBe(false);
  });

  it('allows unregistered methods when fail-closed is disabled', () => {
    const engine = new RBACEngine(false);
    const { authorized } = engine.evaluate('unknown/method', 'OPERATOR');
    expect(authorized).toBe(true);
  });

  it('evaluates trust tier rank correctly', () => {
    const engine = new RBACEngine(true);
    engine.addPolicy({
      method: 'test',
      requiredAction: 'execute',
      requiredTrustTier: 'OPERATOR',
      description: 'test',
    });

    expect(engine.evaluate('test', 'GOD_MODE').authorized).toBe(true);
    expect(engine.evaluate('test', 'OPERATOR').authorized).toBe(true);
    expect(engine.evaluate('test', 'PERIPHERAL').authorized).toBe(false);
    expect(engine.evaluate('test', 'PUBLIC').authorized).toBe(false);
  });

  it('registerDefaultGatewayPolicies populates policies', () => {
    const engine = new RBACEngine(true);
    registerDefaultGatewayPolicies(engine);
    expect(engine.listPolicies().length).toBeGreaterThan(0);

    // Health check should be PUBLIC
    expect(engine.evaluate('health/check', 'PUBLIC').authorized).toBe(true);
    // tools/call requires OPERATOR
    expect(engine.evaluate('tools/call', 'PERIPHERAL').authorized).toBe(false);
    expect(engine.evaluate('tools/call', 'OPERATOR').authorized).toBe(true);
  });
});
