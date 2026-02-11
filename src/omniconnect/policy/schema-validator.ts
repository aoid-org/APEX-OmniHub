/**
 * Schema Validator for OmniConnect
 * Enforces payload structure for Canonical Events
 */

import { z } from 'zod';
import { EventType } from '../types/canonical';

export class SchemaValidator {
  // Define schemas for known event types
  private schemas: Partial<Record<EventType, z.ZodType<unknown>>> = {
    [EventType.MESSAGE]: z.object({
      content: z.string().min(1, "Message content is required"),
      senderId: z.string().min(1, "Sender ID is required"),
      conversationId: z.string().optional(),
      attachments: z.array(z.unknown()).optional(),
    }),
    [EventType.COMMENT]: z.object({
      text: z.string().min(1, "Comment text is required"),
      authorId: z.string().min(1, "Author ID is required"),
      targetId: z.string().min(1, "Target ID (post/comment) is required"),
      parentId: z.string().optional(), // For nested comments
    }),
    // POC: Add more schemas here as needed
  };

  /**
   * Validates the event payload against the schema for the given event type.
   * If no schema is defined for the event type, returns valid (allow-unknown).
   */
  validate(eventType: EventType, payload: unknown): { valid: boolean; errors: string[] } {
    const schema = this.schemas[eventType];

    // If no schema is defined, we assume it's valid (or at least we can't validate it)
    // In a strict "Zero Drift" environment, this might eventually default to false.
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const result = schema.safeParse(payload);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    // Format Zod errors into readable strings
    const errors = result.error.errors.map(e => {
      const path = e.path.join('.');
      return `Schema violation: '${path}' ${e.message}`;
    });

    return { valid: false, errors };
  }
}
