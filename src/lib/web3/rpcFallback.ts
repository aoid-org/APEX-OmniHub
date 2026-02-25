export const TX_CONFIRMATIONS = 12;

export function selectRpcUrl(primary?: string, fallback?: string): string {
  if (primary && primary.trim().length > 0) return primary;
  if (fallback && fallback.trim().length > 0) return fallback;
  throw new Error("Missing RPC URLs: set ALCHEMY_RPC_URL and/or INFURA_RPC_URL");
}
