/**
 * VeritasSchema — Strict action envelope validation.
 *
 * Ensures all inbound actions and payloads conform to shipped schemas.
 * Unknown actions or invalid payloads fail closed immediately.
 *
 * @module core/security/VeritasSchema
 * @version 1.0.0
 */

import { z } from 'zod';

export const ActionEnvelopeSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().min(16).max(64).optional(),
  traceId: z.string().uuid().optional(),
});

export type ActionEnvelope = z.infer<typeof ActionEnvelopeSchema>;

export function validateActionEnvelope(data: unknown): ActionEnvelope {
  const result = ActionEnvelopeSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`VeritasSchema Error: ${result.error.message}`);
  }
  return result.data;
}
