import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { Button } from '@/components/ui/button';
import { ExternalLink, ShieldAlert, Radio, Landmark } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

export default function PhysiOmniModule({ onClose }: Props) {
  const state = useOmniModuleState('physiomni');

  const handleLaunchPilot = () => {
    // Open the premium white-labeled cockpit in a new window with branding parameters
    // Target matches the pilot tenant requirements
    const logoUrl = 'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shield.svg';
    const brandColor = '#F97316';
    const tenantId = 'e28bbd91-4cf6-4444-8d4e-120a1337beef'; // pristine pilot tenant
    
    const url = `/physiomni-pilot?logo=${encodeURIComponent(logoUrl)}&color=${encodeURIComponent(brandColor)}&tenant=${tenantId}`;
    window.open(url, '_blank');
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4 py-2">
        {/* Device Stats Preview */}
        <div className="rounded-xl border border-border/40 p-4 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-orange-500 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nordic Hardware Pilot Status
            </h4>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center mb-3">
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

          <p className="text-xs text-muted-foreground leading-relaxed">
            The Phase 1 pilot consists of 30 physical sensing edge nodes transmitting real-time vibration (g) and temperature (°C) telemetry packets directly to OmniHub Gateway.
          </p>
        </div>

        {/* Action Button to Standalone Cockpit */}
        <div className="rounded-xl border border-orange-500/20 p-4 bg-orange-500/5 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Landmark className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-foreground">Standalone Partner Portal</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Launch the isolated, white-labeled operational view styled with the partner&apos;s brand aesthetics and connection feeds.
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleLaunchPilot}
            className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs tracking-wider uppercase py-2 rounded-lg transition-all shadow-md shadow-orange-500/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch Cockpit
          </Button>
        </div>

        {/* Security / MAN Mode Alert Preview */}
        <div className="rounded-xl border border-red-500/15 p-3.5 bg-red-500/5 flex items-start gap-3">
          <ShieldAlert className="w-4.5 h-4.5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">
              Temporal MAN_MODE Gateway
            </h4>
            <p className="text-[11px] text-muted-foreground/90 mt-1 leading-relaxed">
              Vibration anomalies exceeding <strong>15.0g</strong> on the X-axis instantly trip the emergency circuit breaker, escalating to standard MAN_MODE operators via live Webhooks.
            </p>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
