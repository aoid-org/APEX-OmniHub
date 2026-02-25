import { describe, expect, it } from 'vitest';
import { selectRpcUrl } from '@/lib/web3/rpcFallback';

describe('selectRpcUrl', () => {
  it('falls back when primary is invalid', () => {
    expect(selectRpcUrl('', 'https://fallback.local')).toBe('https://fallback.local');
  });

  it('throws when both providers are missing', () => {
    expect(() => selectRpcUrl('', '')).toThrow(/Missing RPC URLs/);
  });
});
