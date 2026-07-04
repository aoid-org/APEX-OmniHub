import { useCallback, useState } from 'react';
import { toast } from 'sonner';
// Relative imports (not '@/…'): vitest resolves '@' to the root package src/,
// which has no Layout/SEOMeta/Section shims — see vitest.config.ts alias note.
import { Layout } from '../components/Layout';
import { SEOMeta } from '../components/SEOMeta';
import { Section, SectionHeader } from '../components/Section';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

type PaidTier = 'PRO' | 'BUS';

type Plan = Readonly<{
  id: 'BASIC' | PaidTier;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: readonly string[];
  cta: string;
  highlighted?: boolean;
}>;

const PLANS: readonly Plan[] = [
  {
    id: 'BASIC',
    name: 'Base',
    price: 'Free',
    cadence: '',
    tagline: 'Core infrastructure generated for your business.',
    features: [
      'OmniDash operations console',
      'Core skill architecture',
      'Standard automations & workflows',
      'Community support',
    ],
    cta: 'Initialize Base',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$99',
    cadence: 'CAD / month',
    tagline: 'Custom high-leverage revenue engines for immediate ROI.',
    features: [
      'Everything in Base',
      'Revenue Engine skills (unlimited)',
      'Priority orchestration & routing',
      'Stripe-managed billing portal',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    id: 'BUS',
    name: 'Business',
    price: '$299',
    cadence: 'CAD / month',
    tagline: 'Full platform command, including PhysiOmni operations.',
    features: [
      'Everything in Pro',
      'PhysiOmni device telemetry',
      'Advanced analytics & audit exports',
      'Dedicated onboarding support',
    ],
    cta: 'Upgrade to Business',
  },
];

/** Unwrap the { ok, data } envelope some edge functions return. */
function extractUrl(data: unknown, pattern: RegExp): string | null {
  const payload = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : data;
  if (!payload || typeof payload !== 'object') return null;
  const url = (payload as { url?: unknown }).url;
  return typeof url === 'string' && pattern.test(url) ? url : null;
}

const CHECKOUT_URL_PATTERN = /^https:\/\/checkout\.stripe\.com\//;
const PORTAL_URL_PATTERN = /^https:\/\/billing\.stripe\.com\//;

export function PricingPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const requireAuth = useCallback((): boolean => {
    if (isAuthenticated) return true;
    toast.info('Sign in to continue to secure checkout.');
    globalThis.location.assign('/login');
    return false;
  }, [isAuthenticated]);

  const startCheckout = useCallback(async (tier: PaidTier) => {
    if (busyAction || !requireAuth()) return;
    setBusyAction(tier);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier, skills: [], returnUrl: globalThis.location.origin },
      });
      if (error) throw new Error('Checkout is unavailable right now. Please try again.');
      const url = extractUrl(data, CHECKOUT_URL_PATTERN);
      if (!url) throw new Error('Checkout did not return a valid Stripe URL. No payment page was opened.');
      globalThis.location.assign(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setBusyAction(null);
    }
  }, [busyAction, requireAuth]);

  const openBillingPortal = useCallback(async () => {
    if (busyAction || !requireAuth()) return;
    setBusyAction('portal');
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {
        body: { returnUrl: globalThis.location.origin },
      });
      if (error) {
        toast.info('No billing profile is linked to this account yet. Choose a plan above to get started.');
        return;
      }
      const url = extractUrl(data, PORTAL_URL_PATTERN);
      if (!url) {
        toast.error('Billing portal did not return a valid Stripe URL. No billing page was opened.');
        return;
      }
      globalThis.location.assign(url);
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, requireAuth]);

  const handlePlan = useCallback((plan: Plan) => {
    if (plan.id === 'BASIC') {
      globalThis.location.assign('/launch');
      return;
    }
    void startCheckout(plan.id);
  }, [startCheckout]);

  return (
    <Layout title="Pricing">
      <SEOMeta
        title="Pricing & Payments — APEX OmniHub Platform"
        description="Simple, transparent pricing for governed intelligence. Start free, unlock Revenue Engines on Pro, or command the full platform on Business. Payments secured by Stripe."
        canonical="https://apexomnihub.icu/pricing/"
        appendBrandSuffix={false}
      />
      <Section>
        <SectionHeader
          title="Pricing & Payments"
          subtitle="Simple, transparent tiers. Start free, scale when the engines prove their ROI. All payments are processed securely by Stripe."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
            maxWidth: '1080px',
            margin: '0 auto',
            alignItems: 'stretch',
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="card"
              data-testid={`pricing-plan-${plan.id.toLowerCase()}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                ...(plan.highlighted
                  ? { borderColor: 'var(--color-accent)', boxShadow: 'var(--shadow-md)' }
                  : {}),
              }}
            >
              <div>
                {plan.highlighted && (
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 'var(--font-size-xs, 0.75rem)',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 className="heading-3">{plan.name}</h3>
                <div style={{ margin: 'var(--space-3) 0' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 700 }}>{plan.price}</span>
                  {plan.cadence && (
                    <span className="text-secondary" style={{ marginLeft: '0.5rem' }}>
                      {plan.cadence}
                    </span>
                  )}
                </div>
                <p className="text-secondary">{plan.tagline}</p>
              </div>
              <ul
                className="fortress-list"
                style={{ flexGrow: 1, marginTop: 'var(--space-2)' }}
              >
                {plan.features.map((feature) => (
                  <li key={feature} className="fortress-list__item">
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={plan.highlighted ? 'btn btn--primary btn--lg' : 'btn btn--secondary btn--lg'}
                style={{ width: '100%', minHeight: '44px' }}
                disabled={authLoading || busyAction !== null}
                onClick={() => handlePlan(plan)}
              >
                {busyAction === plan.id ? 'Preparing Secure Checkout…' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </Section>
      <Section variant="surface">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
          <h2 className="heading-2">Already Subscribed?</h2>
          <p className="text-secondary mt-4">
            Manage your plan, update payment methods, and download invoices in the
            Stripe billing portal.
          </p>
          <div className="mt-8">
            <button
              type="button"
              className="btn btn--secondary btn--lg"
              style={{ minHeight: '44px' }}
              disabled={authLoading || busyAction !== null}
              onClick={() => void openBillingPortal()}
              data-testid="pricing-billing-portal"
            >
              {busyAction === 'portal' ? 'Opening Billing Portal…' : 'Open Billing Portal'}
            </button>
          </div>
          <p className="text-secondary mt-8" style={{ fontSize: 'var(--font-size-sm, 0.875rem)' }}>
            Payments are processed by Stripe. APEX Business Systems Ltd. never stores
            your card details. Questions? Contact billing@apexbusiness.systems.
          </p>
        </div>
      </Section>
    </Layout>
  );
}
