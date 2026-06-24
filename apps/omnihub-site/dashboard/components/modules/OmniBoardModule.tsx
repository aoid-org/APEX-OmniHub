/**
 * OmniBoardModule — Module shell wrapping OmniBoardWizard for App Integration.
 * Registered in ModuleRenderer as 'omniboard' and 'omniboard-wizard'.
 * OWNED BY: APEX Business Systems Ltd.
 *
 * NOTE: Orchestrator access is exclusively managed by the omnilink-port Edge
 * Function via the server-side ORCHESTRATOR_URL env var. The frontend must
 * NOT gate on VITE_ORCHESTRATOR_URL — doing so creates a false dependency
 * and blocks the UI even when the edge function is fully operational.
 */
import { useOmniModal } from '@/stores/omniModalStore';
import { OmniBoardWizard } from '../OmniBoardWizard';

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

  // Edge function (omnilink-port) reports service unavailability via 503;
  // OmniBoardWizard surfaces that as an honest error. No client-side gate needed.
  return <OmniBoardWizard onComplete={handleComplete} onDismiss={handleDismiss} />;
}
