import { z } from 'zod';
import { EventType, DataClassification, ConsentType } from './canonical';

export const ConsentFlagsSchema = z.object({
  [ConsentType.ANALYTICS]: z.boolean().optional(),
  [ConsentType.MARKETING]: z.boolean().optional(),
  [ConsentType.PERSONALIZATION]: z.boolean().optional(),
  [ConsentType.THIRD_PARTY_SHARING]: z.boolean().optional(),
  explicit_opt_in: z.boolean().optional(),
});

export const CanonicalEventSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  correlationId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  provider: z.string().min(1, "provider is required"),
  externalId: z.string().min(1).optional(),
  eventType: z.nativeEnum(EventType).optional(),
  classification: z.nativeEnum(DataClassification).optional(),
  timestamp: z.string().min(1, "timestamp is required"),
  consentFlags: ConsentFlagsSchema.optional(),
  metadata: z.record(z.string(), z.unknown()),
  payload: z.record(z.string(), z.unknown()),
});

export const EventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  correlationId: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  eventType: z.nativeEnum(EventType),
  payload: CanonicalEventSchema,
  timestamp: z.string().min(1),
  schemaVersion: z.string().min(1),
});
