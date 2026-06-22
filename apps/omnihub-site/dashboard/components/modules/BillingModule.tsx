import { useCallback } from 'react';
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

export default function BillingModule({ onClose }: Props) {
  const state = useOmniModuleState('billing');

  const planStat        = state.stats.find((s) => s.label === 'Plan');
  const nextInvoiceStat = state.stats.find((s) => s.label === 'Next Invoice');
  const plan            = planStat?.value ?? '—';
  const nextInvoice     = nextInvoiceStat?.value ?? null;

  const usageItem = state.items.find((i) => i.id === 'usage-api');
  const usagePct  = parseUsagePct(usageItem?.detail);

  const handleAction = useCallback(async (actionId: string): Promise<boolean> => {
    if (actionId === 'manage-plan') {
      // Escalate to billing team — portal URL is tenant-specific and requires auth
      window.open('mailto:billing@apexbusiness.systems?subject=Manage%20Plan', '_blank', 'noopener');
      return true;
    }
    if (actionId === 'download-invoices') {
      // Invoices are available in the Stripe customer portal — link is auth-gated
      alert('Invoice downloads are available in your Stripe customer portal.\nSign in at billing.apexbusiness.systems to access your invoices.');
      return true;
    }
    return false;
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
