/**
 * Intl formatting helpers — locale-aware number, currency, percent, date, and dateTime formatting.
 * Uses the resolved i18n language for all Intl constructors.
 */
import i18n from './index';

function resolvedLang(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(resolvedLang(), options).format(value);
}

export function formatCurrency(value: number, currency = 'USD', options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(resolvedLang(), { style: 'currency', currency, ...options }).format(value);
}

export function formatPercent(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(resolvedLang(), { style: 'percent', ...options }).format(value);
}

export function formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(resolvedLang(), options).format(value);
}

export function formatDateTime(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(resolvedLang(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(value);
}
