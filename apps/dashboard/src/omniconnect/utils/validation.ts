/**
 * Validation utilities for OmniConnect
 */

import { CanonicalEvent, EventType } from '../types/canonical';
import { SessionToken } from '../types/connector';

export function validateCanonicalEvent(event: unknown): event is CanonicalEvent {
  if (!event || typeof event !== 'object') return false;

  const e = event as Record<string, unknown>;

  // Required fields
  if (!e.eventId || typeof e.eventId !== 'string') return false;
  if (!e.correlationId || typeof e.correlationId !== 'string') return false;
  if (!e.tenantId || typeof e.tenantId !== 'string') return false;
  if (!e.userId || typeof e.userId !== 'string') return false;
  if (!e.source || typeof e.source !== 'string') return false;
  if (!e.provider || typeof e.provider !== 'string') return false;
  if (!e.eventType || !Object.values(EventType).includes(e.eventType as EventType)) return false;
  if (!e.timestamp || typeof e.timestamp !== 'string') return false;

  // Optional fields with validation
  if (e.metadata && typeof e.metadata !== 'object') return false;
  if (e.payload && typeof e.payload !== 'object') return false;

  return true;
}

export function validateSessionToken(token: unknown): token is SessionToken {
  if (!token || typeof token !== 'object') return false;

  const t = token as Record<string, unknown>;

  if (!t.token || typeof t.token !== 'string') return false;
  if (!t.connectorId || typeof t.connectorId !== 'string') return false;
  if (!t.userId || typeof t.userId !== 'string') return false;
  if (!t.tenantId || typeof t.tenantId !== 'string') return false;
  if (!t.provider || typeof t.provider !== 'string') return false;
  if (!Array.isArray(t.scopes)) return false;

  // expiresAt should be a Date or valid date string
  if (!(t.expiresAt instanceof Date) && typeof t.expiresAt !== 'string') return false;

  return true;
}

export function sanitizeEventPayload(payload: Record<string, unknown>): Record<string, unknown> {
  // TODO: Implement PII redaction and content sanitization
  return payload;
}

export function validateCorrelationId(id: string): boolean {
  // OmniConnect correlation IDs start with 'oc-'
  return id.startsWith('oc-') && id.length >= 39; // 'oc-' + UUID
}

export function validateTenantId(tenantId: string): boolean {
  // Basic validation - should be non-empty string
  return typeof tenantId === 'string' && tenantId.length > 0 && tenantId.length <= 100;
}

export function validateUserId(userId: string): boolean {
  // Basic validation - should be non-empty string
  return typeof userId === 'string' && userId.length > 0 && userId.length <= 100;
}