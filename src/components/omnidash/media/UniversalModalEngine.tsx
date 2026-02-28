/**
 * UniversalModalEngine — Schema-Driven Adaptive Modal Renderer
 * @version 2.0.0
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
 * - Enterprise Reliability: resolveModal/abortModal always called — no orphaned Promises
 * - Orphan-Free: onOpenChange intercepts Escape + backdrop to call abortModal —
 *   guarantees the pending Promise is always settled before state is cleared
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

export function UniversalModalEngine() {
  const { activeModal, resolveModal, abortModal } = useOmniModal();
  const isOpen = !!activeModal;
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset processing state whenever the modal closes — idempotent
  useEffect(() => {
    if (!activeModal) setIsProcessing(false);
  }, [activeModal]);

  // CRITICAL: Do NOT return null when activeModal is absent.
  // Shadcn/Radix requires the Dialog wrapper to remain in the DOM
  // with open={false} to execute kinematic exit animations (fade out, scale down).
  // Returning null would sever the animation lifecycle.

  const handleOpenChange = (open: boolean) => {
    if (!open && activeModal) {
      abortModal('USER_DISMISSED');
    }
  };

  /**
   * Resolve the modal Promise with the action payload.
   * Clears state via resolveModal — setIsProcessing reset by the useEffect above.
   */
  const handleAction = (payload: Record<string, unknown>) => {
    setIsProcessing(true);
    resolveModal({ ...payload, context: activeModal.contextData });
  };

  /**
   * Intercept Shadcn Dialog background clicks and Escape keypresses.
   * Calling abortModal() rejects the pending Promise before clearing state,
   * preventing orphaned coroutines in the invoking widget.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      abortModal('USER_DISMISSED');
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
              <Button
                variant="outline"
                onClick={() => abortModal('USER_CANCELLED')}
                disabled={isProcessing}
              >
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
                          onClick={() => handleAction({ selected: item })}
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

      case 'confirmation':
        return (
          <div className="py-4">
            {activeModal.description && (
              <p className="text-sm text-muted-foreground mb-4">
                {activeModal.description}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => abortModal('USER_CANCELLED')}
                disabled={isProcessing}
              >
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

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {activeModal && (
          <DialogHeader>
            <DialogTitle>{activeModal.title}</DialogTitle>
            {activeModal.description && activeModal.type !== 'confirmation' && (
              <DialogDescription>{activeModal.description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
