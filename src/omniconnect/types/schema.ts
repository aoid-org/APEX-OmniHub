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
  correlationId: z.string().min(1, "correlationId is required"),
  tenantId: z.string().min(1, "tenantId is required"),
  userId: z.string().min(1, "userId is required"),
  source: z.string().min(1, "source is required"),
  provider: z.string().min(1, "provider is required"),
  externalId: z.string().min(1, "externalId is required"),
  eventType: z.nativeEnum(EventType),
  classification: z.nativeEnum(DataClassification),
  timestamp: z.string().min(1, "timestamp is required"),
  consentFlags: ConsentFlagsSchema,
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
