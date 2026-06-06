import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function BillingModule({ onClose }: Props) {
  const state = useOmniModuleState('billing');

  // Derive plan, next invoice and usage from live/registry data — never hardcode.
  const planStat = state.stats.find((s) => s.label === 'Plan');
  const nextInvoiceStat = state.stats.find((s) => s.label === 'Next Invoice');
  const plan = planStat?.value ?? '—';
  const nextInvoice = nextInvoiceStat?.value ?? null;

  const usageItem = state.items.find((i) => i.id === 'usage-api');
  const usagePctMatch = usageItem?.detail?.match(/\(([\d.]+)%\)/);
  const usagePct = usagePctMatch ? Number.parseFloat(usagePctMatch[1]) : null;

  return (
    <ModuleShell state={state} onClose={onClose}>
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
    </ModuleShell>
  );
}
