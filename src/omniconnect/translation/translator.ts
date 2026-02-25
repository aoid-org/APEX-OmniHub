/**
 * Semantic Translator
 * Translates canonical events to app-specific formats
 *
 * APEX REGRESSION SHIELD: Provides Zod runtime validation
 * against CanonicalEventSchema to prevent malformed payloads
 * from causing unhandled TypeErrors in the React state tree.
 */

import { CanonicalEvent } from '../types/canonical';
import { CanonicalEventSchema } from '../types/schema';

export interface TranslatedEvent {
  eventId: string;
  correlationId: string;
  appId: string;
  userId?: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * Extract raw payload/metadata safely from an untrusted event object.
 * Used when Zod validation fails and the event shape is unknown.
 */
function extractRawFields(event: CanonicalEvent): {
  rawPayload: Record<string, unknown>;
  rawMetadata: Record<string, unknown>;
} {
  const raw = event as unknown as Record<string, unknown>;
  const rawPayload =
    typeof raw['payload'] === 'object' && raw['payload'] !== null
      ? (raw['payload'] as Record<string, unknown>)
      : {};
  const rawMetadata =
    typeof raw['metadata'] === 'object' && raw['metadata'] !== null
      ? (raw['metadata'] as Record<string, unknown>)
      : {};
  return { rawPayload, rawMetadata };
}

/**
 * Build a DROPPED result when schema validation fails.
 */
function buildDroppedResult(
  event: CanonicalEvent,
  correlationId: string,
  appId: string,
  errorMessage: string
): TranslatedEvent {
  const { rawPayload, rawMetadata } = extractRawFields(event);
  return {
    eventId: event.eventId ? String(event.eventId) : 'unknown_event_id',
    correlationId,
    appId,
    userId: event.userId ? String(event.userId) : undefined,
    payload: {
      ...rawPayload,
      _translation_status: 'DROPPED',
      _error: 'Malformed Payload Schema',
      _details: errorMessage,
    },
    metadata: {
      ...rawMetadata,
      risk_lane: 'RED',
      audit_reason: 'schema_validation_failed',
    },
  };
}

/**
 * Semantic translator for app-specific event formats
 */
export class SemanticTranslator {
  private readonly translators = new Map<
    string,
    (event: CanonicalEvent) => TranslatedEvent
  >();

  // Deterministic "Translation" for validation purposes
  // In production, this would call a local AI model or cached dictionary
  private pseudoTranslate(text: unknown, targetLang: string): string {
    if (typeof text !== 'string') return String(text);
    return `[${targetLang}] ${text}`;
  }

  protected pseudoDetranslate(text: string, targetLang: string): string {
    const prefix = `[${targetLang}] `;
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length);
    }
    return text; // Failure to detranslate
  }

  async translate(
    events: CanonicalEvent[],
    appId: string,
    correlationId: string
  ): Promise<TranslatedEvent[]> {
    console.log(
      `[${correlationId}] Translating ${events.length} events for app ${appId}`
    );

    // Simulate target locale retrieval (mock)
    const targetLocale = 'fr-FR';

    return events.map((event) => {
      // 0. Payload Schema Validation (Zero-Drift Enforcement)
      const validation = CanonicalEventSchema.safeParse(event);
      if (!validation.success) {
        console.error(
          `[${correlationId}] Schema validation failed for event ${event.eventId || 'UNKNOWN'}`
        );
        return buildDroppedResult(
          event,
          correlationId,
          appId,
          validation.error.message
        );
      }

      const validEvent = validation.data;
      const originalPayload = JSON.stringify(validEvent.payload);

      // 1. Forward Translate
      const translatedPayload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(validEvent.payload)) {
        translatedPayload[key] = this.pseudoTranslate(val, targetLocale);
      }

      // 2. Verification (Back Translate)
      const backTranslated: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(translatedPayload)) {
        backTranslated[key] =
          typeof val === 'string'
            ? this.pseudoDetranslate(val, targetLocale)
            : val;
      }

      // 3. Equivalence Check
      const backTranslatedStr = JSON.stringify(backTranslated);
      if (originalPayload !== backTranslatedStr) {
        console.error(
          `[${correlationId}] Translation verification failed for event ${event.eventId}`
        );
        // FAIL-CLOSED: Tag as failed, do not forward corrupted content
        return {
          eventId: validEvent.eventId,
          correlationId,
          appId,
          userId: validEvent.userId,
          payload: {
            ...validEvent.payload,
            _translation_status: 'FAILED',
            _error: 'Verification failed',
          },
          metadata: {
            ...validEvent.metadata,
            risk_lane: 'RED',
            audit_reason: 'translation_verification_failed',
          },
        };
      }

      return {
        eventId: validEvent.eventId,
        correlationId,
        appId,
        userId: validEvent.userId,
        payload: translatedPayload,
        metadata: {
          ...validEvent.metadata,
          locale: targetLocale,
          verified: true,
        },
      };
    });
  }

  registerTranslator(
    appId: string,
    translator: (event: CanonicalEvent) => TranslatedEvent
  ): void {
    this.translators.set(appId, translator);
  }

  unregisterTranslator(appId: string): boolean {
    return this.translators.delete(appId);
  }
}