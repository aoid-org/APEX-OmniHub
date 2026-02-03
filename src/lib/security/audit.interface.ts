/* VALUATION_IMPACT: Defines enforceable audit entries for compliance reviews */
/* Generated: 2026-02-03 */
import { z } from 'zod';

const AuditMetadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT'
}

export interface AuditEntry {
  /** Actor UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx). */
  actorId: string;
  /** Action performed on the resource. */
  action: AuditAction;
  /** Resource identifier (format: "resourceType:uuid", e.g., "workflow:550e8400-e29b-41d4-a716-446655440000"). */
  resourceId: string;
  /** ISO 8601 timestamp with timezone. */
  timestamp: Date;
  /** Metadata validated against AuditMetadataSchema. */
  metadata: z.infer<typeof AuditMetadataSchema>;
  /** Risk level: 0=Info, 1=Low, 2=Medium, 3=High, 4=Critical. */
  riskScore: 0 | 1 | 2 | 3 | 4;
}

export function isValidAuditEntry(entry: unknown): entry is AuditEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const target = entry as Record<string, unknown>;
  if (typeof target.actorId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target.actorId)) {
    return false;
  }
  if (typeof target.resourceId !== 'string' || !/^.+:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.resourceId)) {
    return false;
  }
  if (!(target.timestamp instanceof Date)) {
    return false;
  }
  if (!Object.values(AuditAction).includes(target.action as AuditAction)) {
    return false;
  }
  if (!AuditMetadataSchema.safeParse(target.metadata).success) {
    return false;
  }
  if (![0, 1, 2, 3, 4].includes(target.riskScore as number)) {
    return false;
  }
  return true;
}
