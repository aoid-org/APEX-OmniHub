import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '../../../src/i18n/locales';
import { useState } from 'react';
import { useOmniModal } from '@/stores/omniModalStore';

interface Props {
  readonly onClose: () => void;
}

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');
  // Derive config health from live/registry items — never hardcode.
  const total = state.items.length;
  const enabled = state.items.filter((i) => i.status === 'active').length;
  const allValidated = total > 0 && state.items.every((i) => i.status !== 'error');
  const versionStat = state.stats.find((s) => s.label === 'Version');
  const { t, i18n } = useTranslation();
  const [langUpdated, setLangUpdated] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const SECTIONS = [
    { id: 'general', label: 'General Preferences' },
    { id: 'security', label: 'Security & Identity' },
    { id: 'workspace', label: 'Workspace & Team' },
    { id: 'integrations', label: 'Connected Apps' },
    { id: 'billing', label: 'Billing & Plans' },
    { id: 'compliance', label: 'Audit & Compliance' },
    { id: 'notifications', label: 'Notification Rules' },
    { id: 'api', label: 'API & Webhooks' },
    { id: 'localization', label: 'Localization & Language' },
    { id: 'advanced', label: 'Advanced & Danger Zone' },
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    const locInfo = SUPPORTED_LOCALES.find((l: { code: string; label: string; nativeLabel: string; dir: string }) => l.code === newLang);
    if (locInfo) {
      document.documentElement.dir = locInfo.dir;
    }
    setLangUpdated(true);
    setTimeout(() => setLangUpdated(false), 3000);
  };

  const handleAction = async (actionId: string, _selected: string[]) => {
    if (actionId === 'save-settings') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return true;
      
      const payload: Record<string, unknown> = {
        user_id: user.id,
        updated_at: new Date().toISOString()
      };
      
      // Update the omnidash_settings table (upsert)
      await supabase.from('omnidash_settings').upsert(payload, { onConflict: 'user_id' });
      return true;
    }
    if (actionId === 'reset-defaults') {
      if (globalThis.confirm("Are you sure you want to reset all settings to their defaults?")) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('omnidash_settings').delete().eq('user_id', user.id);
          // Settings are removed; next refresh will fetch defaults.
          // Bypassing reload per honesty requirement.
        }
      }
      return true;
    }
  };

  const handleToggle = async (itemId: string, currentStatus: string) => {
    // Fire-and-forget toggle update for immediate UX response
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('omnidash_settings').upsert({
      user_id: user.id,
      [itemId]: newStatus === 'active'
    }, { onConflict: 'user_id' });
  };

  // Derive config health from live/registry items — never hardcode.
  const total = state.items.length;
  const enabled = state.items.filter((i) => i.status === 'active').length;
  const allValidated = total > 0 && state.items.every((i) => i.status !== 'error');
  const versionStat = state.stats.find((s) => s.label === 'Version');

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && total > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Configuration Health
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${allValidated ? 'bg-green-400' : 'bg-yellow-400'}`}
            />
            <span className="text-foreground font-medium">
              {enabled} of {total} settings enabled
            </span>
            {versionStat && (
              <span className="ml-auto text-muted-foreground">{versionStat.value}</span>
            )}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
