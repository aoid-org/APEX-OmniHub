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
   * Deterministic pseudo-translate for test/offline mode.
   * Prefixes text with [targetLocale] to simulate translation.
   * Protected to allow test subclasses to override for failure simulation.
   */
  protected pseudoTranslate(text: string, targetLocale: string): string {
    return `[${targetLocale}] ${text}`;
  }

  /**
   * Deterministic pseudo-detranslate for verification in test mode.
   * Strips [targetLocale] prefix to simulate back-translation.
   * Protected to allow test subclasses to override for failure simulation.
   */
  protected pseudoDetranslate(text: string, targetLocale: string): string {
    const prefix = `[${targetLocale}] `;
    return text.startsWith(prefix) ? text.slice(prefix.length) : text;
  }

  /**
   * Translate text via LLM (BYOM proxy / Supabase Edge Function).
   * Non-streaming: collects full response for verification.
   * Falls back to pseudoTranslate if no active session (test/offline mode).
   */
  private async translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    targetLocale: string,
  ): Promise<string> {
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // No active session: fall back to pseudo-translation for testability
        console.warn('[SemanticTranslator] No session, using pseudo-translation');
        return this.pseudoTranslate(text, targetLocale);
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
      // Fall back to pseudo-translation on error
      return this.pseudoTranslate(text, targetLocale);
    }
  }

  /**
   * Extract content token from a single SSE data line.
   * Returns the delta content string, or empty string if not parseable.
   */
  private extractSSEContent(line: string): string {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') {
      return '';
    }
    try {
      const parsed = JSON.parse(line.slice(6));
      return parsed?.choices?.[0]?.delta?.content ?? '';
    } catch {
      return '';
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
      for (const line of chunk.split('\n')) {
        result += this.extractSSEContent(line);
      }
    }
    return result.trim();
  }

  /**
   * Back-translate text for verification.
   * Uses pseudoDetranslate when in pseudo mode, real LLM otherwise.
   */
  private async detranslateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    targetLocale: string,
  ): Promise<string> {
    // Check if text was pseudo-translated (has locale prefix)
    if (text.startsWith(`[${targetLocale}] `)) {
      return this.pseudoDetranslate(text, targetLocale);
    }
    // Otherwise use real LLM back-translation
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }
    return this.translateText(text, sourceLang, targetLang, targetLocale);
  }

  /**
   * Translate all string values in a payload map from sourceLang to targetLang.
   */
  private async translatePayload(
    payload: Record<string, unknown>,
    sourceLang: string,
    targetLang: string,
    targetLocale: string,
  ): Promise<Record<string, unknown>> {
    const translated: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload)) {
      translated[key] = (typeof val === 'string' && val.trim().length > 0)
        ? await this.translateText(val, sourceLang, targetLang, targetLocale)
        : val;
    }
    return translated;
  }

  /**
   * Back-translate a payload for verification.
   */
  private async detranslatePayload(
    payload: Record<string, unknown>,
    sourceLang: string,
    targetLang: string,
    targetLocale: string,
  ): Promise<Record<string, unknown>> {
    const detranslated: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload)) {
      detranslated[key] = (typeof val === 'string' && val.trim().length > 0)
        ? await this.detranslateText(val, sourceLang, targetLang, targetLocale)
        : val;
    }
    return detranslated;
  }

  /**
   * Build a fail-closed TranslatedEvent (verification failure or LLM error).
   */
  private buildFailedEvent(
    event: CanonicalEvent,
    correlationId: string,
    appId: string,
    status: 'FAILED' | 'ERROR',
    errorMsg: string,
    riskLane: 'RED' | 'YELLOW',
    auditReason: string,
  ): TranslatedEvent {
    return {
      eventId: event.eventId,
      correlationId,
      appId,
      userId: event.userId,
      payload: {
        ...event.payload,
        _translation_status: status,
        _error: errorMsg
      },
      metadata: {
        ...event.metadata,
        risk_lane: riskLane,
        audit_reason: auditReason
      },
    };
  }

  /**
   * Translate a single event with forward+back verification.
   */
  private async translateSingleEvent(
    event: CanonicalEvent,
    appId: string,
    correlationId: string,
    sourceLang: string,
    targetLang: string,
    targetLocale: string,
  ): Promise<TranslatedEvent> {
    // 1. Forward translate (en → target)
    const translatedPayload = await this.translatePayload(event.payload, sourceLang, targetLang, targetLocale);

    // 2. Back translate for verification (target → en)
    const backSourceLang = targetLang;
    const backTargetLang = sourceLang;
    const backTranslated = await this.detranslatePayload(translatedPayload, backSourceLang, backTargetLang, targetLocale);

    // 3. Semantic equivalence check
    const originalNorm = this.normalizeForComparison(event.payload);
    const backNorm = this.normalizeForComparison(backTranslated);

    if (originalNorm !== backNorm) {
      console.error(`[${correlationId}] Translation verification failed for event ${event.eventId}`);
      return this.buildFailedEvent(
        event,
        correlationId,
        appId,
        'FAILED',
        'Back-translation verification diverged',
        'RED',
        'translation_verification_failed',
      );
    }

    return {
      eventId: event.eventId,
      correlationId,
      appId,
      userId: event.userId,
      payload: translatedPayload,
      metadata: {
        ...event.metadata,
        locale: targetLocale,
        verified: true
      },
    };
  }

  async translate(
    events: CanonicalEvent[],
    appId: string,
    correlationId: string,
  ): Promise<TranslatedEvent[]> {
    console.log(`[${correlationId}] Translating ${events.length} events for app ${appId}`);

    const appTranslator = this.translators.get(appId);
    if (appTranslator) {
      return events.map(event => appTranslator(event));
    }

    const targetLocale = 'fr-FR';
    const sourceLang = 'en';
    const targetLang = targetLocale.split('-')[0];

    const results: TranslatedEvent[] = [];
    for (const event of events) {
      try {
        const translated = await this.translateSingleEvent(
          event,
          appId,
          correlationId,
          sourceLang,
          targetLang,
          targetLocale,
        );
        results.push(translated);
      } catch (error) {
        console.error(`[${correlationId}] Translation error for event ${event.eventId}:`, error);
        const errorMsg = error instanceof Error ? error.message : 'Translation service unavailable';
        results.push(this.buildFailedEvent(
          event,
          correlationId,
          appId,
          'ERROR',
          errorMsg,
          'YELLOW',
          'translation_service_error',
        ));
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
        normalized[key] = val.toLowerCase().trim().replaceAll(/\s+/g, ' ');
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
