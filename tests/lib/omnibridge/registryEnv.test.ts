import { describe, expect, it } from 'vitest';
import {
  resolveSyncPacketSourceFromEnv,
  resolveHardenedSourceFromEnv,
  lastRegistryErrorFromEnv,
  type RegistryEnv,
} from '../../../src/lib/omnibridge/registryEnv';

const SECRET_VALUE = 'registryenv-unit-test-secret-NOSONAR-ok'; // NOSONAR

function goodEnv(overrides: Partial<RegistryEnv> = {}): RegistryEnv {
  return {
    OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([
      {
        client_id: 'partner-a',
        client_secret_hash: 'hash',
        scopes: ['omnibridge:ingest'],
        tenant_id: 't1',
        webhook: {
          source_id: 'partner-a',
          key_id: 'partner-a-v1',
          secret_env: 'PARTNER_A_SECRET',
          status: 'active',
          profile: 'sync_packet',
        },
      },
      {
        client_id: 'partner-b',
        client_secret_hash: 'hash',
        scopes: ['omnibridge:ingest'],
        tenant_id: 't2',
        webhook: {
          source_id: 'partner-b',
          key_id: 'partner-b-v1',
          secret_env: 'PARTNER_B_SECRET',
          status: 'active',
          profile: 'hardened',
        },
      },
    ]),
    PARTNER_A_SECRET: SECRET_VALUE,
    PARTNER_B_SECRET: SECRET_VALUE,
    ...overrides,
  };
}

describe('registryEnv — sync_packet resolution', () => {
  it('resolves active sync_packet source', () => {
    const env = goodEnv();
    const r = resolveSyncPacketSourceFromEnv('partner-a', env);
    expect(r).not.toBeNull();
    expect(r?.client.tenant_id).toBe('t1');
    expect(r?.secret).toBe(SECRET_VALUE);
  });

  it('returns null for unknown source', () => {
    expect(resolveSyncPacketSourceFromEnv('who-dis', goodEnv())).toBeNull();
  });

  it('returns null when profile mismatch', () => {
    // partner-b has profile 'hardened' — should not resolve via sync_packet
    expect(resolveSyncPacketSourceFromEnv('partner-b', goodEnv())).toBeNull();
  });

  it('returns null when client is inactive', () => {
    const env = goodEnv();
    env.OMNIBRIDGE_M2M_CLIENTS = JSON.stringify([{
      client_id: 'x', client_secret_hash: 'h', scopes: [], tenant_id: 't',
      webhook: { source_id: 'x', key_id: 'k', secret_env: 'X_SECRET', status: 'inactive', profile: 'sync_packet' },
    }]);
    env.X_SECRET = 's';
    expect(resolveSyncPacketSourceFromEnv('x', env)).toBeNull();
  });

  it('returns null when secret env var is missing', () => {
    const env = goodEnv();
    delete env.PARTNER_A_SECRET;
    expect(resolveSyncPacketSourceFromEnv('partner-a', env)).toBeNull();
  });

  it('returns null when OMNIBRIDGE_M2M_CLIENTS is not set', () => {
    expect(resolveSyncPacketSourceFromEnv('partner-a', {})).toBeNull();
  });

  it('records parse error on invalid JSON', () => {
    const env: RegistryEnv = { OMNIBRIDGE_M2M_CLIENTS: 'not-json' };
    const r = resolveSyncPacketSourceFromEnv('x', env);
    expect(r).toBeNull();
    expect(lastRegistryErrorFromEnv(env)?.message).toMatch(/Failed to parse/);
  });

  it('records parse error when not an array', () => {
    const env: RegistryEnv = { OMNIBRIDGE_M2M_CLIENTS: '{"not":"array"}' };
    expect(resolveSyncPacketSourceFromEnv('x', env)).toBeNull();
    expect(lastRegistryErrorFromEnv(env)?.message).toMatch(/must be a JSON array/);
  });

  it('records error on malformed client record', () => {
    const env: RegistryEnv = { OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([{ client_id: 123 }]) };
    expect(resolveSyncPacketSourceFromEnv('x', env)).toBeNull();
    expect(lastRegistryErrorFromEnv(env)?.message).toMatch(/Malformed/);
  });

  it('rejects webhook with invalid profile value', () => {
    const env: RegistryEnv = {
      OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([{
        client_id: 'x', client_secret_hash: 'h', scopes: [], tenant_id: 't',
        webhook: { source_id: 'x', key_id: 'k', secret_env: 'S', status: 'active', profile: 'bogus' },
      }]),
    };
    expect(resolveSyncPacketSourceFromEnv('x', env)).toBeNull();
    expect(lastRegistryErrorFromEnv(env)?.message).toMatch(/Malformed/);
  });

  it('rejects allowed_ips not an array', () => {
    const env: RegistryEnv = {
      OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([{
        client_id: 'x', client_secret_hash: 'h', scopes: [], tenant_id: 't',
        webhook: { source_id: 'x', key_id: 'k', secret_env: 'S', status: 'active', profile: 'sync_packet', allowed_ips: 'not-array' },
      }]),
    };
    expect(resolveSyncPacketSourceFromEnv('x', env)).toBeNull();
  });
});

describe('registryEnv — hardened resolution', () => {
  it('resolves active hardened source by (source_id, key_id)', () => {
    const r = resolveHardenedSourceFromEnv('partner-b', 'partner-b-v1', goodEnv());
    expect(r).not.toBeNull();
    expect(r?.client.tenant_id).toBe('t2');
  });

  it('rejects wrong key_id even for correct source_id', () => {
    expect(resolveHardenedSourceFromEnv('partner-b', 'wrong-key', goodEnv())).toBeNull();
  });

  it('rejects sync_packet-profile source via hardened lookup', () => {
    expect(resolveHardenedSourceFromEnv('partner-a', 'partner-a-v1', goodEnv())).toBeNull();
  });

  it('accepts source without explicit profile (back-compat: defaults to hardened)', () => {
    const env: RegistryEnv = {
      OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([{
        client_id: 'legacy', client_secret_hash: 'h', scopes: [], tenant_id: 't-legacy',
        webhook: { source_id: 'legacy', key_id: 'legacy-v1', secret_env: 'LEGACY_SECRET', status: 'active' },
      }]),
      LEGACY_SECRET: SECRET_VALUE,
    };
    const r = resolveHardenedSourceFromEnv('legacy', 'legacy-v1', env);
    expect(r?.client.tenant_id).toBe('t-legacy');
  });
});

describe('registryEnv — error tracking is per-env-instance', () => {
  it('does not leak error state across independent env objects', () => {
    const envBad: RegistryEnv = { OMNIBRIDGE_M2M_CLIENTS: 'junk' };
    const envGood = goodEnv();
    resolveSyncPacketSourceFromEnv('x', envBad);
    resolveSyncPacketSourceFromEnv('partner-a', envGood);
    expect(lastRegistryErrorFromEnv(envBad)).not.toBeNull();
    expect(lastRegistryErrorFromEnv(envGood)).toBeNull();
  });
});
