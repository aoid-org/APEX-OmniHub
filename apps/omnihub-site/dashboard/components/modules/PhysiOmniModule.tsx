import { useEffect, useState } from 'react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import { ModuleShell } from './ModuleShell';
import { Button } from '@/components/ui/button';
import { ExternalLink, ShieldAlert, Radio, Landmark, Loader2 } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

interface LiveDevices {
  readonly loading: boolean;
  readonly available: boolean;
  readonly total: number;
  readonly active: number;
}

const EMPTY_DEVICES: LiveDevices = { loading: true, available: false, total: 0, active: 0 };

/** Reads the authenticated tenant's real PhysiOmni device registry (RLS: tenant_id = auth.uid()). */
function usePhysiOmniDevices(): LiveDevices {
  const [devices, setDevices] = useState<LiveDevices>(EMPTY_DEVICES);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasSupabaseConfig) {
        if (!cancelled) setDevices({ loading: false, available: false, total: 0, active: 0 });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setDevices({ loading: false, available: false, total: 0, active: 0 });
        return;
      }

      const { data, error } = await supabase
        .from('physiomni_devices')
        .select('is_active')
        .eq('tenant_id', user.id);

      if (cancelled) return;
      if (error || !data) {
        setDevices({ loading: false, available: false, total: 0, active: 0 });
        return;
      }

      const rows = data as ReadonlyArray<{ is_active: boolean }>;
      setDevices({
        loading: false,
        available: true,
        total: rows.length,
        active: rows.filter((r) => r.is_active).length,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return devices;
}

export default function PhysiOmniModule({ onClose }: Props) {
  const state = useOmniModuleState('physiomni');
  const devices = usePhysiOmniDevices();

  const handleLaunchPilot = () => {
    const logoUrl = 'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/shield.svg';
    const brandColor = '#F97316';
    const url = `/physiomni-pilot?logo=${encodeURIComponent(logoUrl)}&color=${encodeURIComponent(brandColor)}`;
    window.open(url, '_blank');
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4 py-2">
        {/* Live device registry — real per-tenant data from physiomni_devices */}
        <div className="rounded-xl border border-border/40 p-4 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Device Registry
            </h4>
          </div>

          {devices.loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading device registry…
            </div>
          ) : !devices.available || devices.total === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              No devices registered yet. Provisioned edge nodes will appear here once they connect to the OmniHub Gateway.
            </p>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-lg font-bold text-foreground tabular-nums">{devices.active}</span>
              <span className="text-muted-foreground">
                of {devices.total} device{devices.total === 1 ? '' : 's'} active
              </span>
            </div>
          )}
        </div>

        {/* Nordic Hardware Pilot — fixed reference spec, not tenant data */}
        <div className="rounded-xl border border-border/40 p-4 bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Nordic Hardware Pilot Reference
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-500/20 text-orange-400">
                DEMO
              </span>
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
            Reference architecture for the Phase 1 pilot: physical sensing edge nodes transmitting vibration (g) and temperature (°C) telemetry packets directly to the OmniHub Gateway.
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

        {/* Security / MAN Mode policy reference */}
        <div className="rounded-xl border border-red-500/15 p-3.5 bg-red-500/5 flex items-start gap-3">
          <ShieldAlert className="w-4.5 h-4.5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">
              Temporal MAN_MODE Gateway
            </h4>
            <p className="text-[11px] text-muted-foreground/90 mt-1 leading-relaxed">
              Vibration anomalies exceeding <strong>15.0g</strong> on the X-axis trip the emergency circuit breaker, escalating to MAN_MODE operators via webhooks.
            </p>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
