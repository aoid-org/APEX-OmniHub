import { PipelineItem, TodayItem, KpiDaily } from './types';
import { sanitizeEventPayload, redactAmount as libRedactAmount } from '@/lib/sanitization';

const CLIENT_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function redactAccountName(_name: string, index: number): string {
  const label = CLIENT_LABELS[index % CLIENT_LABELS.length];
  return `Client ${label}`;
}

function bucketAmount(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return libRedactAmount(amount);
}

export function redactPipeline(items: PipelineItem[]): PipelineItem[] {
  return items.map((item, idx) => ({
    ...item,
    account_name: redactAccountName(item.account_name, idx),
    notes: item.notes ? sanitizeEventPayload({ notes: item.notes }).notes : item.notes,
  }));
}

export function redactPipelineDisplay(items: PipelineItem[]): Array<PipelineItem & { expected_mrr_bucket: string | null }> {
  return redactPipeline(items).map((item) => ({
    ...item,
    expected_mrr: null,
    expected_mrr_bucket: bucketAmount(item.expected_mrr ?? undefined),
  }));
}

export function redactTodayItems(items: TodayItem[]): TodayItem[] {
  return items.map((item, idx) => ({
    ...item,
    title: redactAccountName(item.title, idx),
    next_action: item.next_action ? sanitizeEventPayload({ next_action: item.next_action }).next_action : item.next_action,
  }));
}

export function redactKpiDaily(rows: KpiDaily[]): KpiDaily[] {
  return rows.map((row) => ({
    ...row,
    flowbills_demos: Math.max(0, row.flowbills_demos),
    flowbills_paid_accounts: Math.max(0, row.flowbills_paid_accounts),
    cash_days_to_cash: row.cash_days_to_cash ?? null,
  }));
}

export function anonymizeValue(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return bucketAmount(value);
}

export function redactNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  return sanitizeEventPayload({ notes }).notes;
}

export function redactAmount(value: number | null | undefined): string | null {
  return bucketAmount(value);
}
