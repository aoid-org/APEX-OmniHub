/**
 * OmniMediaModal — Spatial Computing Engine V3
 *
 * Unified render tree with FLIP motion, GPU hinting, and Event Shield.
 * Uses layout prop on motion.div for zero DOM destruction on PiP toggle.
 *
 * Store API mapping:
 *   useOmniModal.isOpen    → controls AnimatePresence
 *   useOmniModal.activeModal → payload (OmniModalConfig)
 *   useOmniModal.close()   → closeModal action
 *   Local state: isPiP     → managed internally (no store mutation needed)
 */
import { useState, useMemo, type CSSProperties } from 'react';
import { useOmniModal } from '../../../../src/stores/omniModalStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Maximize2, X, GripHorizontal } from 'lucide-react';
import type { OmniModalConfig } from '../../../../src/stores/omniModalStore';

// APPLE-GRADE SPRING PHYSICS
const fluidSpring = { type: "spring" as const, mass: 0.5, damping: 25, stiffness: 300, restDelta: 0.001 };

/** Check if viewport is mobile-sized (< 640px). */
function isMobileViewport(): boolean {
  return typeof globalThis !== 'undefined' && 'innerWidth' in globalThis
    ? globalThis.innerWidth < 640
    : false;
}

/** Compute PiP positioning styles based on viewport. */
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

/** Compute full-screen modal styles based on viewport. */
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

/** Render payload content based on contextData.appType. */
function PayloadRenderer({ payload }: Readonly<{ payload: OmniModalConfig }>) {
  const appType = payload.contextData?.appType as string | undefined;
  const url = payload.contextData?.url as string | undefined;
  const initialContent = payload.contextData?.initialContent as string | undefined;
  const processId = payload.contextData?.processId as string | undefined;

  switch (appType) {
    case 'media':
      return <iframe className="omni-modal-iframe" src={url} allow="autoplay; encrypted-media" title={payload.title} />;
    case 'editor':
      return <div className="omni-modal-editor">{initialContent}</div>;
    case 'terminal':
      return <div className="omni-modal-terminal">Connected: {processId}...</div>;
    default:
      return <div className="omni-modal-default">{payload.description ?? payload.title}</div>;
  }
}

export function OmniMediaModal() {
  const { isOpen, activeModal, close } = useOmniModal();
  const [isPiP, setIsPiP] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const payload = activeModal;

  const togglePiP = () => setIsPiP((prev) => !prev);
  const closeModal = () => { setIsPiP(false); close(); };

  const canvasStyle = useMemo<CSSProperties>(() => ({
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

  if (!payload) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
          {/* BACKGROUND DIMMER - Only visible when full screen */}
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

          {/* THE UNIFIED MORPHING CANVAS */}
          <motion.div
            layout /* THE FLIP ENGINE: Zero DOM destruction on PiP toggle */
            data-pip={isPiP}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={fluidSpring}
            drag={isPiP}
            dragMomentum={true}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            style={canvasStyle}
          >
            {/* WINDOW CONTROLS & DRAG HANDLE */}
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

            {/* EVENT SHIELD: Prevents iframes from swallowing the drag event */}
            {isDragging && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'transparent' }} />
            )}

            {/* PAYLOAD RENDERER */}
            <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}>
              <PayloadRenderer payload={payload} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
