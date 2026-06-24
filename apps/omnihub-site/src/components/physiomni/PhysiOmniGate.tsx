/**
 * PhysiOmniGate — Paywall shell for the PhysiOmni feature.
 *
 * Renders the correct access state based on the user's subscription tier:
 *
 *   free        → Locked card. "PhysiOmni is available on Business."
 *   starter     → Locked card. "Upgrade to Business to access PhysiOmni."
 *   pro         → Preview card. "Request Business activation."
 *   business    → Pilot flow. Hardware actions still require MAN approval.
 *   enterprise  → Custom deployment flow. Hardware gated by MAN + audit.
 *
 * Rule: anything that controls or claims to coordinate physical-world
 * behaviour must be Business+ and fail-closed.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { Lock, Cpu, ArrowUpRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SubscriptionTier } from '@/hooks/usePlan';

interface PhysiOmniGateProps {
  readonly tier: SubscriptionTier;
  readonly loading: boolean;
  /** Rendered only when tier is business or enterprise */
  readonly children: React.ReactNode;
}

// ── Locked state (free / starter) ──────────────────────────────────────────

function LockedCard({ tier }: Readonly<{ tier: SubscriptionTier }>) {
  const isStarter = tier === 'starter';
  return (
    <div
      data-testid="physiomni-gate-locked"
      className="flex flex-col items-center justify-center gap-4 py-8 px-4 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-muted/30 border border-border/40 flex items-center justify-center">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-foreground">
          PhysiOmni — Business Plan Required
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
          {isStarter
            ? 'Upgrade to Business ($299 CAD/mo) to access PhysiOmni pilot tools, device registry, and workspace integration.'
            : 'PhysiOmni is available on Business plans and above. Upgrade to connect industrial IoT devices and wearable sensors.'}
        </p>
      </div>
      <Button
        asChild
        size="sm"
        className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs tracking-wider uppercase px-4"
      >
        <a href="/settings?tab=billing" className="flex items-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Upgrade to Business
        </a>
      </Button>
    </div>
  );
}

// ── Pro preview state ───────────────────────────────────────────────────────

function ProPreviewCard() {
  return (
    <div
      data-testid="physiomni-gate-preview"
      className="flex flex-col gap-4 py-2"
    >
      {/* Preview banner */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/8 p-4 flex items-start gap-3">
        <Cpu className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              PhysiOmni Preview
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-500/20 text-orange-400">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            You&apos;re on the Pro plan. PhysiOmni access is available on Business plans and above.
            Pro users can preview the pilot experience and request activation.
          </p>
        </div>
      </div>

      {/* Pilot preview — read-only reference card */}
      <div className="rounded-xl border border-border/40 p-4 bg-card/60 backdrop-blur-md opacity-60 pointer-events-none select-none">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Device Registry — Preview
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
            <div className="text-lg font-bold text-foreground">nRF9161</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">MCU Board</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
            <div className="text-lg font-bold text-foreground">ADXL345</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Sensor</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/20 border border-border/20">
            <div className="text-lg font-bold text-emerald-400">mTLS</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Protocol</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button
        asChild
        size="sm"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs tracking-wider uppercase"
      >
        <a href="/settings?tab=billing" className="flex items-center justify-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Request Business Activation
        </a>
      </Button>
    </div>
  );
}

// ── Gate shell ──────────────────────────────────────────────────────────────

export function PhysiOmniGate({ tier, loading, children }: PhysiOmniGateProps) {
  if (loading) {
    return (
      <div
        data-testid="physiomni-gate-loading"
        className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (tier === 'free' || tier === 'starter') {
    return <LockedCard tier={tier} />;
  }

  if (tier === 'pro') {
    return <ProPreviewCard />;
  }

  // business | enterprise — render the full PhysiOmni content
  return <>{children}</>;
}
