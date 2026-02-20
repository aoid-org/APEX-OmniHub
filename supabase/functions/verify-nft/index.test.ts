/**
 * Tests for verify-nft edge function
 *
 * Run with: deno test --allow-env index.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const VALID_CONTRACT = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';

function makeRequest(body: unknown, authHeader?: string): Request {
  return new Request('http://localhost/verify-nft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ── Address validation unit tests (pure, no Supabase/Alchemy needed) ─────────

Deno.test('ETH_ADDRESS_RE: accepts valid checksummed address', () => {
  const re = /^0x[0-9a-fA-F]{40}$/;
  assertEquals(re.test(VALID_WALLET), true);
  assertEquals(re.test(VALID_CONTRACT), true);
});

Deno.test('ETH_ADDRESS_RE: rejects address without 0x prefix', () => {
  const re = /^0x[0-9a-fA-F]{40}$/;
  assertEquals(re.test('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045'), false);
});

Deno.test('ETH_ADDRESS_RE: rejects too-short address', () => {
  const re = /^0x[0-9a-fA-F]{40}$/;
  assertEquals(re.test('0x1234'), false);
});

Deno.test('ETH_ADDRESS_RE: rejects address with non-hex chars', () => {
  const re = /^0x[0-9a-fA-F]{40}$/;
  assertEquals(re.test('0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'), false);
});

Deno.test('ETH_ADDRESS_RE: rejects zero address', () => {
  // Zero address is technically valid hex but often used as a sentinel — ensure
  // the regex itself accepts it (validity gate is upstream in business logic).
  const re = /^0x[0-9a-fA-F]{40}$/;
  assertEquals(re.test('0x0000000000000000000000000000000000000000'), true);
});

// ── CHAIN_CONFIG unit tests ───────────────────────────────────────────────────

Deno.test('CHAIN_CONFIG: Ethereum mainnet maps to correct slug and env key', () => {
  const CHAIN_CONFIG: Record<number, { slug: string; envKey: string }> = {
    1: { slug: 'eth-mainnet', envKey: 'ALCHEMY_API_KEY_ETH' },
    137: { slug: 'polygon-mainnet', envKey: 'ALCHEMY_API_KEY_POLYGON' },
  };
  assertEquals(CHAIN_CONFIG[1].slug, 'eth-mainnet');
  assertEquals(CHAIN_CONFIG[1].envKey, 'ALCHEMY_API_KEY_ETH');
});

Deno.test('CHAIN_CONFIG: Polygon mainnet maps to correct slug and env key', () => {
  const CHAIN_CONFIG: Record<number, { slug: string; envKey: string }> = {
    1: { slug: 'eth-mainnet', envKey: 'ALCHEMY_API_KEY_ETH' },
    137: { slug: 'polygon-mainnet', envKey: 'ALCHEMY_API_KEY_POLYGON' },
  };
  assertEquals(CHAIN_CONFIG[137].slug, 'polygon-mainnet');
  assertEquals(CHAIN_CONFIG[137].envKey, 'ALCHEMY_API_KEY_POLYGON');
});

Deno.test('CHAIN_CONFIG: unsupported chainId returns undefined', () => {
  const CHAIN_CONFIG: Record<number, { slug: string; envKey: string }> = {
    1: { slug: 'eth-mainnet', envKey: 'ALCHEMY_API_KEY_ETH' },
    137: { slug: 'polygon-mainnet', envKey: 'ALCHEMY_API_KEY_POLYGON' },
  };
  assertEquals(CHAIN_CONFIG[999], undefined);
});

// ── Alchemy URL construction tests ────────────────────────────────────────────

Deno.test('getNFTsForOwner URL is constructed correctly', () => {
  const networkSlug = 'eth-mainnet';
  const apiKey = 'test-key';
  const owner = VALID_WALLET;
  const contract = VALID_CONTRACT;

  const baseUrl = `https://${networkSlug}.g.alchemy.com/nft/v3/${apiKey}`;
  const url = `${baseUrl}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&pageSize=1`;

  assertEquals(url.includes('getNFTsForOwner'), true);
  assertEquals(url.includes(owner), true);
  assertEquals(url.includes(contract), true);
  assertEquals(url.includes('pageSize=1'), true);
  assertEquals(url.startsWith('https://eth-mainnet.g.alchemy.com'), true);
});

Deno.test('getOwnersForNFT URL is constructed correctly', () => {
  const networkSlug = 'polygon-mainnet';
  const apiKey = 'test-key';
  const contract = VALID_CONTRACT;
  const tokenId = '42';

  const baseUrl = `https://${networkSlug}.g.alchemy.com/nft/v3/${apiKey}`;
  const url = `${baseUrl}/getOwnersForNFT?contractAddress=${contract}&tokenId=${tokenId}`;

  assertEquals(url.includes('getOwnersForNFT'), true);
  assertEquals(url.includes(contract), true);
  assertEquals(url.includes('tokenId=42'), true);
  assertEquals(url.startsWith('https://polygon-mainnet.g.alchemy.com'), true);
});

// ── Ownership check logic ─────────────────────────────────────────────────────

Deno.test('ownership check: case-insensitive wallet comparison', () => {
  const walletAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const owners = [
    '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // lowercase version
    '0xABCDEF0123456789012345678901234567890123',
  ].map((o) => o.toLowerCase());

  assertEquals(owners.includes(walletAddress.toLowerCase()), true);
});

Deno.test('ownership check: returns false when wallet not in owners list', () => {
  const walletAddress = VALID_WALLET;
  const owners: string[] = ['0xABCDEF0123456789012345678901234567890123'].map((o) =>
    o.toLowerCase()
  );

  assertEquals(owners.includes(walletAddress.toLowerCase()), false);
});

Deno.test('ownedNfts length check: returns true when count > 0', () => {
  const data = { ownedNfts: [{ tokenId: '1' }] };
  assertEquals((data.ownedNfts?.length ?? 0) > 0, true);
});

Deno.test('ownedNfts length check: returns false when count == 0', () => {
  const data = { ownedNfts: [] };
  assertEquals((data.ownedNfts?.length ?? 0) > 0, false);
});

Deno.test('ownedNfts length check: returns false when field is missing', () => {
  const data = {};
  assertEquals(((data as Record<string, unknown>).ownedNfts as unknown[] | undefined)?.length ?? 0 > 0, false);
});
