import { useState } from 'react';
import { ModuleShell } from './ModuleShell';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@/i18n/locales';

interface Props {
  readonly onClose: () => void;
}

export default function TranslationModule({ onClose }: Props) {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('fr-FR');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    
    setIsTranslating(true);
    try {
      // Create a pseudo-event for the translation endpoint
      let payloadObj = {};
      let isJson = false;
      try {
        payloadObj = JSON.parse(sourceText);
        isJson = true;
      } catch {
        payloadObj = { text: sourceText };
      }

      const event = {
        eventId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
        tenantId: 'local',
        userId: 'local',
        source: 'TranslationModule',
        provider: 'omnihub',
        externalId: crypto.randomUUID(),
        eventType: 'SEMANTIC_TRANSLATION_REQUEST',
        classification: 1,
        timestamp: new Date().toISOString(),
        consentFlags: {},
        metadata: { locale: targetLang },
        payload: payloadObj
      };

      // We'll simulate a call to the translator here, or we can use SemanticTranslator directly if it's accessible.
      // Since it's in src/omniconnect, which is a different app, we might need to import it or simulate the API call.
      // We will import SemanticTranslator.
      const { SemanticTranslator } = await import('@/../../../src/omniconnect/translation/translator');
      const translator = new SemanticTranslator();
      const results = await translator.translate([event], 'omnihub-site', event.correlationId);
      
      const result = results[0];
      if (result.payload._translation_status === 'DROPPED' || result.payload._translation_status === 'FAILED') {
        setTranslatedText(JSON.stringify(result.payload, null, 2));
      } else {
        if (isJson) {
          setTranslatedText(JSON.stringify(result.payload, null, 2));
        } else {
          setTranslatedText(String(result.payload.text));
        }
      }
      setMetadata({
        provider: 'Local Deterministic Provider',
        sourceLocale: 'auto',
        targetLocale: targetLang,
        verified: result.metadata.verified
      });
    } catch (err) {
      console.error(err);
      setTranslatedText('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const mockState = {
    moduleKey: 'translation',
    title: t('translation.title', 'Semantic Translation'),
    description: '',
    loading: false,
    stats: [],
    items: [],
    actions: []
  };

  return (
    <ModuleShell state={mockState as unknown as Parameters<typeof ModuleShell>[0]['state']} onClose={onClose} onAction={async () => true}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden p-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {t('translation.source_text', 'Source Text or JSON Payload')}
            </label>
            <textarea 
              className="w-full text-sm rounded border border-border/30 bg-background px-3 py-2 min-h-[100px]"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder='e.g., "Hello" or {"message": "Hello"}'
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t('translation.target_language', 'Target Language')}:
            </label>
            <select
              className="text-sm rounded border border-border/30 bg-background px-2 py-1"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.nativeLabel} ({loc.label})
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
            className="w-full py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
          >
            {isTranslating ? '...' : t('translation.translate', 'Translate')}
          </button>
        </div>

        {translatedText && (
          <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden p-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('translation.translated_text', 'Translated Output')}
                </label>
                <button 
                  onClick={() => navigator.clipboard.writeText(translatedText)}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  {t('translation.copy', 'Copy')}
                </button>
              </div>
              <textarea 
                className="w-full text-sm rounded border border-border/30 bg-background px-3 py-2 min-h-[100px]"
                value={translatedText}
                readOnly
              />
            </div>
            {metadata && (
              <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                <div>Provider: {metadata.provider}</div>
                <div>Verified: {metadata.verified ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
