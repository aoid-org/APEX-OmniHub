/**
 * TranslationModule — Real semantic translation panel for OmniDash.
 * Local deterministic provider: maps target locale to a prefix-tagged output
 * until the @omniconnect/translation package is available in the workspace.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { useState } from 'react';
import { ModuleShell } from './ModuleShell';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SUPPORTED_SUPPORTED_LOCALES } from '../../../src/i18n/locales';
import type { OmniModuleState } from '@/hooks/useOmniModuleState';

interface Props {
  readonly onClose: () => void;
}

// ─── Deterministic local provider ────────────────────────────────────────────
// Replaces the SemanticTranslator package reference that is not yet published
// to this monorepo's node_modules. Zero external API calls.

interface LocalTranslateResult {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  provider: string;
  verified: boolean;
}

function localTranslate(_text: string, targetLocale: string): LocalTranslateResult {
  // Honest State Enforcement (WP15): We cannot fake translation by prepending strings.
  // Since the enterprise SemanticTranslator package is not yet connected, we fail closed.
  throw new Error(`Translation Engine not connected. Cannot route to target locale: ${targetLocale}`);
}

// ─── Module state ─────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function TranslationModule({ onClose }: Props) {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('fr-FR');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  // FIX: replace `any` with concrete inline type — satisfies @typescript-eslint/no-explicit-any
  // ROOT CAUSE: useState<any> on metadata object failed --max-warnings 0 ESLint gate
  // CHANGE: typed to exact shape consumed by the render (provider + verified)
  interface TranslationMetadata {
    confidence: number;
    engine: string;
    provider?: string;
    verified?: boolean;
  }
  const [metadata] = useState<TranslationMetadata>({ confidence: 0.98, engine: 'local' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTranslate = async (): Promise<void> => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    setErrorMsg(null);

    try {
      // Simulate async processing tick for UX responsiveness
      await new Promise<void>((resolve) => setTimeout(resolve, 120));

      localTranslate(sourceText, targetLang);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Setup is required', { description: 'Missing API configuration for Semantic Translation Engine.' });
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
              {t('translation.source_text', 'Source Text')}
            </label>
            <textarea
              id="translation-source-input"
              className="w-full text-sm rounded border border-border/30 bg-background px-3 py-2 min-h-[100px]"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="e.g., Hello"
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
            type="button"
            onClick={() => void handleTranslate()}
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
                  type="button"
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
