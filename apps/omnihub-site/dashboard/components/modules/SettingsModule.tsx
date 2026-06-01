import { useState, useCallback } from 'react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { Switch } from '../../../../../src/components/ui/switch';
import { Label } from '../../../../../src/components/ui/label';
import { useLayoutPersistence } from '../../hooks/useLayoutPersistence';
import { handleToggleDemoMode, handleToggleFreezeMode } from '../../handlers/dashboardHandlers';
import { useAuth } from '@/lib/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');
  const { user } = useAuth();
  const { isDark, setIsDark, ops, setOps } = useLayoutPersistence();

  const [processing, setProcessing] = useState<string | null>(null);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, [setIsDark]);

  const toggleDemoMode = useCallback(async () => {
    const nextVal = !ops.demoMode;
    // Optimistic UI update
    setOps(prev => ({ ...prev, demoMode: nextVal }));

    if (user?.id) {
      setProcessing('demo');
      const res = await handleToggleDemoMode(user.id, !nextVal);
      setProcessing(null);
      if (!res.ok) {
        toast.error(res.error || 'Failed to update Demo Mode setting');
        // Rollback
        setOps(prev => ({ ...prev, demoMode: !nextVal }));
      } else {
        toast.success('Demo Mode setting updated');
      }
    }
  }, [ops.demoMode, setOps, user]);

  const toggleFreezeMode = useCallback(async () => {
    const nextVal = !ops.freezeMode;
    // Optimistic UI update
    setOps(prev => ({ ...prev, freezeMode: nextVal }));

    if (user?.id) {
      setProcessing('freeze');
      const res = await handleToggleFreezeMode(user.id, !nextVal);
      setProcessing(null);
      if (!res.ok) {
        toast.error(res.error || 'Failed to update Freeze Mode setting');
        // Rollback
        setOps(prev => ({ ...prev, freezeMode: !nextVal }));
      } else {
        toast.success('Freeze Mode setting updated');
      }
    }
  }, [ops.freezeMode, setOps, user]);

  const toggleAnonymize = useCallback(() => {
    const nextVal = !ops.anonymizeKpis;
    setOps(prev => ({ ...prev, anonymizeKpis: nextVal }));
    toast.success('KPI Anonymization ' + (nextVal ? 'enabled' : 'disabled'));
  }, [ops.anonymizeKpis, setOps]);

  const toggleNotifications = useCallback(() => {
    const nextVal = !ops.muteNotifications;
    setOps(prev => ({ ...prev, muteNotifications: nextVal }));
    toast.success('Notifications ' + (nextVal ? 'muted' : 'unmuted'));
  }, [ops.muteNotifications, setOps]);

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="space-y-4 pt-2">

        {/* Workspace Theme */}
        <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Dark Mode</Label>
            <p className="text-xs text-muted-foreground">Toggle platform-wide dark theme.</p>
          </div>
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </div>

        {/* Demo Mode */}
        <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              Demo Mode
              {processing === 'demo' && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </Label>
            <p className="text-xs text-muted-foreground">Use mock data for presentation safety.</p>
          </div>
          <Switch checked={ops.demoMode} onCheckedChange={toggleDemoMode} disabled={processing === 'demo'} />
        </div>

        {/* Freeze Mode */}
        <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              Freeze Mode
              {processing === 'freeze' && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </Label>
            <p className="text-xs text-muted-foreground">Pause all automated workflows globally.</p>
          </div>
          <Switch checked={ops.freezeMode} onCheckedChange={toggleFreezeMode} disabled={processing === 'freeze'} />
        </div>

        {/* Anonymize KPIs */}
        <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Anonymize KPIs</Label>
            <p className="text-xs text-muted-foreground">Hide exact revenue and customer counts.</p>
          </div>
          <Switch checked={ops.anonymizeKpis} onCheckedChange={toggleAnonymize} />
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Mute Notifications</Label>
            <p className="text-xs text-muted-foreground">Suppress non-critical system alerts.</p>
          </div>
          <Switch checked={ops.muteNotifications} onCheckedChange={toggleNotifications} />
        </div>

      </div>
    </ModuleShell>
  );
}
