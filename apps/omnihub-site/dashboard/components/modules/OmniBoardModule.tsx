/**
 * OmniBoardModule — Module shell wrapping OmniBoardWizard.
 * Registered in ModuleRenderer as 'omniboard' and 'omniboard-wizard'.
 * OWNED BY: APEX Business Systems Ltd.
 */
import { useOmniModal } from '@/stores/omniModalStore';
import { OmniBoardWizard } from '../OmniBoardWizard';

// VITE_ORCHESTRATOR_URL must be set in the Cloudflare Pages environment.
// If unset, the wizard cannot start — show a clear error rather than a blank or
// auto-failing modal.
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL ?? '';

interface Props {
  readonly onClose: () => void;
}

export default function OmniBoardModule({ onClose }: Props) {
  const { close } = useOmniModal();

  const handleComplete = (_connectionSpec: Record<string, unknown>) => {
    // Connection established — close modal; OmniBoardStore hydration
    // happens inside OmniBoardWizard on COMPLETION state.
    close();
  };

  const handleDismiss = () => {
    close();
    onClose();
  };

  if (!ORCHESTRATOR_URL) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-card rounded-xl border border-border/40 max-w-md w-[400px]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">OmniBoard — App Integration</h3>
          <button type="button" onClick={handleDismiss} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
        <p className="text-xs text-red-400">
          Connection service is not configured.<br />
          Set VITE_ORCHESTRATOR_URL or route OmniBoard through the authenticated OmniHub gateway.
        </p>
      </div>
    );
  }

  return <OmniBoardWizard onComplete={handleComplete} onDismiss={handleDismiss} />;
}
