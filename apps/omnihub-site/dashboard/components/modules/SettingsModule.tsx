import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    const locInfo = SUPPORTED_LOCALES.find(l => l.code === newLang);
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
      if (window.confirm("Are you sure you want to reset all settings to their defaults?")) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('omnidash_settings').delete().eq('user_id', user.id);
          window.location.reload();
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

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden">
          <div className="px-3 py-2 bg-muted/20 border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('settings.language', 'Language')}
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t('settings.current_language', 'Current Language')}</div>
              </div>
              <select
                className="text-sm rounded border border-border/30 bg-background px-2 py-1"
                value={i18n.language}
                onChange={handleLanguageChange}
              >
                {SUPPORTED_LOCALES.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.nativeLabel} ({loc.label})
                  </option>
                ))}
              </select>
            </div>
            {langUpdated && (
              <div className="mt-2 text-xs text-green-500 font-medium">
                {t('settings.language_updated', 'Language updated successfully')}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Semantic Translator</div>
                  <div className="text-xs text-muted-foreground">Launch the deterministic enterprise translation engine</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const invoke = useOmniModal.getState().invoke;
                    invoke({
                      id: 'settings-translator',
                      provider: 'omnidash',
                      type: 'module',
                      title: 'Semantic Translation',
                      contextData: { moduleKey: 'translation' },
                      onComplete: async () => {},
                      onCancel: () => {},
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500/20 transition-colors"
                >
                  Open Translator
                </button>
              </div>
            </div>
          </div>
        </div>

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

        {total > 0 ? (
          <div className="rounded-lg border border-border/30 bg-muted/10 overflow-hidden">
            <div className="px-3 py-2 bg-muted/20 border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              Configuration Toggles
            </div>
            <div className="p-3 space-y-3">
              {state.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.detail && <div className="text-xs text-muted-foreground">{item.detail}</div>}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={item.status === 'active'}
                    onChange={() => handleToggle(item.id, item.status)}
                    className="w-4 h-4 rounded border-gray-300 opacity-70 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No configuration settings available from server.
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
