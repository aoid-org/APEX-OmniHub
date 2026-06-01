import { describe, it, expect, vi } from 'vitest';
import { SemanticTranslator } from '../src/omniconnect/translation/translator';
import { CanonicalEvent, DataClassification, EventType } from '../src/omniconnect/types/canonical';

describe('Universal Translation Engine (UTE)', () => {
    const translator = new SemanticTranslator();
    const correlationId = 'test-corr-123';
    const appId = 'test-app';

    it('1. Translation Verification (Success)', async () => {
        const events: CanonicalEvent[] = [{
            eventId: 'evt-1',
            correlationId, tenantId: 't', userId: 'u', source: 'test',
            externalId: 'x1', classification: DataClassification.INTERNAL,
            eventType: EventType.CONTENT_PUBLISHED, consentFlags: {},
            payload: { message: 'Hello World' },
            provider: 'test',
            timestamp: new Date().toISOString(),
            metadata: {}
        }];

        const result = await translator.translate(events, appId, correlationId);

        // No location metadata → defaults to 'en'
        expect(result[0].payload.message).toBe('[en] Hello World');
        expect(result[0].metadata.verified).toBe(true);
        expect(result[0].metadata.locale).toBe('en');
    });

    it('Localizes by location when provided', async () => {
        const events: CanonicalEvent[] = [{
            eventId: 'evt-loc-1',
            correlationId, tenantId: 't', userId: 'u', source: 'test',
            externalId: 'x-loc', classification: DataClassification.INTERNAL,
            eventType: EventType.CONTENT_PUBLISHED, consentFlags: {},
            payload: { message: 'Hello World' },
            provider: 'test',
            timestamp: new Date().toISOString(),
            metadata: { location: { countryCode: 'FR' } }
        }];

        const result = await translator.translate(events, appId, correlationId);

        expect(result[0].payload.message).toBe('[fr] Hello World');
        expect(result[0].metadata.verified).toBe(true);
        expect(result[0].metadata.locale).toBe('fr');
    });

    it('2. Fail-Closed on Verification Failure (Simulated)', async () => {
        class BrokenTranslator extends SemanticTranslator {
            protected detranslateValue(_text: unknown, _targetLang: string): unknown {
                return "Corrupted Text"; // Simulates hallucination/drift
            }
        }

        const brokenTranslator = new BrokenTranslator();
        const events: CanonicalEvent[] = [{
            eventId: 'evt-2',
            correlationId, tenantId: 't', userId: 'u', source: 'test',
            externalId: 'x2', classification: DataClassification.INTERNAL,
            eventType: EventType.CONTENT_PUBLISHED, consentFlags: {},
            payload: { message: 'Critical Info' },
            provider: 'test',
            timestamp: new Date().toISOString(),
            metadata: {}
        }];

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const result = await brokenTranslator.translate(events, appId, correlationId);

            expect(result[0].payload._translation_status).toBe('FAILED');
            expect(result[0].metadata.risk_lane).toBe('RED');
        } finally {
            consoleErrorSpy.mockRestore();
            consoleWarnSpy.mockRestore();
        }
    });

    it('3. Cross-Lingual Consistency', async () => {
        const events: CanonicalEvent[] = [{
            eventId: 'evt-3',
            correlationId, tenantId: 't', userId: 'u', source: 'test',
            externalId: 'x3', classification: DataClassification.INTERNAL,
            eventType: EventType.CONTENT_PUBLISHED, consentFlags: {},
            payload: { key: 'Concept' },
            provider: 'test',
            timestamp: new Date().toISOString(),
            metadata: {}
        }];

        const result = await translator.translate(events, appId, correlationId);
        // No location → defaults to 'en'
        expect(result[0].payload.key).toBe('[en] Concept');
    });
});
