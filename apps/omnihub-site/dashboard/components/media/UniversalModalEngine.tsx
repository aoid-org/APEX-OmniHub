/**
 * UniversalModalEngine — Schema-Driven Adaptive Modal Renderer
 * @version 1.1.0
 * @module src/components/omnidash/media/UniversalModalEngine
 *
 * Mounted once in OmniDashLayout, renders modals on demand from
 * the omniModalStore. Dynamically constructs shadcn/ui Dialog
 * content based on the ModalType — oauth, form, selection, confirmation.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same modal config always produces identical render
 * - Kinematic Exit: Dialog stays in DOM with open={false} so Radix runs exit animations
 * - Regression-Free: Processing state is local (useState), not global
 * - Modularity: Each modal type is an isolated render path
 * - Enterprise Reliability: onComplete errors caught and logged, never crash UI
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useState } from 'react';
import { useOmniModal } from '@/stores/omniModalStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { ModuleRenderer } from '../ModuleRenderer';

export function UniversalModalEngine() {
  const { activeModal, isOpen, close, abortModal } = useOmniModal();
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset processing state on modal change — idempotent
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setIsProcessing(false);
  }, [isOpen]);

  // CRITICAL: Do NOT return null when activeModal is absent.
  // Shadcn/Radix requires the Dialog wrapper to remain in the DOM
  // with open={false} to execute kinematic exit animations (fade out, scale down).
  // Returning null would sever the animation lifecycle.

  const handleOpenChange = (open: boolean) => {
    if (!open && activeModal) {
      abortModal('USER_DISMISSED');
    }
  };

  const handleAction = async (payload: Record<string, unknown>) => {
    if (!activeModal) return;
    setIsProcessing(true);
    try {
      await activeModal.onComplete({
        ...payload,
        context: activeModal.contextData,
      });
      close();
    } catch (err: unknown) {
      console.error(
        `[OmniModal] Failed to process ${activeModal.provider} action:`,
        err,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (!activeModal) return null;

    switch (activeModal.type) {
      case 'oauth':
        return (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Connect your <strong>{activeModal.provider}</strong> account to
              synchronize data directly into OmniBoard.
            </p>
            <Button
              onClick={() => handleAction({ action: 'init_oauth' })}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Authorize {activeModal.provider}
            </Button>
          </div>
        );

      case 'form':
        return (
          <div className="py-4">
            <div className="p-6 border border-dashed rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
              <p className="mb-2 font-medium">Dynamic Form Renderer</p>
              <p className="text-xs">
                Schema-driven fields will be generated from the connector&apos;s JSON schema.
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={close} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={() => handleAction({ status: 'submitted' })}
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </div>
        );

      case 'selection':
        return (
          <div className="py-4">
            <div className="space-y-2">
              {activeModal.schema?.items &&
              Array.isArray(activeModal.schema.items)
                ? (activeModal.schema.items as ReadonlyArray<Record<string, unknown>>).map(
                    (item, idx) => {
                      const itemKey = typeof item.id === 'string' || typeof item.id === 'number'
                        ? String(item.id)
                        : String(idx);
                      let itemLabel = `Option ${idx + 1}`;
                      if (typeof item.label === 'string') {
                        itemLabel = item.label;
                      } else if (typeof item.name === 'string') {
                        itemLabel = item.name;
                      }
                      return (
                        <button
                          key={itemKey}
                          type="button"
                          className="w-full text-left px-4 py-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-sm"
                          onClick={() => handleAction({ selected: item, selectedId: itemKey })}
                          disabled={isProcessing}
                        >
                          {itemLabel}
                        </button>
                      );
                    },
                  )
                : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No selection items provided.
                  </p>
                )}
            </div>
          </div>
        );

      case 'vision_redact':
      case 'vision_confirm':
        return (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <ExternalLink className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Setup Required</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              The {activeModal.type} interface is not fully wired to the backend yet.
              Please connect your APEX Infrastructure provider to enable this feature.
            </p>
            <div className="pt-4">
              <Button variant="outline" onClick={close}>
                Close
              </Button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="py-4">
            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={() => handleAction({ confirmed: true })}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirm
              </Button>
            </DialogFooter>
          </div>
        );

      case 'mcp_tool_approve':
        return (
          <div className="py-4">
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              <p className="font-semibold mb-1">Security Warning: Destructive Operation</p>
              <p className="text-xs opacity-90">The agent is requesting permission to execute an MCP tool that may modify or delete data.</p>
            </div>
            {activeModal.contextData && (
              <div className="p-3 mb-4 rounded-md bg-muted/60 border font-mono text-[11px] overflow-auto max-h-[160px] text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(activeModal.contextData, null, 2)}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={isProcessing}>
                Deny Action
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction({ approved: true })}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve Execution
              </Button>
            </DialogFooter>
          </div>
        );

      case 'module':
        return (
          <ModuleRenderer
            moduleKey={
              typeof activeModal.contextData?.moduleKey === 'string'
                ? activeModal.contextData.moduleKey
                : activeModal.id
            }
            onClose={close}
          />
        );

      default:
        return null;
    }
  };

  const hasDescription = Boolean(activeModal?.description);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        {...(hasDescription ? {} : { 'aria-describedby': undefined })}
      >
        {activeModal && (
          <DialogHeader>
            <DialogTitle>{activeModal.title}</DialogTitle>
            {activeModal.description && activeModal.type !== 'confirmation' && (
              <DialogDescription>{activeModal.description}</DialogDescription>
            )}
            {activeModal.type === 'confirmation' && activeModal.description && (
              <DialogDescription>
                {activeModal.description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
