import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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

export default function LinksModule({ onClose }: Props) {
  const state = useOmniModuleState('links');
  const chips = state.items.slice(0, 6);
  const [isStaging, setIsStaging] = useState(false);
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [omniSlateBlocked, setOmniSlateBlocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedUrl = url.trim();
  const urlIsValid = isValidHttpUrl(trimmedUrl);
  const showValidationError = touched && trimmedUrl.length > 0 && !urlIsValid;

  // Links collect URL/context — they are NOT app integrations and must never
  // reach OmniBoard or trigger-workflow. add-link/send-to-omnislate are handled
  // entirely in local component state here (return true so ModuleShell does not
  // dispatch them to the backend).
  const handleAction = async (actionId: string, _selected: string[]) => {
    if (actionId === 'add-link' || actionId === 'add_link') {
      setOmniSlateBlocked(false);
      setIsStaging(true);
      return true;
    }
    if (actionId === 'send-to-omnislate' || actionId === 'send_to_omnislate') {
      setOmniSlateBlocked(true);
      return true;
    }
    return false;
  };

  const handleStageLink = async () => {
    if (!urlIsValid || isSubmitting) {
      setTouched(true);
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
      // Force reload to validate readback from durable storage
      window.location.reload();
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction}>
      {omniSlateBlocked && (
        <div className="rounded-lg border border-red-400/30 px-3 py-2 bg-red-400/5 text-[11px] text-red-400">
          OmniSlate context handoff is not connected yet.
        </div>
      )}

      {isStaging ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border/30 px-3 py-3 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Stage URL Context
          </div>
          <input
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
            <button
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
              {isSubmitting ? 'Saving...' : 'Add Link'}
            </button>
          </div>
        </div>
      ) : (
        !state.loading && chips.length > 0 && (
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
        )
      )}
    </ModuleShell>
  );
}
