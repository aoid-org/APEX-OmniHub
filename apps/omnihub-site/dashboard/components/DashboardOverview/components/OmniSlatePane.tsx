import { memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import lightbulbIcon from '../../../../src/assets/lightbulb-icon.png';
import { useOmniDash } from '../../../../src/stores/omniDashStore';
import { SPRING, GLASS_TILE, HC, ORANGE_GHOST, APEX_ORANGE, PROMPT_STYLE_BASE } from '../constants';
import type { ContextItem } from '../../../types/context.types';
import { ContextTile } from './ContextTile';
import { RecordButton } from './RecordButton';

const WIDGET_ID = 'omnislate-pane';

interface OmniSlatePaneProps {
  readonly context: readonly ContextItem[];
  readonly health: 'green' | 'yellow' | 'red';
  readonly activeInsight: string | null;
  readonly prompt: string;
  readonly isRecording: boolean;
  readonly recordingDuration: number;
  readonly traceLogs: readonly string[];
  readonly onCleanSlate: () => void;
  readonly onToggleGlobalInsight: () => void;
  readonly onToggleInsight: (name: string) => void;
  readonly onPromptChange: (v: string) => void;
  readonly onCommandSubmit: () => void;
  readonly onToggleRecording: () => void;
}

export const OmniSlatePane = memo(function OmniSlatePane({
  context,
  health,
  activeInsight,
  prompt,
  isRecording,
  recordingDuration,
  traceLogs,
  onCleanSlate,
  onToggleGlobalInsight,
  onToggleInsight,
  onPromptChange,
  onCommandSubmit,
  onToggleRecording,
}: OmniSlatePaneProps) {
  const s = HC[health];
  const firstLog = traceLogs[0] ?? null;
  const traceColor = firstLog?.includes('COMPLETE') ? '#34d399' : '#facc15';

  const canvasRef = useRef<HTMLDivElement>(null);

  const { openWidget, moveWidget, focusWidget } = useOmniDash();
  const widgetState = useOmniDash(st => st.widgets.get(WIDGET_ID));

  const motionX = useMotionValue(widgetState?.position.x ?? 0);
  const motionY = useMotionValue(widgetState?.position.y ?? 0);

  // Register with omniDashStore on mount
  useEffect(() => {
    openWidget(WIDGET_ID, 'OmniSlate', 'omniSlatePane', { x: 0, y: 0 }, { width: 780, height: 520 });
  }, [openWidget]);

  const pos = widgetState?.position;
  // Sync motion values from store when store position changes
  useEffect(() => {
    if (pos) {
      motionX.set(pos.x);
      motionY.set(pos.y);
    }
  }, [pos, motionX, motionY]);

  const handleDragEnd = () => {
    moveWidget(WIDGET_ID, { x: motionX.get(), y: motionY.get() });
  };

  const handlePointerDown = () => {
    focusWidget(WIDGET_ID);
  };

  return (
    <div ref={canvasRef} style={{ position: 'relative', height: '100%' }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.05 }}
        whileHover={{ scale: 1.005, transition: SPRING }}
        drag
        dragMomentum={false}
        dragConstraints={canvasRef}
        onPointerDown={handlePointerDown}
        onDragEnd={handleDragEnd}
        className={
          'apex-hero-tile apex-hero-tile--lg' +
          ' pointer-events-auto' +
          ' flex flex-col justify-end relative overflow-hidden'
        }
        style={{
          ...GLASS_TILE,
          padding: 24,
          x: motionX,
          y: motionY,
          zIndex: widgetState?.zIndex ?? 100,
          touchAction: 'none',
        }}
      >
        <div className="apex-noise-layer" />

        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1000,
            padding: '8px 14px',
            fontSize: 10,
            fontWeight: 800,
            color: '#5a6478',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          OmniSlate
        </span>

        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
          }}
        >
          <button
            type="button"
            onClick={onCleanSlate}
            style={{
              ...ORANGE_GHOST,
              fontSize: 11.77,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 8,
            }}
          >
            CleanSlate
          </button>
          {health !== 'green' && (
            <button
              type="button"
              onClick={onToggleGlobalInsight}
              title="View health insights"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                cursor: 'pointer',
                background: s.bg,
                border: `1px solid ${s.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={lightbulbIcon}
                alt="Insights"
                style={{ width: 14, height: 14 }}
              />
            </button>
          )}
        </div>

        <div className="relative z-10 flex flex-col gap-3" style={{ minWidth: 0 }}>
          {activeInsight === '__global__' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                marginBottom: 8,
                background: s.bg,
                border: `1px solid ${s.border}`,
                fontSize: 12.84,
                color: s.text,
                lineHeight: 1.5,
              }}
            >
              {context
                .filter(c => c.health !== 'green')
                .map(c => (
                  <div key={c.name} style={{ marginBottom: 4 }}>
                    <strong>{c.name}:</strong> {c.insight}
                  </div>
                ))}
            </div>
          )}

          {context.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 8,
                maxHeight: 80,
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
              <AnimatePresence>
                {context.map(ctx => (
                  <ContextTile
                    key={ctx.name}
                    ctx={ctx}
                    activeInsight={activeInsight}
                    onToggle={onToggleInsight}
                  />
                ))}
              </AnimatePresence>
              <button
                type="button"
                style={{
                  ...ORANGE_GHOST,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '5px 14px',
                  borderRadius: 10,
                }}
              >
                + Add context
              </button>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 'auto',
            }}
          >
            <input
              type="text"
              value={prompt}
              onChange={e => onPromptChange(e.target.value)}
              onFocus={e => {
                e.currentTarget.style.borderColor =
                  'rgba(255,255,255,0.25)';
                e.currentTarget.style.background =
                  'rgba(255,255,255,0.05)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor =
                  'rgba(255,255,255,0.1)';
                e.currentTarget.style.background =
                  'rgba(255,255,255,0.03)';
              }}
              placeholder="Ask APEX Agent"
              style={PROMPT_STYLE_BASE}
            />
            <RecordButton
              isRecording={isRecording}
              duration={recordingDuration}
              onToggle={onToggleRecording}
            />
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(194,80,31,0.08)',
                border: '1px solid rgba(194,80,31,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              +
            </div>
            <button
              type="button"
              onClick={onCommandSubmit}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  `linear-gradient(135deg, #f97316, ${APEX_ORANGE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(194,80,31,0.3)',
              }}
            >
              <span style={{ fontSize: 12, color: '#dfe6fe' }}>▶</span>
            </button>
          </div>

          {firstLog && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 700,
                color: traceColor,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {firstLog}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});
