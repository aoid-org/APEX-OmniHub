import { useCallback, useState } from 'react';
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


async function readFunctionErrorCode(error: unknown): Promise<string | null> {
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : null;
  if (!(context instanceof Response)) return null;
  try {
    const payload = await context.clone().json() as { error?: { code?: unknown }; code?: unknown };
    const code = payload.error?.code ?? payload.code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

function extractCheckoutUrl(data: unknown): string | null {
  const payload = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : data;
  if (!payload || typeof payload !== 'object') return null;
  const url = (payload as { url?: unknown }).url;
  return typeof url === 'string' && /^https:\/\/checkout\.stripe\.com\//.test(url) ? url : null;
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
  const [setupStatus, setSetupStatus] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState<string | null>(null);

  const planStat        = state.stats.find((s) => s.label === 'Plan');
  const nextInvoiceStat = state.stats.find((s) => s.label === 'Next Invoice');
  const plan            = planStat?.value ?? '—';
  const nextInvoice     = nextInvoiceStat?.value ?? null;

  const usageItem = state.items.find((i) => i.id === 'usage-api');
  const usagePct  = parseUsagePct(usageItem?.detail);
  const hasStripeCustomer = state.items.some((item) => /cus_/i.test(`${item.detail ?? ''} ${item.label ?? ''}`)) ||
    state.stats.some((stat) => stat.label === 'Stripe Profile' && String(stat.value).toLowerCase() === 'linked');
  const showSetupPath = !hasStripeCustomer;

  const startCheckout = useCallback(async (tier: 'PRO' | 'BUS') => {
    setSetupLoading(tier);
    setSetupStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier, skills: [], returnUrl: window.location.origin },
      });
      if (error) {
        setSetupStatus('Stripe checkout is unavailable right now. No billing profile was created.');
        return;
      }
      const url = extractCheckoutUrl(data);
      if (!url) {
        setSetupStatus('Checkout did not return a valid Stripe URL. No billing profile was created.');
        return;
      }
      window.location.assign(url);
    } finally {
      setSetupLoading(null);
    }
  }, []);

  const handleAction = useCallback(async (actionId: string): Promise<boolean | string> => {
    if (actionId !== 'manage-plan' && actionId !== 'billing-portal' && actionId !== 'download-invoices') {
      return false;
    }

    const { data, error } = await supabase.functions.invoke('create-billing-portal', {
      body: { returnUrl: window.location.origin },
    });
    if (error) {
      const code = await readFunctionErrorCode(error);
      if (code === 'BILLING_CUSTOMER_NOT_FOUND') {
        return 'No Stripe billing profile is linked to this account yet. Choose Pro or Business setup below to create one through Stripe checkout.';
      }
      return /non-2xx status code/i.test(error.message)
        ? 'Billing portal is unavailable. No billing page was opened.'
        : error.message || 'Billing portal is unavailable. No billing page was opened.';
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
      {!state.loading && showSetupPath && (
        <div className="rounded-lg border border-amber-400/30 px-3 py-2 bg-amber-500/10">
          <p className="text-xs font-semibold text-foreground">No Stripe billing profile is linked to this account yet.</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Use Stripe checkout to set up a supported paid tier before opening Manage Plan or the Billing Portal.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startCheckout('PRO')}
              disabled={setupLoading !== null}
              className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {setupLoading === 'PRO' ? 'Opening…' : 'Set Up Pro'}
            </button>
            <button
              type="button"
              onClick={() => void startCheckout('BUS')}
              disabled={setupLoading !== null}
              className="rounded-md border border-border/40 px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
            >
              {setupLoading === 'BUS' ? 'Opening…' : 'Set Up Business'}
            </button>
          </div>
          {setupStatus && <p className="mt-2 text-xs text-muted-foreground">{setupStatus}</p>}
        </div>
      )}
    </ModuleShell>
  );
}
