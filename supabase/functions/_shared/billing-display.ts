// Pure display formatting for the Billing module (omnilink-port/module-state).
//
// Owner P1 user-shoes defect (2026-07-10): the billing item reached OmniDash
// with no `label`, so the normalizer fell back to the raw subscription UUID,
// and no `stats` were emitted, so the modal rendered "Current Period —".
// Raw IDs must never reach the UI (canonical product truth). This module is
// dependency-free so it runs in Deno (edge) and Node (vitest) unchanged.

export interface BillingSubscriptionRow {
  readonly id: string;
  readonly tier: string | null;
  readonly status: string | null;
  readonly current_period_end: string | null;
  readonly trial_end: string | null;
}

export interface BillingDisplay {
  /** Human item for the module list — never a raw UUID. */
  readonly item: {
    readonly id: string;
    readonly label: string;
    readonly status: string;
    readonly detail?: string;
  };
  /** Stats consumed by BillingModule ("Plan" / "Next Invoice"). */
  readonly stats: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function describeBillingSubscription(sub: BillingSubscriptionRow): BillingDisplay {
  const tierLabel = sub.tier ? `${titleCase(sub.tier)} Plan` : 'Subscription';
  const status = (sub.status ?? 'active').toLowerCase();
  const trialEnd = formatDate(sub.trial_end);
  const periodEnd = formatDate(sub.current_period_end);

  let detail: string | undefined;
  if (status === 'trialing' && trialEnd) detail = `Trial ends ${trialEnd}`;
  else if (periodEnd) detail = `Renews ${periodEnd}`;

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Plan', value: tierLabel },
  ];
  if (periodEnd) stats.push({ label: 'Next Invoice', value: periodEnd });

  return {
    item: {
      id: sub.id, // internal key only — UI renders `label`
      label: tierLabel,
      status,
      ...(detail ? { detail } : {}),
    },
    stats,
  };
}
