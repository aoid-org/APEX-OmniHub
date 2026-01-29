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
  // crypto.randomUUID() is available in all modern runtimes (Node 19+, all browsers)
  return crypto.randomUUID();
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