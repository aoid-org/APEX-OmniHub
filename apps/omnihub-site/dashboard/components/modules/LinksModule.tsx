import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOmniSlateStore } from '@/stores/omniSlateStore';

interface Props {
  readonly onClose: () => void;
}



const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:   { bg: 'rgba(52,211,153,0.1)',  text: '#34d399' },
  pending:  { bg: 'rgba(250,204,21,0.1)',   text: '#facc15' },
  error:    { bg: 'rgba(239,68,68,0.1)',    text: '#ef4444' },
  inactive: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
};

/** Accepts only absolute http(s) URLs — link context is for real, fetchable URLs. */
function isValidHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

interface LocalStagedLink {
  readonly id: string;
  readonly url: string;
}

export default function LinksModule({ onClose }: Props) {
  const state = useOmniModuleState('links');
  const chips = state.items.slice(0, 6);
  const [isStaging, setIsStaging] = useState(false);
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [omniSlateBlocked, setOmniSlateBlocked] = useState(false);
  const [omniSlateSuccess, setOmniSlateSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localLinks, setLocalLinks] = useState<readonly LocalStagedLink[]>(() => {
    try {
      const saved = localStorage.getItem('apex.staged.links');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const trimmedUrl = url.trim();
  const urlIsValid = isValidHttpUrl(trimmedUrl);
  const showValidationError = touched && trimmedUrl.length > 0 && !urlIsValid;

  // When the Links sync backend is unreachable for this account the module
  // resolves to 'unavailable' (no live actions). Links staging is local-only by
  // design, so it must NOT go dark: we keep the Add Link input available and
  // stage URLs into visible session state instead of presenting a dead end.
  const syncUnavailable = state.stateKind === 'unavailable';
  const showStaging = isStaging || syncUnavailable;

  // Links collect URL/context — they are NOT app integrations and must never
  // reach OmniBoard or trigger-workflow. add-link/send-to-omnislate are handled
  // entirely in local component state here (return true so ModuleShell does not
  // dispatch them to the backend).
  const handleAction = async (actionId: string, selected: string[]) => {
    if (actionId === 'add-link' || actionId === 'add_link') {
      setOmniSlateBlocked(false);
      setOmniSlateSuccess(null);
      setIsStaging(true);
      return true;
    }
    if (actionId === 'send-to-omnislate' || actionId === 'send_to_omnislate') {
      const addContext = useOmniSlateStore.getState().addContext;
      let sentCount = 0;
      
      selected.forEach(id => {
        const item = state.items.find(i => i.id === id);
        if (item) {
          addContext({
            id: item.id,
            kind: 'link',
            label: item.label,
            source: 'system',
            health: 'healthy',
            metadata: { url: item.label },
            droppedAt: new Date().toISOString()
          });
          sentCount++;
          return;
        }
        
        const local = localLinks.find(l => l.id === id);
        if (local) {
          addContext({
            id: local.id,
            kind: 'link',
            label: local.url,
            source: 'system',
            health: 'healthy',
            metadata: { url: local.url },
            droppedAt: new Date().toISOString()
          });
          sentCount++;
        }
      });

      if (sentCount > 0) {
        setOmniSlateSuccess(`Successfully sent ${sentCount} link(s) to OmniSlate.`);
        setOmniSlateBlocked(false);
      } else {
        setOmniSlateBlocked(true);
        setOmniSlateSuccess(null);
      }
      return true;
    }
    return false;
  };

  /** Stage a URL into visible, persistent local state. */
  const stageLocally = () => {
    const next = [{ id: `local-${Date.now()}`, url: trimmedUrl }, ...localLinks].slice(0, 12);
    setLocalLinks(next);
    try {
      localStorage.setItem('apex.staged.links', JSON.stringify(next));
    } catch {
      // noop
    }
    setUrl('');
    setTouched(false);
    setSubmitError(null);
  };

  const handleStageLink = async () => {
    if (!urlIsValid || isSubmitting) {
      setTouched(true);
      return;
    }

    // Sync unavailable → honest local session staging. No backend call is made,
    // so there is no 500/Failed-to-fetch and no fake "saved" success.
    if (syncUnavailable) {
      stageLocally();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      setSubmitError('Authentication required to save links.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('omnilink_links').insert({
      user_id: userId,
      url: trimmedUrl,
      status: 'active'
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(`Failed to save link: ${error.message}`);
    } else {
      setUrl('');
      setTouched(false);
      setIsStaging(false);
      // Refresh module state in place (re-reads durable storage via the
      // omnilink-port resolver) — keeps the modal open and the dashboard
      // intact instead of a jarring full-page reload.
      state.refetch?.();
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction}>
      {syncUnavailable && (
        <div
          data-testid="links-unavailable-copy"
          className="flex flex-col gap-1 rounded-lg border border-amber-400/30 px-3 py-2 bg-amber-400/5 text-[11px] text-amber-300/90"
        >
          <span className="font-semibold text-amber-300">Link sync is unavailable for this account.</span>
          <span>You can still stage local URL context for this session.</span>
          <span className="text-amber-300/70">Connect storage or enable Links sync to persist links across sessions.</span>
        </div>
      )}

      {omniSlateBlocked && (
        <div className="rounded-lg border border-red-400/30 px-3 py-2 bg-red-400/5 text-[11px] text-red-400">
          Please select at least one link to send to OmniSlate.
        </div>
      )}

      {omniSlateSuccess && (
        <div className="rounded-lg border border-emerald-400/30 px-3 py-2 bg-emerald-400/5 text-[11px] text-emerald-400">
          {omniSlateSuccess}
        </div>
      )}

      {showStaging && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/30 px-3 py-3 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Stage URL Context
          </div>
          <input
            data-testid="links-add-url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleStageLink();
              }
            }}
            placeholder="https://..."
            aria-label="URL to stage as context"
            className="bg-background border border-border/40 rounded px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
          />

          {showValidationError && (
            <div className="text-[10px] text-red-400">
              Enter a valid URL starting with http:// or https://.
            </div>
          )}

          {submitError && (
            <div className="text-[10px] text-red-400 font-bold bg-red-400/10 p-2 rounded">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            {isStaging && !syncUnavailable && (
              <button
                type="button"
                onClick={() => {
                  setIsStaging(false);
                  setOmniSlateBlocked(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
            <button
              data-testid="links-add-url-button"
              type="button"
              onClick={handleStageLink}
              disabled={!urlIsValid || isSubmitting}
              className={[
                'px-3 py-1 rounded text-primary-foreground text-xs font-bold',
                urlIsValid && !isSubmitting
                  ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                  : 'bg-primary/50 cursor-not-allowed',
              ].join(' ')}
            >
              {isSubmitting ? 'Saving...' : (syncUnavailable ? 'Stage Locally' : 'Add Link')}
            </button>
          </div>
        </div>
      )}

      {localLinks.length > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Local Context · session only
          </div>
          <div className="flex flex-wrap gap-1">
            {localLinks.map((link) => (
              <div
                key={link.id}
                data-testid="links-local-staged-link"
                title={link.url}
                className="px-2 py-1 rounded text-[10px] font-medium max-w-[160px] truncate"
                style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}
              >
                {link.url}
              </div>
            ))}
          </div>
        </div>
      )}

      {!showStaging && !state.loading && chips.length > 0 && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Context Links
          </div>
          <div className="flex flex-wrap gap-1">
            {chips.map((item) => {
              const colors = STATUS_COLOR[item.status] ?? STATUS_COLOR.inactive;
              return (
                <div
                  key={item.id}
                  title={item.label}
                  className="px-2 py-1 rounded text-[10px] font-medium max-w-[120px] truncate"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
