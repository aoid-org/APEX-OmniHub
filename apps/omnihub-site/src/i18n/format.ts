/**
 * APEX OmniHub — Intl-based formatting helpers
 * Uses i18n.resolvedLanguage for locale-aware number/date formatting.
 * Aligns with i18next's documented Intl-based formatting approach.
 */
import i18n from './index';

function getLocale(): string {
  return i18n.resolvedLanguage ?? 'en-US';
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}

export function formatPercent(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'percent',
    ...options,
  }).format(value);
}

export function formatDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    ...options,
  }).format(value);
}

export function formatDateTime(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(value);
}
