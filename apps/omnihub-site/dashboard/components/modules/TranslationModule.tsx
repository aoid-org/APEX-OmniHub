/**
 * TranslationModule — Real semantic translation panel for OmniDash.
 * Uses the deterministic local SemanticTranslator (no external API).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { useState } from 'react';
import { ModuleShell } from './ModuleShell';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { SemanticTranslator } from '@omniconnect/translation/translator';
import type { OmniModuleState } from '@/hooks/useOmniModuleState';

interface Props {
  readonly onClose: () => void;
}

const translator = new SemanticTranslator();

const MODULE_STATE: OmniModuleState = {
  moduleKey: 'translation',
  headline: 'Semantic Translation Engine · Local Provider',
  stats: [],
  items: [],
  actions: [],
  loading: false,
  error: null,
  stateKind: 'live',
};

export default function TranslationModule({ onClose }: Props) {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('fr-FR');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    setErrorMsg(null);

    try {
      let payloadObj: Record<string, unknown> = {};
      let isJson = false;
      try {
        payloadObj = JSON.parse(sourceText) as Record<string, unknown>;
        isJson = true;
      } catch {
        payloadObj = { text: sourceText };
      }

      const corrId = crypto.randomUUID();
      const event = {
        eventId: crypto.randomUUID(),
        correlationId: corrId,
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
        payload: payloadObj,
      };

      const results = await translator.translate([event], 'omnihub-site', corrId);
      const result = results[0];

      const status = result.payload._translation_status;
      if (status === 'DROPPED' || status === 'FAILED') {
        setTranslatedText(JSON.stringify(result.payload, null, 2));
        setErrorMsg(`Translation ${String(status).toLowerCase()}: check payload schema.`);
      } else {
        setTranslatedText(
          isJson
            ? JSON.stringify(result.payload, null, 2)
            : String(result.payload.text ?? '')
        );
      }

      setMetadata({
        provider: 'Local Deterministic Provider',
        sourceLocale: 'auto',
        targetLocale: targetLang,
        verified: result.metadata.verified ?? false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Error: ${msg}`);
      setTranslatedText('');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <ModuleShell state={MODULE_STATE} onClose={onClose} onAction={async () => true}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden p-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {t('translation.source_text', 'Source Text or JSON Payload')}
            </label>
            <textarea
              id="translation-source-input"
              className="w-full text-sm rounded border border-border/30 bg-background px-3 py-2 min-h-[100px]"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder='e.g., Hello'
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t('translation.target_language', 'Target Language')}:
            </label>
            <select
              id="translation-target-lang"
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
            id="translation-translate-btn"
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
            className="w-full py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
          >
            {isTranslating ? '...' : t('translation.translate', 'Translate')}
          </button>
          {errorMsg && (
            <div className="text-xs text-red-500 px-1">{errorMsg}</div>
          )}
        </div>

        {translatedText && (
          <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden p-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('translation.translated_text', 'Translated Output')}
                </label>
                <button
                  onClick={() => void navigator.clipboard.writeText(translatedText)}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  {t('translation.copy', 'Copy')}
                </button>
              </div>
              <textarea
                id="translation-output"
                className="w-full text-sm rounded border border-border/30 bg-background px-3 py-2 min-h-[100px]"
                value={translatedText}
                readOnly
              />
            </div>
            {metadata && (
              <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                <div>Provider: {String(metadata.provider)}</div>
                <div>Verified: {metadata.verified ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
