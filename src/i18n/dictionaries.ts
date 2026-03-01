/**
 * APEX Language Fabric — Translation Dictionaries
 *
 * ZERO RULES:
 *   - Missing key -> return English value silently; never render raw key
 *   - Non-en locales fall back to English string verbatim only
 *   - Never invent translations
 */

import type { LangCode } from './locales';

/**
 * English dictionary — canonical source. All keys defined here.
 */
const en = {
  // -- Translation Page --
  'translation.title': 'Translation',
  'translation.semanticTitle': 'Semantic Translation',
  'translation.semanticDescription': 'Translate event payloads with automatic verification (preview mode)',
  'translation.inputTitle': 'Input',
  'translation.targetLocale': 'Target Locale',
  'translation.jsonPayload': 'JSON Payload',
  'translation.jsonPlaceholder': '{"eventType": "message.sent", "payload": {"text": "Hello world"}}',
  'translation.translate': 'Translate',
  'translation.clear': 'Clear',
  'translation.resultTitle': 'Result',
  'translation.verified': 'Verified',
  'translation.failed': 'Failed',
  'translation.translatedEvent': 'Translated Event',
  'translation.copy': 'Copy',
  'translation.copiedToClipboard': 'Copied to clipboard',
  'translation.completeWithVerification': 'Translation complete with verification',
  'translation.translationFailed': 'Translation failed',
  'translation.previewMode': 'Preview Mode',
  'translation.previewDescription': 'This is a deterministic preview using pseudo-translation. Production translation would use local AI models or cached dictionaries with full semantic equivalence verification.',

  // -- Agent Page --
  'agent.title': 'OmniAgent',
  'agent.voiceInterfaceTitle': 'Voice Interface',
  'agent.voiceInterfaceDescription': 'Speak commands to control OmniLink',
  'agent.speaking': 'Speaking...',
  'agent.transcript': 'Transcript',
  'agent.lastCommand': 'Last Command',
  'agent.availableCommands': 'Available Commands',
  'agent.availableCommandsDescription': 'Speak any of these phrases to control OmniLink',
  'agent.privacyTitle': 'Privacy & Security',
  'agent.privacyVoice': 'Voice processing uses WebSocket to edge function',
  'agent.privacyTranscripts': 'Transcripts are not logged unless you opt-in',
  'agent.privacyCommands': 'Commands are processed client-side (deterministic mapping)',
  'agent.privacyNoExternal': 'No external AI services for command interpretation',
  'agent.commandNotRecognized': 'Command not recognized',
  'agent.commandHint': 'Try saying "help" for available commands',
  'agent.darkModeEnabled': 'Dark mode enabled',
  'agent.lightModeEnabled': 'Light mode enabled',
  'agent.voiceCommandsAvailable': 'Voice commands available - see list below',

  // -- Locale Labels (for dropdown) --
  'locale.en': 'English',
  'locale.es': 'Spanish',
  'locale.de': 'German',
  'locale.ja': 'Japanese',
  'locale.fr': 'French',
  'locale.pt': 'Portuguese',
  'locale.zh': 'Chinese',

  // -- Common --
  'common.command': 'Command',
} as const;

export type DictionaryKey = keyof typeof en;

type Dictionary = Record<DictionaryKey, string>;

/**
 * All dictionaries keyed by LangCode.
 * Non-en locales fall back to English verbatim — never invent translations.
 */
const dictionaries: Record<LangCode, Dictionary> = {
  en,
  es: { ...en },
  de: { ...en },
  ja: { ...en },
  fr: { ...en },
  pt: { ...en },
  zh: { ...en },
};

/**
 * Resolve a translation key for a given language.
 * Missing key -> return English value silently. Never return raw key.
 */
export function resolveTranslation(lang: LangCode, key: string): string {
  const dict = dictionaries[lang] ?? dictionaries.en;
  return dict[key as DictionaryKey] ?? en[key as DictionaryKey] ?? key;
}
