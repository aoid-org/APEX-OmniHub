export type LangCode = 'en-US' | 'fr-FR' | 'es-ES' | 'de-DE' | 'ja-JP' | 'zh-CN' | 'pt-BR';

export interface LocaleInfo {
  code: LangCode;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en-US', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'fr-FR', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'es-ES', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'de-DE', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
  { code: 'ja-JP', label: 'Japanese', nativeLabel: '日本語', dir: 'ltr' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文', dir: 'ltr' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Português (Brasil)', dir: 'ltr' },
];

export function getLocaleInfo(code: string): LocaleInfo | undefined {
  return SUPPORTED_LOCALES.find(loc => loc.code === code);
}
