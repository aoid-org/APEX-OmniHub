import { describe, it, expect } from 'vitest';
import { SemanticTranslator } from '../src/omniconnect/translation/translator';
import { CanonicalEvent, EventType, DataClassification } from '../src/omniconnect/types/canonical';

describe('Final Closure Verification', () => {

    describe('F) MAESTRO_ENABLED Feature Flag', () => {
        it('should respect the feature flag state', () => {
            const isMaestroEnabled = (env: Record<string, string>) => {
                return (env.VITE_MAESTRO_ENABLED ?? '').toLowerCase() === 'true';
            };

            expect(isMaestroEnabled({ VITE_MAESTRO_ENABLED: 'true' })).toBe(true);
            expect(isMaestroEnabled({ VITE_MAESTRO_ENABLED: 'false' })).toBe(false);
            expect(isMaestroEnabled({})).toBe(false);
            expect(isMaestroEnabled({ VITE_MAESTRO_ENABLED: 'TRUE' })).toBe(true);
        });
    });

    describe('E) Cross-Lingual Retrieval Equivalence', () => {
        const translator = new SemanticTranslator();
        const correlationId = 'test-closure-corr';
        const appId = 'closure-app';

        it('should maintain semantic consistency across locales', async () => {
            // 1. Define a "Canonical Concept" with FR location metadata
            const originalEvent: CanonicalEvent = {
                eventId: 'evt-clos-1',
                correlationId: correlationId,
                tenantId: 'tenant-1',
                userId: 'user-1',
                source: 'test',
                provider: 'manual',
                externalId: 'ext-clos-1',
                classification: DataClassification.INTERNAL,
                eventType: EventType.CONTENT_PUBLISHED,
                timestamp: new Date().toISOString(),
                consentFlags: {},
                metadata: { location: { countryCode: 'FR' } },
                payload: { concept: 'Appointment' },
            };

            // 2. Translate to Target Locale (FR via location metadata)
            const [translated] = await translator.translate([originalEvent], appId, correlationId);

            expect(translated.payload.concept).toBe('[fr] Appointment');

            // 3. Generic extractor strips any locale prefix
            const extractConcept = (text: unknown) =>
                typeof text === 'string' ? text.replace(/^\[[^\]]+\]\s*/, '') : text;

            const retrievedConcept = extractConcept(translated.payload.concept);
            expect(retrievedConcept).toBe('Appointment');
            expect(retrievedConcept).toBe(originalEvent.payload.concept);
        });
    });
});
