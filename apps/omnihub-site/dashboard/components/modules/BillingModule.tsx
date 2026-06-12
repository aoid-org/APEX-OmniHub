import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { supabase } from '../../../src/lib/supabase';
import { useState } from 'react';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

export default function BillingModule({ onClose }: Props) {
  const state = useOmniModuleState('billing');
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Derive plan, next invoice and usage from live/registry data — never hardcode.
  const planStat = state.stats.find((s) => s.label === 'Plan');
  const nextInvoiceStat = state.stats.find((s) => s.label === 'Next Invoice');
  const plan = planStat?.value ?? '—';
  const nextInvoice = nextInvoiceStat?.value ?? null;

  const usageItem = state.items.find((i) => i.id === 'usage-api');
  const usagePctMatch = usageItem?.detail?.match(/\(([\d.]+)%\)/);
  const usagePct = usagePctMatch ? Number.parseFloat(usagePctMatch[1]) : null;

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    setPortalError(null);
    try {
      const { data, error } = await supabase.functions.invoke('billing-portal', {
        body: { returnUrl: window.location.href }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to load billing portal:', err);
      setPortalError('Failed to load billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
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
              <div className="flex items-center gap-3 mt-1">
                <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{usagePct}% used</span>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border/30 p-4 bg-muted/5 flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Billing Portal</h3>
            <p className="text-xs text-muted-foreground">Manage your subscription plan, invoices, and payment methods via Stripe.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleManageBilling}
              disabled={loadingPortal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {loadingPortal ? 'Redirecting...' : 'Manage Billing'}
              {!loadingPortal && <ExternalLink className="w-3 h-3 ml-1 opacity-70" />}
            </button>

            {portalError && (
              <span className="text-xs text-red-500 font-medium">
                {portalError}
              </span>
            )}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
