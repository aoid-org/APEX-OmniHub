/**
 * Semantic Translator
 * Translates canonical events to app-specific formats via LLM.
 *
 * Production implementation routes USO payloads through the BYOM proxy
 * for real translation. Includes forward+back verification to detect
 * hallucinated or corrupted translations (fail-closed).
 */

import { supabase } from '@/integrations/supabase/client';
import { CanonicalEvent } from '../types/canonical';

export interface TranslatedEvent {
  eventId: string;
  correlationId: string;
  appId: string;
  userId?: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface TranslationCache {
  [key: string]: string;
}

/**
 * Semantic translator for app-specific event formats.
 * Routes payloads through LLM for real translation with verification.
 */
export class SemanticTranslator {
  private translators = new Map<string, (event: CanonicalEvent) => TranslatedEvent>();
  private cache: TranslationCache = {};

  /**
   * Translate text via LLM (BYOM proxy / Supabase Edge Function).
   * Non-streaming: collects full response for verification.
   */
  private async translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session for translation');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/byom-proxy`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a precise translator. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text, nothing else. Do not add explanations, quotes, or formatting.`,
              },
              { role: 'user', content: text },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Translation request failed: ${response.status}`);
      }

      // Parse SSE stream to collect full response
      const translated = await this.collectSSEResponse(response);
      this.cache[cacheKey] = translated;
      return translated;
    } catch (error) {
      console.error('[SemanticTranslator] LLM translation failed:', error);
      throw error;
    }
  }

  /**
   * Collect full text from SSE stream response.
   */
  private async collectSSEResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) result += content;
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    }

    return result.trim();
  }

  /**
   * Back-translate text for verification.
   */
  private async backTranslateText(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    return this.translateText(text, sourceLang, targetLang);
  }

  async translate(
    events: CanonicalEvent[],
    appId: string,
    correlationId: string,
  ): Promise<TranslatedEvent[]> {
    console.log(`[${correlationId}] Translating ${events.length} events for app ${appId}`);

    // Check for registered app-specific translator first
    const appTranslator = this.translators.get(appId);
    if (appTranslator) {
      return events.map(event => appTranslator(event));
    }

    // Resolve target locale (default: fr-FR for USO)
    const targetLocale = 'fr-FR';
    const sourceLang = 'en';
    const targetLang = targetLocale.split('-')[0]; // 'fr'

    const results: TranslatedEvent[] = [];

    for (const event of events) {
      const originalPayload = JSON.stringify(event.payload);

      try {
        // 1. Forward Translate (en → target)
        const translatedPayload: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(event.payload)) {
          if (typeof val === 'string' && val.trim().length > 0) {
            translatedPayload[key] = await this.translateText(val, sourceLang, targetLang);
          } else {
            translatedPayload[key] = val;
          }
        }

        // 2. Back Translate for verification (target → en)
        const backTranslated: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(translatedPayload)) {
          if (typeof val === 'string' && val.trim().length > 0) {
            backTranslated[key] = await this.backTranslateText(val, targetLang, sourceLang);
          } else {
            backTranslated[key] = val;
          }
        }

        // 3. Semantic Equivalence Check
        // Compare normalized forms (lowercase, trimmed) since LLM back-translation
        // may not be character-identical but should be semantically equivalent
        const originalNorm = this.normalizeForComparison(event.payload);
        const backNorm = this.normalizeForComparison(backTranslated);

        if (originalNorm !== backNorm) {
          console.error(
            `[${correlationId}] Translation verification failed for event ${event.eventId}`,
          );
          // FAIL-CLOSED: Do not forward potentially corrupted / hallucinated content
          results.push({
            eventId: event.eventId,
            correlationId,
            appId,
            userId: event.userId,
            payload: {
              ...event.payload,
              _translation_status: 'FAILED',
              _error: 'Back-translation verification diverged',
            },
            metadata: {
              ...event.metadata,
              risk_lane: 'RED',
              audit_reason: 'translation_verification_failed',
            },
          });
          continue;
        }

        results.push({
          eventId: event.eventId,
          correlationId,
          appId,
          userId: event.userId,
          payload: translatedPayload,
          metadata: { ...event.metadata, locale: targetLocale, verified: true },
        });
      } catch (error) {
        // LLM call failure — fail-closed, return original with error tag
        console.error(
          `[${correlationId}] Translation error for event ${event.eventId}:`,
          error,
        );
        results.push({
          eventId: event.eventId,
          correlationId,
          appId,
          userId: event.userId,
          payload: {
            ...event.payload,
            _translation_status: 'ERROR',
            _error: error instanceof Error ? error.message : 'Translation service unavailable',
          },
          metadata: {
            ...event.metadata,
            risk_lane: 'YELLOW',
            audit_reason: 'translation_service_error',
          },
        });
      }
    }

    return results;
  }

  /**
   * Normalize payload values for semantic comparison.
   * Lowercases, trims whitespace, normalizes punctuation.
   */
  private normalizeForComparison(payload: Record<string, unknown>): string {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (typeof val === 'string') {
        normalized[key] = val.toLowerCase().trim().replace(/\s+/g, ' ');
      } else {
        normalized[key] = val;
      }
    }
    return JSON.stringify(normalized);
  }

  registerTranslator(appId: string, translator: (event: CanonicalEvent) => TranslatedEvent): void {
    this.translators.set(appId, translator);
  }

  unregisterTranslator(appId: string): boolean {
    return this.translators.delete(appId);
  }
}
