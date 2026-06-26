import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

function parseUsagePct(detail: string | undefined): number | null {
  if (!detail) return null;
  // Matches "142K / 500K requests" — compute ratio from raw numbers
  const m = detail.match(/([\d.]+)[Kk]?\s*\/\s*([\d.]+)[Kk]?/);
  if (!m) return null;
  const used = parseFloat(m[1]) * (detail.toLowerCase().indexOf('k') !== -1 ? 1000 : 1);
  const cap  = parseFloat(m[2]) * (detail.toLowerCase().indexOf('k') !== -1 ? 1000 : 1);
  if (!cap) return null;
  return Math.min(100, Math.round((used / cap) * 1000) / 10);
}

function extractPortalUrl(data: unknown): string | null {
  const payload = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : data;
  if (!payload || typeof payload !== 'object') return null;
  const url = (payload as { url?: unknown }).url;
  return typeof url === 'string' && /^https:\/\/billing\.stripe\.com\//.test(url) ? url : null;
}

export default function BillingModule({ onClose }: Props) {
  const state = useOmniModuleState('billing');

  const planStat        = state.stats.find((s) => s.label === 'Plan');
  const nextInvoiceStat = state.stats.find((s) => s.label === 'Next Invoice');
  const plan            = planStat?.value ?? '—';
  const nextInvoice     = nextInvoiceStat?.value ?? null;

  const usageItem = state.items.find((i) => i.id === 'usage-api');
  const usagePct  = parseUsagePct(usageItem?.detail);

  const handleAction = useCallback(async (actionId: string): Promise<boolean | string> => {
    if (actionId !== 'manage-plan' && actionId !== 'billing-portal' && actionId !== 'download-invoices') {
      return false;
    }

    const { data, error } = await supabase.functions.invoke('create-billing-portal', {
      body: { returnUrl: window.location.origin },
    });
    if (error) {
      return error.message || 'Billing portal is unavailable. No billing page was opened.';
    }
    const url = extractPortalUrl(data);
    if (!url) {
      return 'Billing portal did not return a valid Stripe URL. No billing page was opened.';
    }
    window.location.assign(url);
    if (actionId === 'download-invoices') {
      return 'Opening Stripe billing portal. Invoices are available from the portal.';
    }
    return 'Opening Stripe billing portal…';
  }, []);

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Current Period
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">{plan}</span>
            {nextInvoice && (
              <span className="text-muted-foreground">Next invoice: {nextInvoice}</span>
            )}
          </div>
          {usagePct !== null && (
            <div className="flex items-center gap-3 mt-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, usagePct)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{usagePct}% used</span>
            </div>
          )}
          {usageItem?.detail && (
            <div className="text-[10px] text-muted-foreground mt-1">{usageItem.detail}</div>
          )}
        </div>
      )}
    </ModuleShell>
  );
}
