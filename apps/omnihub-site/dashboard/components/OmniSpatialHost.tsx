/**
 * OmniSpatialHost — Unified Polymorphic Modal Renderer
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/components/OmniSpatialHost
 *
 * Merges UniversalModalEngine (dialog modality) and OmniMediaModal (spatial
 * modality) into a single component. Uses resolveRenderMode() to pick the
 * correct renderer. Portal-mounts to #omni-portal-root for z-index isolation.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same config always produces identical render
 * - Kinematic Exit: Dialog keeps the wrapper in DOM for exit animations
 * - Regression-Free: Processing state is local (useState), not global
 * - Modularity: Each render mode is an isolated code path
 * - Enterprise Reliability: onComplete errors caught and logged, never crash UI
 * - Intent-Driven: resolveRenderMode() deterministically selects modality
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useState, useMemo, useCallback, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useOmniModal, resolveRenderMode } from '@/stores/omniModalStore';
import type { OmniModalConfig } from '@/stores/omniModalStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, CheckCircle2, Minimize2, Maximize2, X, GripHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_DAMPED, GPU_STYLE } from '@/lib/motionPresets';
import { registerOmniAppShell } from '@/lib/OmniAppShell';
import { sanitiseIframeUrl, getSandboxAttribute } from '@/lib/iframeOriginPolicy';
import { ModuleRenderer } from './ModuleRenderer';

// Register the sandbox Custom Element on module load
registerOmniAppShell();

// ============================================================================
// Constants
// ============================================================================

/** Apple-grade fluid spring for spatial canvas */
const SPATIAL_SPRING = { type: 'spring' as const, mass: 0.5, damping: 25, stiffness: 300, restDelta: 0.001 };

// ============================================================================
// Sub-Components: Form Modal (schema-driven field renderer)
// ============================================================================

interface FormField {
  key?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function FormModalRenderer({
  modal,
  isProcessing,
  onAction,
  onClose,
}: Readonly<{
  modal: OmniModalConfig;
  isProcessing: boolean;
  onAction: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}>) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const schemaFields = modal.schema?.fields as ReadonlyArray<FormField> | undefined;

  // Default fields when no schema provided
  const defaultFields: FormField[] = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Enter name…' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description…' },
  ];

  const fields = (schemaFields && schemaFields.length > 0) ? schemaFields : defaultFields;

  const handleChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onAction({ status: 'submitted', data: formValues });
  };

  return (
    <div className="py-4">
      <div className="space-y-4">
        {fields.map((field, idx) => {
          const key = field.key ?? String(idx);
          const label = field.label ?? `Field ${idx + 1}`;
          const type = field.type ?? 'text';
          const placeholder = field.placeholder ?? '';
          const inputClass =
            'w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground';
          const renderFieldInput = () => {
            if (type === 'textarea') {
              return (
                <textarea
                  className={`${inputClass} min-h-[80px] resize-none`}
                  placeholder={placeholder}
                  value={formValues[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  disabled={isProcessing}
                />
              );
            }
            if (type === 'select' && modal.schema?.options) {
              return (
                <select
                  className={inputClass}
                  value={formValues[key] ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">Select…</option>
                  {(modal.schema.options as ReadonlyArray<{ value: string; label: string }>).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              );
            }
            return (
              <input
                type={type}
                className={inputClass}
                placeholder={placeholder}
                value={formValues[key] ?? ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={isProcessing}
              />
            );
          };
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {renderFieldInput()}
            </div>
          );
        })}
      </div>
      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isProcessing}>
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Sub-Components: Dialog Mode
// ============================================================================

function DialogModeRenderer({
  modal,
  isProcessing,
  onAction,
  onClose,
}: Readonly<{
  modal: OmniModalConfig;
  isProcessing: boolean;
  onAction: (payload: Record<string, unknown>) => void;
  onClose: () => void;
}>) {
  switch (modal.type) {
    case 'oauth':
      return (
        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Connect your <strong>{modal.provider}</strong> account to
            synchronize data directly into OmniBoard.
          </p>
          <Button
            onClick={() => onAction({ action: 'init_oauth' })}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Authorize {modal.provider}
          </Button>
        </div>
      );

    case 'form':
      return (
        <FormModalRenderer
          modal={modal}
          isProcessing={isProcessing}
          onAction={onAction}
          onClose={onClose}
        />
      );

    case 'selection':
      return (
        <div className="py-4">
          <div className="space-y-2">
            {modal.schema?.items &&
            Array.isArray(modal.schema.items)
              ? (modal.schema.items as ReadonlyArray<Record<string, unknown>>).map(
                  (item, idx) => {
                    const itemKey = typeof item.id === 'string' || typeof item.id === 'number'
                      ? String(item.id)
                      : String(idx);
                    let itemLabel = `Option ${String(idx + 1)}`;
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
                        onClick={() => onAction({ selected: item })}
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
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={() => onAction({ confirmed: true })}
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

    case 'module':
      return (
        <ModuleRenderer
          moduleKey={
            typeof modal.contextData?.moduleKey === 'string'
              ? modal.contextData.moduleKey
              : modal.id
          }
          onClose={onClose}
        />
      );

    default:
      return null;
  }
}

// ============================================================================
// Sub-Components: Spatial Mode
// ============================================================================

function SpatialPayloadRenderer({ payload }: Readonly<{ payload: OmniModalConfig }>) {
  const appType = payload.contextData?.appType as string | undefined;
  const url = payload.contextData?.url as string | undefined;
  const initialContent = payload.contextData?.initialContent as string | undefined;
  const processId = payload.contextData?.processId as string | undefined;

  switch (appType) {
    case 'media': {
      const isDemoMode = typeof process !== 'undefined' ? process.env.VITE_IS_DEMO_MODE === 'true' : false;
      const result = sanitiseIframeUrl(url, isDemoMode);
      if (!result.allowed) {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center bg-destructive/10 text-destructive p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Media Blocked</h3>
            <p className="mb-4">This media source was blocked by the APEX Origin Policy.</p>
            <p className="font-mono text-xs opacity-80 bg-background/50 p-2 rounded">Reason: {result.reason}</p>
          </div>
        );
      }
      return (
        <iframe
          className="omni-spatial-iframe"
          src={url}
          allow="autoplay; encrypted-media"
          title={payload.title}
          sandbox={getSandboxAttribute(result.profile)}
        />
      );
    }
    case 'editor':
      return <div className="omni-spatial-editor">{initialContent}</div>;
    case 'terminal':
      return <div className="omni-spatial-terminal">Connected: {processId}...</div>;
    default:
      return <div className="omni-spatial-default">{payload.description ?? payload.title}</div>;
  }
}

/** Check if viewport is mobile-sized */
function isMobileViewport(): boolean {
  return typeof globalThis !== 'undefined' && 'innerWidth' in globalThis
    ? globalThis.innerWidth < 640
    : false;
}

function getPipStyles(): CSSProperties {
  const mobile = isMobileViewport();
  return {
    bottom: mobile ? 16 : 32,
    right: mobile ? 16 : 32,
    width: mobile ? 160 : 420,
    height: mobile ? 112 : 280,
    borderRadius: mobile ? 12 : 16,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(40px)',
  };
}

function getFullStyles(): CSSProperties {
  const mobile = isMobileViewport();
  return {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'calc(100% - 32px)',
    maxWidth: 1024,
    height: '85dvh',
    borderRadius: mobile ? 16 : 24,
    background: 'rgba(15,48,75,0.8)',
    backdropFilter: 'blur(40px)',
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function OmniSpatialHost() {
  const { activeModal, isOpen, close, abortModal } = useOmniModal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Root issue: Native click events on triggers bubble up and immediately trigger
  // Radix Dialog's InteractOutside handler. We use a ref to track mount time and ignore
  // outside clicks that happen instantly after opening.
  const mountTime = useRef(0);

  // Determine render mode when modal changes
  const renderMode = useMemo(
    () => (activeModal ? resolveRenderMode(activeModal) : 'dialog'),
    [activeModal],
  );

  // Synchronously track when the modal opens to prevent bubbled clicks from instantly closing it
  const prevIsOpen = useRef(isOpen);
  if (isOpen && !prevIsOpen.current) {
    mountTime.current = Date.now();
  }
  prevIsOpen.current = isOpen;

  // Reset processing and PiP state on modal close
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setIsPiP(false);
    }
  }, [isOpen]);

  // Get the portal container
  const portalRoot = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('omni-portal-root');
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    // We only rely on onOpenChange for the ESCAPE key dismissal.
    // Outside clicks are now handled by our explicit custom backdrop.
    if (!open && activeModal) {
      if (Date.now() - mountTime.current < 300) return;
      abortModal('USER_DISMISSED');
    }
  }, [activeModal, abortModal]);

  const handleAction = useCallback(async (payload: Record<string, unknown>) => {
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
      toast.error(err instanceof Error ? err.message : "Action failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [activeModal, close]);

  const togglePiP = useCallback(() => setIsPiP((prev) => !prev), []);

  const closeModal = useCallback(() => {
    setIsPiP(false);
    close();
  }, [close]);

  const spatialCanvasStyle = useMemo<CSSProperties>(() => ({
    pointerEvents: 'auto',
    position: 'absolute',
    willChange: 'transform',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
    ...(isPiP ? getPipStyles() : getFullStyles()),
  }), [isPiP]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DIALOG MODE — Radix Dialog with shadcn/ui (existing UniversalModalEngine)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDialogMode = () => {
    const hasDescription = Boolean(activeModal?.description);

    const dialogOpen = isOpen && renderMode === 'dialog';
    return (
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        {/* Custom explicit backdrop — only rendered when modal is open to avoid blocking page interactions */}
        {dialogOpen && (
          <button
            type="button"
            aria-label="Close modal"
            className="fixed inset-0 z-[9000] w-full h-full border-none bg-transparent cursor-default animate-in fade-in-0"
            onClick={(e) => {
              if (e.target === e.currentTarget && Date.now() - mountTime.current >= 300) {
                abortModal('USER_DISMISSED');
              }
            }}
          />
        )}
        <DialogContent
          className={
            activeModal?.type === 'module'
              ? 'z-[9001] sm:max-w-[560px]'
              : 'z-[9001] sm:max-w-[425px]'
          }
          {...(hasDescription ? {} : { 'aria-describedby': undefined })}
          // Hard-disable Radix's unreliable DismissableLayer event tracking
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {activeModal && (
            <DialogHeader>
              <DialogTitle>{activeModal.title}</DialogTitle>
              {activeModal.description && (
                <DialogDescription>{activeModal.description}</DialogDescription>
              )}
            </DialogHeader>
          )}
          {activeModal && (
            <DialogModeRenderer
              modal={activeModal}
              isProcessing={isProcessing}
              onAction={handleAction}
              onClose={close}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SPATIAL MODE — Framer Motion canvas with PiP (existing OmniMediaModal)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSpatialMode = () => {
    if (!activeModal || renderMode !== 'spatial') return null;

    return (
      <AnimatePresence>
        {isOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-index-omnimodal, 500)' as unknown as number, pointerEvents: 'none' }}>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isPiP ? 0 : 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                pointerEvents: isPiP ? 'none' : 'auto',
              }}
              onClick={isPiP ? undefined : closeModal}
            />

            {/* SPATIAL CANVAS */}
            <motion.div
              layout
              data-pip={isPiP}
              data-testid="omni-spatial-canvas"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={SPATIAL_SPRING}
              drag={isPiP}
              dragMomentum={true}
              dragElastic={0.1}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              style={spatialCanvasStyle}
            >
              {/* WINDOW CONTROLS */}
              <motion.div
                layout
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: 48, zIndex: 50,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 16px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                }}
              >
                {isPiP ? (
                  <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                    <GripHorizontal style={{ color: 'rgba(255,255,255,0.3)', width: 20, height: 20, marginLeft: 8 }} />
                  </div>
                ) : <div style={{ flex: 1 }} />}

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
                }}>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={togglePiP}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    {isPiP ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={closeModal}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>

              {/* EVENT SHIELD */}
              {isDragging && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'transparent' }} />
              )}

              {/* PAYLOAD */}
              <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}>
                <SpatialPayloadRenderer payload={activeModal} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SANDBOX MODE — Shadow DOM Custom Element
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSandboxMode = () => {
    if (!activeModal || renderMode !== 'sandbox' || !isOpen) return null;

    const sandboxConfig = JSON.stringify({
      title: activeModal.title,
      entryUrl: activeModal.contextData?.entryUrl,
      htmlContent: activeModal.contextData?.htmlContent,
    });

    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'var(--z-index-omnimodal, 500)' as unknown as number,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        data-testid="omni-sandbox-overlay"
      >
        {/* BACKDROP */}
        <button
          type="button"
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
            border: 'none', cursor: 'pointer', padding: 0,
          }}
          onClick={closeModal}
          aria-label="Close sandbox"
        />

        {/* SANDBOX CONTAINER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={SPRING_DAMPED}
          style={{
            position: 'relative',
            width: 'calc(100% - 48px)',
            maxWidth: 900,
            height: '80dvh',
            borderRadius: 20,
            overflow: 'hidden',
            background: 'rgba(15,48,75,0.9)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 40px rgba(194,80,31,0.08)',
            display: 'flex',
            flexDirection: 'column',
            ...GPU_STYLE,
          }}
        >
          {/* TITLE BAR */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15,23,41,0.6)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 8px rgba(249,115,22,0.6)',
              }} />
              <span style={{ fontSize: 13, color: '#e0e7ff', letterSpacing: '-0.01em' }}>
                {activeModal.title}
              </span>
              <span style={{
                fontSize: 10, color: 'rgba(224,231,255,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '2px 8px', borderRadius: 6,
                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              }}>
                SANDBOX
              </span>
            </div>
            <button
              type="button"
              onClick={closeModal}
              style={{
                background: 'none', border: 'none', color: '#9ca3af',
                cursor: 'pointer', padding: 4, display: 'flex',
                borderRadius: 6,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* SHADOW DOM HOST */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {/* @ts-expect-error — Custom element not in JSX.IntrinsicElements */}
            <omni-app-shell
              data-config={sandboxConfig}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </motion.div>
      </div>
    );
  };

  const customModes = (
    <>
      {renderSpatialMode()}
      {renderSandboxMode()}
    </>
  );

  return (
    <>
      {renderDialogMode()}
      {portalRoot ? createPortal(customModes, portalRoot) : customModes}
    </>
  );
}
