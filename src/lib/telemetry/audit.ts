/**
 * APEX-OmniHub - Audit Logging
 * Append-only behavior, isolated from standard diagnostic logs.
 */

import { redactId } from './tracer';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  actorId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Simulated append-only secure storage
const auditLedger: AuditEvent[] = [];

/**
 * Redacts nested PII or sensitive keys from metadata objects
 */
function redactMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...meta };
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'ssn', 'credit_card'];
  
  for (const k of Object.keys(redacted)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      redacted[k] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * Emits an append-only audit event
 */
export function logAuditEvent(
  actorId: string | undefined,
  tenantId: string | undefined,
  action: string,
  resource: string,
  status: AuditEvent['status'],
  reason?: string,
  metadata?: Record<string, unknown>
): void {
  const event: AuditEvent = {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    actorId: redactId(actorId),
    tenantId: redactId(tenantId),
    action,
    resource,
    status,
    reason,
    metadata: metadata ? redactMetadata(metadata) : undefined
  };

  // In a real environment, this would write to a WORM (Write Once Read Many) 
  // datastore or a dedicated SIEM ingestion point.
  auditLedger.push(event);
}

export function getAuditLedger(): AuditEvent[] {
  return [...auditLedger]; // return copy to prevent mutation
}

export function clearAuditLedgerForTests(): void {
  auditLedger.length = 0;
}
