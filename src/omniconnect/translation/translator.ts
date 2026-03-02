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
import { type LangCode } from '@/i18n/locales';
import {
  type BridgePayload,
  validateBridgePayload,
  BridgeParseError,
} from '../bridge/acl';

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
 * Normalize a raw locale string (trim whitespace, replace _ with -).
 */
function normalizeLocale(l: string): string {
  return l.trim().replaceAll('_', '-');
}

/**
 * Map a two-letter country code to an ISO-639-1 language code.
 * Only well-known mappings are returned; unknown codes yield null.
 */
function countryCodeToLang(cc: string): string | null {
  const map: Record<string, string> = {
    FR: 'fr', DE: 'de', ES: 'es', JP: 'ja', PT: 'pt', CN: 'zh',
    BR: 'pt', MX: 'es', AT: 'de', CH: 'de', BE: 'fr', CA: 'en',
    US: 'en', GB: 'en', AU: 'en',
  };
  return map[cc.trim().toUpperCase()] ?? null;
}

/**
 * Resolve target locale from event metadata.
 *
 * Priority:
 *  1. metadata.locale (explicit BCP-47 tag → base lang extracted)
 *  2. metadata.location.countryCode → mapped language
 *  3. metadata.countryCode → mapped language
 *  4. Fallback: 'en'
 */
function resolveTargetLocale(event: CanonicalEvent): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const md = (event as any).metadata ?? {};
  const explicit = md['locale'];
  if (typeof explicit === 'string' && explicit.trim()) {
    // Extract base language from BCP-47 (e.g. 'fr-FR' → 'fr')
    return normalizeLocale(explicit).split('-')[0].toLowerCase();
  }

  const loc = md['location'];
  let cc = '';
  if (typeof loc === 'object' && loc !== null && typeof loc.countryCode === 'string') {
    cc = String(loc.countryCode);
  } else if (typeof md['countryCode'] === 'string') {
    cc = String(md['countryCode']);
  }

  return (cc ? countryCodeToLang(cc) : null) ?? 'en';
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
    correlationId: string,
    _targetLocale: LangCode = 'en'
  ): Promise<TranslatedEvent[]> {
    if (import.meta.env.DEV) console.log(`[${correlationId}] Translating ${events.length} events for app ${appId}`);

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

      // Resolve locale from event metadata; defaults to 'en'
      const targetLocale = resolveTargetLocale(event);

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

  // ── Bridge: Web3 hex → BridgePayload ──────────────────────────────────────

  /**
   * Translate a raw Web3 transaction receipt to a validated BridgePayload.
   *
   * Maps hex value to SETTLED, or to MAN_MODE_LOCKDOWN when value is zero.
   * All IDs: crypto.randomUUID(). Finance output: integer string → .toFixed(2).
   *
   * @param receipt - Raw Web3 transaction receipt object
   * @param correlId - Optional correlation ID for tracing
   * @returns Validated BridgePayload
   * @throws BridgeParseError if the constructed payload fails schema validation
   */
  translateWeb3Receipt(
    receipt: Record<string, unknown>,
    correlId?: string,
  ): BridgePayload {
    const id = correlId ?? crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const status = typeof receipt['status'] === 'string' ? receipt['status'] : '0x0';
    const rawValue = typeof receipt['value'] === 'string' ? receipt['value'] : '0x0';
    const txHash = typeof receipt['hash'] === 'string' ? receipt['hash'] : undefined;

    const isSuccess = status === '0x1' || status === '1' || status.toLowerCase() === 'true';
    const valueWei = BigInt(rawValue);
    const valueEth = Number(valueWei) / 1e18;
    const discrepancy = isSuccess && valueWei > 0n ? '0.00' : valueEth.toFixed(2);

    let raw: Record<string, unknown>;

    if (isSuccess && valueWei > 0n) {
      raw = {
        action: 'SETTLED',
        discrepancy: '0.00',
        source: 'WEB3',
        timestamp,
        txHash,
      };
    } else {
      raw = {
        action: 'MAN_MODE_LOCKDOWN',
        discrepancy,
        source: 'WEB3',
        timestamp,
        txHash,
        anomaly: `WEB3_ZERO_VALUE: transaction value is ${discrepancy} ETH`,
      };
    }

    return validateBridgePayload(raw, id);
  }

  // ── Bridge: ERP XML → BridgePayload ───────────────────────────────────────

  /**
   * Translate an ERP XML string to a validated BridgePayload.
   *
   * Compares invoice total vs line-item sum using integer-cent arithmetic.
   * RECONCILED when delta is zero; MAN_MODE_LOCKDOWN when delta ≠ zero.
   *
   * @param xmlString - Raw ERP XML document string
   * @param erpRef    - ERP reference identifier for tracing
   * @param correlId  - Optional correlation ID
   * @returns Validated BridgePayload
   * @throws BridgeParseError on schema validation failure
   * @throws Error if DOM parser is unavailable
   */
  translateErpXml(
    xmlString: string,
    erpRef?: string,
    correlId?: string,
  ): BridgePayload {
    const id = correlId ?? crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new BridgeParseError(
        'ERP_XML: XML parse error',
        [{
          code: 'custom',
          path: ['xmlString'],
          message: 'XML document could not be parsed',
        }],
        id,
      );
    }

    const invoiceTotal = this.extractXmlDecimalCents(doc, 'total');
    const lineItemTotal = this.extractLineItemsCents(doc);

    const deltaCents = Math.abs(invoiceTotal - lineItemTotal);
    const deltaStr = (deltaCents / 100).toFixed(2);
    const isReconciled = deltaCents === 0;

    let raw: Record<string, unknown>;

    if (isReconciled) {
      raw = {
        action: 'RECONCILED',
        discrepancy: '0.00',
        source: 'ERP',
        timestamp,
        erpRef,
      };
    } else {
      const lineFormatted = (lineItemTotal / 100).toFixed(2);
      const totalFormatted = (invoiceTotal / 100).toFixed(2);
      raw = {
        action: 'MAN_MODE_LOCKDOWN',
        discrepancy: deltaStr,
        source: 'ERP',
        timestamp,
        erpRef,
        anomaly: `ERP_MISMATCH: lineItems $${lineFormatted} \u2260 total $${totalFormatted}`,
      };
    }

    return validateBridgePayload(raw, id);
  }

  /** Extract a decimal field from XML and convert to integer cents. */
  private extractXmlDecimalCents(doc: Document, tagName: string): number {
    const el = doc.querySelector(tagName);
    if (!el?.textContent) return 0;
    const parsed = Number.parseFloat(el.textContent.trim());
    if (Number.isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }

  /** Sum all lineItems total attributes from XML and return integer cents. */
  private extractLineItemsCents(doc: Document): number {
    const lineItemsEl = doc.querySelector('lineItems');
    if (!lineItemsEl) return 0;

    const totalAttr = lineItemsEl.getAttribute('total');
    if (totalAttr) {
      const parsed = Number.parseFloat(totalAttr);
      if (!Number.isNaN(parsed)) return Math.round(parsed * 100);
    }

    // Fall back: sum all <item total="..."> children
    let sumCents = 0;
    for (const item of Array.from(lineItemsEl.querySelectorAll('item'))) {
      const val = item.getAttribute('total') ?? item.querySelector('total')?.textContent ?? '0';
      const parsed = Number.parseFloat(val.trim());
      if (!Number.isNaN(parsed)) {
        sumCents += Math.round(parsed * 100);
      }
    }
    return sumCents;
  }
}