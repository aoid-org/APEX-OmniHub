/**
 * Correlation ID utilities for end-to-end tracing
 */

export function generateCorrelationId(): string {
  // Use Web Crypto API for UUID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `oc-${crypto.randomUUID()}`;
  }

  // Fallback for environments without crypto.randomUUID
  return `oc-${generateFallbackUUID()}`;
}

function generateFallbackUUID(): string {
  // Strong crypto-based UUID v4 implementation (Sonar S2245)
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Set version (4) and variant bits
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

  // Convert to UUID string format
  const hex = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function isValidCorrelationId(id: string): boolean {
  // OmniConnect correlation IDs start with 'oc-'
  return id.startsWith('oc-') && id.length === 39; // 'oc-' + 36 char UUID
}

export function extractCorrelationId(state: string): string | null {
  // State format: correlationId.timestamp.nonce
  const parts = state.split('.');
  if (parts.length >= 1) {
    const correlationId = parts[0];
    return isValidCorrelationId(correlationId) ? correlationId : null;
  }
  return null;
}