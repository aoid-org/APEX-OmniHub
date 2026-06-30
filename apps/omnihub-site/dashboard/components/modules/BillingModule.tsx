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

// Only ever redirect to a real Stripe-hosted billing portal URL.
function extractPortalUrl(data: unknown): string | null {
  const payload = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : data;
  if (!payload || typeof payload !== 'object') return null;
  const url = (payload as { url?: unknown }).url;
  return typeof url === 'string' && /^https:\/\/billing\.stripe\.com\//.test(url) ? url : null;
}

// Only ever redirect to a real Stripe-hosted checkout URL.
function extractCheckoutUrl(data: unknown): string | null {
  const payload = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : data;
  if (!payload || typeof payload !== 'object') return null;
  const url = (payload as { url?: unknown }).url;
  return typeof url === 'string' && /^https:\/\/checkout\.stripe\.com\//.test(url) ? url : null;
}

// supabase-js raises FunctionsHttpError on a non-2xx edge response and stashes
// the original Response on `.context`. Read the typed envelope ({ error: { code } })
// so the UI can branch on the real backend code instead of leaking the opaque
// "Edge Function returned a non-2xx status code" transport string.
async function readEdgeErrorCode(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      return body?.error?.code ?? body?.code ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export default function BillingModule({ onClose }: Props) {
  const state = useOmniModuleState('billing');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<'PRO' | 'BUS' | null>(null);
  const [setupMsg, setSetupMsg] = useState<string | null>(null);

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

    // Gate the invoke on a confirmed session: never fire without a token, and
    // surface an honest sign-in prompt rather than a raw 401.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return 'Sign in to manage billing.';
    }

    const { data, error } = await supabase.functions.invoke('create-billing-portal', {
      body: { returnUrl: window.location.origin },
    });
    if (error) {
      const code = await readEdgeErrorCode(error);
      if (code === 'UNAUTHORIZED' || code === 'UNAUTHORIZED_NO_AUTH_HEADER') {
        return 'Sign in to manage billing.';
      }
      if (code === 'BILLING_CUSTOMER_NOT_FOUND') {
        setNeedsSetup(true);
        return 'No Stripe billing profile is linked to this account yet. Choose a plan below to get started.';
      }
      if (code === 'BILLING_PORTAL_NOT_CONFIGURED' || code === 'BILLING_PORTAL_UNAVAILABLE') {
        return 'The billing portal is temporarily unavailable. Please try again later.';
      }
      // Never leak the opaque transport string to the user.
      return 'Billing portal is unavailable right now. No billing page was opened.';
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

  const startCheckout = useCallback(async (tier: 'PRO' | 'BUS') => {
    setCheckoutBusy(tier);
    setSetupMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSetupMsg('Sign in to start a subscription.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier, skills: [], returnUrl: window.location.origin },
      });
      if (error) {
        const code = await readEdgeErrorCode(error);
        if (code === 'UNAUTHORIZED' || code === 'UNAUTHORIZED_NO_AUTH_HEADER') {
          setSetupMsg('Sign in to start a subscription.');
          return;
        }
        if (code === 'BILLING_NOT_CONFIGURED') {
          setSetupMsg('Subscriptions are temporarily unavailable. Please try again later.');
          return;
        }
        if (code === 'rate_limit_exceeded') {
          setSetupMsg('Too many attempts. Please try again in a minute.');
          return;
        }
        setSetupMsg('Could not start checkout right now. No charge was made.');
        return;
      }
      const url = extractCheckoutUrl(data);
      if (!url) {
        setSetupMsg('Checkout did not return a valid Stripe URL. No charge was made.');
        return;
      }
      window.location.assign(url);
      setSetupMsg('Opening secure Stripe checkout…');
    } finally {
      setCheckoutBusy(null);
    }
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

      {/* Setup path — only shown once the backend confirms no Stripe customer is
          linked. We never fake an active subscription; the user picks a real
          paid tier and is sent to Stripe-hosted checkout. */}
      {needsSetup && (
        <div className="rounded-lg border border-primary/30 px-3 py-3 bg-primary/5 flex flex-col gap-2">
          <div className="text-xs font-medium text-foreground">
            No active subscription is linked to this account yet.
          </div>
          <div className="text-[11px] text-muted-foreground">
            Start a plan to enable Manage Plan and the Stripe billing portal.
          </div>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => void startCheckout('PRO')}
              disabled={checkoutBusy !== null}
              className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
            >
              {checkoutBusy === 'PRO' ? 'Starting…' : 'Start Pro'}
            </button>
            <button
              type="button"
              onClick={() => void startCheckout('BUS')}
              disabled={checkoutBusy !== null}
              className="flex-1 px-3 py-2 rounded-lg border border-primary/50 text-foreground text-xs font-bold disabled:opacity-50"
            >
              {checkoutBusy === 'BUS' ? 'Starting…' : 'Start Business'}
            </button>
          </div>
          {setupMsg && (
            <div className="text-[11px] text-muted-foreground mt-1">{setupMsg}</div>
          )}
        </div>
      )}
    </ModuleShell>
  );
}
