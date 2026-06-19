/**
 * SettingsModule — Platform settings with live backend toggles.
 *
 * Section A: Backend-persisted platform settings (omnidash_settings table).
 *   RLS gate: (is_admin(uid) OR is_paid_user(uid)) AND user_id = auth.uid()
 *   Write errors with code '42501' = RLS rejection (insufficient privilege).
 *
 * Section B: Layout preferences stored in localStorage (device-only).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { useOmniModal } from '@/stores/omniModalStore';
import { useLayoutContext } from '../../contexts/LayoutContext';
import { WidgetSettingsPanel } from '../WidgetSettingsModal';

interface Props {
  readonly onClose: () => void;
}

// Defaults from migration 20260205000001:
// demo_mode=false, anonymize_kpis=true, freeze_mode=false, show_connected_ecosystem=false
const SETTING_DEFAULTS: Record<string, boolean> = {
  demo_mode: false,
  anonymize_kpis: true,
  freeze_mode: false,
  show_connected_ecosystem: false,
};

const STATE_KIND_STYLES: Readonly<Record<string, { background: string; color: string; border: string }>> = {
  live:        { background: 'rgba(52,211,153,0.1)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' },
  demo:        { background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' },
  unavailable: { background: 'rgba(239,68,68,0.1)',   color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
};
const DEFAULT_STATE_STYLE = { background: 'rgba(161,161,170,0.1)', color: '#a1a1aa', border: '1px solid rgba(161,161,170,0.3)' };

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');
  const { close } = useOmniModal();
  const { hiddenWidgets, panelLayout, toggleWidget, setPanelLayout, resetWidgetPositions } = useLayoutContext();

  // Optimistic toggle states: id → boolean (true = active)
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const effectiveStatus = useCallback((itemId: string, backendStatus: string): boolean => {
    if (itemId in optimistic) return optimistic[itemId];
    return backendStatus === 'active';
  }, [optimistic]);

  const handleToggle = useCallback(async (itemId: string, currentlyActive: boolean) => {
    const nextValue = !currentlyActive;

    // Optimistic update
    setOptimistic(prev => ({ ...prev, [itemId]: nextValue }));
    setSaving(itemId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required.');
        setOptimistic(prev => ({ ...prev, [itemId]: currentlyActive }));
        return;
      }

      const { error } = await supabase
        .from('omnidash_settings')
        .upsert(
          { user_id: user.id, [itemId]: nextValue, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (error) {
        // RLS rejection: code '42501' = insufficient privilege
        if (error.code === '42501') {
          toast.error('Settings management requires admin or paid tier access.');
        } else {
          toast.error(`Failed to save setting: ${error.message}`);
        }
        // Roll back optimistic update
        setOptimistic(prev => ({ ...prev, [itemId]: currentlyActive }));
        return;
      }

      toast.success(`${itemId.replace(/_/g, ' ')} updated.`);
    } catch (err) {
      toast.error(`Failed to save setting: ${err instanceof Error ? err.message : String(err)}`);
      setOptimistic(prev => ({ ...prev, [itemId]: currentlyActive }));
    } finally {
      setSaving(null);
    }
  }, []);

  const handleResetDefaults = useCallback(async () => {
    setSaving('__reset__');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required.');
        return;
      }

      const { error } = await supabase
        .from('omnidash_settings')
        .upsert(
          {
            user_id: user.id,
            demo_mode: SETTING_DEFAULTS['demo_mode'],
            anonymize_kpis: SETTING_DEFAULTS['anonymize_kpis'],
            freeze_mode: SETTING_DEFAULTS['freeze_mode'],
            show_connected_ecosystem: SETTING_DEFAULTS['show_connected_ecosystem'],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        if (error.code === '42501') {
          toast.error('Settings management requires admin or paid tier access.');
        } else {
          toast.error(`Failed to reset settings: ${error.message}`);
        }
        return;
      }

      // Clear optimistic state so items re-render from backend truth
      setOptimistic({});
      toast.success('Settings reset to defaults.');
    } catch (err) {
      toast.error(`Failed to reset settings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(null);
    }
  }, []);

  const stateStyle = STATE_KIND_STYLES[state.stateKind] ?? DEFAULT_STATE_STYLE;
  const total = state.items.length;
  const enabled = state.items.filter(i => effectiveStatus(i.id, i.status)).length;
  const allValidated = total > 0 && state.items.every(i => i.status !== 'error');
  const versionStat = state.stats.find(s => s.label === 'Version');

  if (state.loading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading module data...
      </div>
    );
  }

  return (
    <div className="py-3 flex flex-col gap-4">
      {/* State indicator */}
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1">{state.headline}</p>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={stateStyle}
        >
          {state.stateKind.toUpperCase()}
        </span>
      </div>

      {/* Configuration health */}
      {total > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Configuration Health
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${allValidated ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-foreground font-medium">{enabled} of {total} settings enabled</span>
            {versionStat && (
              <span className="ml-auto text-muted-foreground">{versionStat.value}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Section A: Platform Settings (backend-persisted) ── */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Platform Settings</p>
        {total === 0 && state.stateKind !== 'live' && (
          <p className="text-xs text-muted-foreground">Settings unavailable — sign in with a paid account to manage platform settings.</p>
        )}
        {state.items.map(item => {
          const isActive = effectiveStatus(item.id, item.status);
          const isSaving = saving === item.id;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/30 bg-card"
            >
              <span className="text-sm text-foreground">{item.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                aria-label={`Toggle ${item.label}`}
                disabled={isSaving || saving === '__reset__'}
                onClick={() => void handleToggle(item.id, isActive)}
                className={[
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isActive ? 'bg-green-500' : 'bg-muted',
                ].join(' ')}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin text-white m-auto" />
                ) : (
                  <span
                    className={[
                      'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                      isActive ? 'translate-x-4' : 'translate-x-0',
                    ].join(' ')}
                  />
                )}
              </button>
            </div>
          );
        })}
        {total > 0 && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void handleResetDefaults()}
            className="mt-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50 self-start"
          >
            {saving === '__reset__' ? 'Resetting…' : 'Reset to defaults'}
          </button>
        )}
      </div>

      {/* ── Section B: Layout Preferences (localStorage, device-only) ── */}
      <div className="flex flex-col gap-2 border-t border-border/30 pt-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Layout Preferences — this device only
        </p>
        <WidgetSettingsPanel
          hiddenWidgets={hiddenWidgets}
          panelLayout={panelLayout}
          onToggleWidget={toggleWidget}
          onSetPanelLayout={setPanelLayout}
          onResetPositions={resetWidgetPositions}
          onClose={close}
        />
      </div>

      {/* Close */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
