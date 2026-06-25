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
import { Minimize2, Maximize2, X, GripHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_DAMPED, GPU_STYLE } from '@/lib/motionPresets';
import { registerOmniAppShell } from '@/lib/OmniAppShell';
import { sanitiseIframeUrl, getSandboxAttribute } from '@/lib/iframeOriginPolicy';
import { DialogModeRenderer } from './OmniSpatialDialogRenderers';

// Register the sandbox Custom Element on module load
registerOmniAppShell();

// ============================================================================
// Constants
// ============================================================================

/** Apple-grade fluid spring for spatial canvas */
const SPATIAL_SPRING = { type: 'spring' as const, mass: 0.5, damping: 25, stiffness: 300, restDelta: 0.001 };

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
      let isDemoMode = false;
      if (typeof process !== 'undefined') {
        isDemoMode = process.env.VITE_IS_DEMO_MODE === 'true';
      }
      const result = sanitiseIframeUrl(url, isDemoMode);
      if (result.allowed) {
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
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-destructive/10 text-destructive p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Media Blocked</h3>
          <p className="mb-4">This media source was blocked by the APEX Origin Policy.</p>
          <p className="font-mono text-xs opacity-80 bg-background/50 p-2 rounded">Reason: {result.reason}</p>
        </div>
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
  if (typeof globalThis !== 'undefined' && 'innerWidth' in globalThis) {
    return globalThis.innerWidth < 640;
  }
  return false;
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
    background: '#0b1220',
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDialogDragging, setIsDialogDragging] = useState(false);
  const [isDialogPinned, setIsDialogPinned] = useState(false);

  // Determine render mode when modal changes
  const renderMode = useMemo(
    () => (activeModal ? resolveRenderMode(activeModal) : 'dialog'),
    [activeModal],
  );

  // Reset local UI state on modal close
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setIsPiP(false);
      setIsMinimized(false);
      setIsDialogDragging(false);
      setIsDialogPinned(false);
    }
  }, [isOpen]);

  // Escape key minimizes dialog-mode (does not destroy — top-right X destroys)
  useEffect(() => {
    if (!isOpen || renderMode !== 'dialog' || isMinimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMinimized(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isMinimized, renderMode]);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus-trap logic: trap focus within the dialog node
  useEffect(() => {
    if (!isOpen || renderMode !== 'dialog' || isMinimized) return;
    const dialogNode = dialogRef.current;
    if (!dialogNode) return;

    // Small delay to allow framer-motion mount before focusing
    const timer = setTimeout(() => {
      const focusableElements = dialogNode.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      firstElement.focus();

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      dialogNode.addEventListener('keydown', handleTab);
      // We attach it to the node, so we need to return the cleanup
      (dialogNode as any)._cleanupTab = () => dialogNode.removeEventListener('keydown', handleTab);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (dialogNode && (dialogNode as any)._cleanupTab) {
        (dialogNode as any)._cleanupTab();
      }
    };
  }, [isOpen, renderMode, isMinimized]);

  // Get the portal container
  const portalRoot = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('omni-portal-root');
  }, []);

  const minimizeModal = useCallback(() => setIsMinimized(true), []);
  const restoreModal = useCallback(() => setIsMinimized(false), []);

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
  // DIALOG MODE — custom mounted panel (no Radix Dialog lifecycle)
  //
  // Content div stays in DOM while isOpen=true so React state (forge wizard
  // step, form inputs, scroll) is preserved across minimize/restore cycles.
  // Outside-click minimizes to dock chip; top-right X destroys the modal.
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDialogMode = () => {
    if (renderMode !== 'dialog') return null;
    const hasDescription = Boolean(activeModal?.description);

    return (
      <>
        {/* Dark overlay + transparent click-capture — only when dialog is visible */}
        {isOpen && !isMinimized && (
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[8999] bg-black/50 animate-in fade-in-0"
            />
            <button
              type="button"
              aria-label="Close modal"
              className="fixed inset-0 z-[9000] w-full h-full border-none bg-transparent cursor-default animate-in fade-in-0"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  minimizeModal();
                }
              }}
            />
          </>
        )}

        {/* Dialog panel — always mounted while isOpen, hidden via display:none when minimized.
            Outer div centers; inner motion.div is draggable (pinned on drop). */}
        {isOpen && (
          <div className="fixed inset-0 z-[9001] flex items-center justify-center pointer-events-none">
            <motion.div
              drag={!isMinimized}
              dragMomentum={false}
              dragElastic={0}
              onDragStart={() => setIsDialogDragging(true)}
              onDragEnd={() => { setIsDialogDragging(false); setIsDialogPinned(true); }}
              role="dialog"
              aria-modal={!isMinimized}
              aria-label={activeModal?.title}
              data-testid="omni-dialog"
              data-state={isMinimized ? 'minimized' : isDialogDragging ? 'dragging' : isDialogPinned ? 'pinned' : 'open'}
              {...(!hasDescription ? { 'aria-describedby': undefined } : {})}
              ref={dialogRef}
              className={`pointer-events-auto relative w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] mx-auto border border-white/10 text-foreground p-6 shadow-lg sm:rounded-lg max-h-[calc(100dvh-2rem)] overflow-y-auto sm:w-full ${activeModal?.type === 'module' ? 'sm:max-w-[560px]' : 'sm:max-w-[425px]'}`}
              style={{ backgroundColor: '#0b1220', display: isMinimized ? 'none' : undefined, cursor: isDialogDragging ? 'grabbing' : 'default' }}
            >
              {/* Draggable title bar — grab to reposition; buttons stop propagation so they don't drag */}
              <div className="flex items-start justify-between mb-4 select-none" style={{ cursor: isDialogDragging ? 'grabbing' : 'grab' }}>
                {activeModal && <h2 className="text-lg font-semibold leading-none tracking-tight flex-1 pr-2">{activeModal.title}</h2>}
                <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                  <button type="button" aria-label="Minimize" className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none p-1 transition-opacity" onClick={minimizeModal}>
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="Close" className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none p-1 transition-opacity" onClick={() => abortModal('USER_DISMISSED')}>
                    <X className="h-4 w-4" /><span className="sr-only">Close</span>
                  </button>
                </div>
              </div>
              {activeModal?.description && <p className="text-sm text-muted-foreground mb-4">{activeModal.description}</p>}
              {activeModal && <DialogModeRenderer modal={activeModal} isProcessing={isProcessing} onAction={handleAction} onClose={close} />}
            </motion.div>
          </div>
        )}

        {/* Minimized dock chip — bottom-right, preserves modal identity */}
        {isMinimized && isOpen && activeModal && (
          <div
            className="fixed bottom-6 right-6 z-[9002] flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              backgroundColor: '#0b1220',
              border: '1px solid rgba(249,115,22,0.4)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <button
              type="button"
              aria-label={`Restore ${activeModal.title}`}
              className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
              onClick={restoreModal}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.6)' }}
              />
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {activeModal.title}
              </span>
            </button>
            <button
              type="button"
              aria-label="Close"
              className="flex items-center bg-transparent border-none cursor-pointer p-0 text-muted-foreground hover:text-foreground transition-colors ml-1"
              onClick={() => { setIsMinimized(false); abortModal('USER_DISMISSED'); }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SPATIAL MODE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSpatialMode = () => {
    if (!activeModal || renderMode !== 'spatial') return null;

    return (
      <AnimatePresence>
        {isOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-index-omnimodal, 500)', pointerEvents: 'none' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isPiP ? 0 : 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                pointerEvents: isPiP ? 'none' : 'auto',
              }}
              onClick={isPiP ? undefined : () => abortModal('USER_DISMISSED')}
            />
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
              {isDragging && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'transparent' }} />
              )}
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
  // SANDBOX MODE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSandboxMode = () => {
    if (!activeModal || renderMode !== 'sandbox') return null;

    const entryUrl = activeModal.contextData?.entryUrl;
    const htmlContent = activeModal.contextData?.htmlContent;
    // Sandbox is only meaningful with a payload to host. A modal that resolved to
    // sandbox without entryUrl/htmlContent (e.g. a moduleKey-only config that
    // should have used type: 'module') would otherwise render a blank/misleading
    // shell. Fail honestly instead.
    const hasPayload = Boolean(entryUrl) || Boolean(htmlContent);

    const sandboxConfig = JSON.stringify({
      title: activeModal.title,
      entryUrl,
      htmlContent,
    });

    return (
      <AnimatePresence>
      {isOpen && (
      <div
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'var(--z-index-omnimodal, 500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        data-testid="omni-sandbox-overlay"
      >
        <button
          type="button"
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
            border: 'none', cursor: 'pointer', padding: 0,
          }}
          onClick={() => abortModal('USER_DISMISSED')}
          aria-label="Close sandbox"
        />
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
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {hasPayload ? (
              <>
                {/* @ts-expect-error — Custom element not in JSX.IntrinsicElements */}
                <omni-app-shell
                  data-config={sandboxConfig}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </>
            ) : (
              <div
                data-testid="omni-sandbox-missing-payload"
                style={{
                  width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 24, textAlign: 'center',
                  color: '#fca5a5',
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ef4444', margin: 0 }}>
                  Microfrontend payload missing
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(224,231,255,0.6)', maxWidth: 420, margin: 0 }}>
                  This sandbox modal was invoked without an <code>entryUrl</code> or{' '}
                  <code>htmlContent</code>, so there is nothing to render. A module-backed
                  view should use <code>type: "module"</code> instead.
                </p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(224,231,255,0.4)', margin: 0 }}>
                  id:{activeModal.id} · provider:{activeModal.provider} · type:{activeModal.type}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      )}
      </AnimatePresence>
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

// Re-export ModuleRenderer for consumers that previously imported it from here
export { ModuleRenderer } from './ModuleRenderer';
