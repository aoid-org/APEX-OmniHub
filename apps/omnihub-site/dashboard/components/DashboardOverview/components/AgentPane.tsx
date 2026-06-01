import { memo, useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { AVATAR_PATH_MAP } from '../../../contracts/agentAvatars';
import { useOmniDash } from '../../../../src/stores/omniDashStore';
import { SPRING, GLASS_TILE, CTRL_BTN, BARS } from '../constants';

const WIDGET_ID = 'agent-pane';

interface AgentPaneProps {
  readonly agentStatus: 'listening' | 'standby';
}

export const AgentPane = memo(function AgentPane({
  agentStatus,
}: AgentPaneProps) {
  const isStandby = agentStatus === 'standby';
  const chipOverride = isStandby
    ? {
        background: 'rgba(250,204,21,0.1)',
        color: '#facc15',
        borderColor: 'rgba(250,204,21,0.2)',
      }
    : undefined;

  const [isRunning, setIsRunning] = useState<boolean>(!isStandby);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { openWidget, moveWidget, focusWidget } = useOmniDash();
  const widgetState = useOmniDash(s => s.widgets.get(WIDGET_ID));

  const x = useMotionValue(widgetState?.position.x ?? 0);
  const y = useMotionValue(widgetState?.position.y ?? 0);

  // Register with omniDashStore on mount
  useEffect(() => {
    openWidget(WIDGET_ID, 'APEX Agent', 'agentPane', { x: 0, y: 0 }, { width: 364, height: 468 });
  }, [openWidget]);

  const pos = widgetState?.position;
  // Sync motion values from store when store position changes
  useEffect(() => {
    if (pos) {
      x.set(pos.x);
      y.set(pos.y);
    }
  }, [pos, x, y]);

  const mm = "00";
  const ss = "00";

  const handlePlay = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  return (
    <div ref={canvasRef} style={{ position: 'relative', height: '100%' }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={SPRING}
        whileHover={{ scale: 1.01, transition: SPRING }}
        drag
        dragMomentum={false}
        dragConstraints={canvasRef}
        onPointerDown={() => focusWidget(WIDGET_ID)}
        onDragEnd={() => moveWidget(WIDGET_ID, { x: x.get(), y: y.get() })}
        className={
          'apex-hero-tile apex-hero-tile--sm' +
          ' flex flex-col items-center justify-center' +
          ' relative overflow-hidden'
        }
        style={{
          ...GLASS_TILE,
          padding: 20,
          x,
          y,
          zIndex: widgetState?.zIndex ?? 100,
          touchAction: 'none',
        }}
      >
        <div className="apex-noise-layer" />
        <div
          className={
            'relative z-10 flex flex-col' +
            ' items-center justify-center h-full w-full gap-4'
          }
        >
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#8b95a8',
              }}
            >
              APEX Agent
            </span>
            <span className="chip-live" style={chipOverride}>
              {isStandby ? 'Standby' : 'Active'}
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#5a6478',
              }}
            >
              Session
            </span>
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 20,
                fontWeight: 800,
                color: '#e8ecf4',
                letterSpacing: '-0.02em',
              }}
            >
              {mm}:{ss}
            </span>
          </div>

          <div className="agent-orb">
            <div className="agent-orb-glow" />
            <div className="agent-orb-ring" />
            <div className="agent-orb-ring-2" />
            <div className="agent-orb-ring-3" />
            <div className="agent-orb-avatar">
              <img src={AVATAR_PATH_MAP.Sentinel} alt="APEX Agent" loading="lazy" decoding="async" />
            </div>
          </div>

          <div className="flex flex-row items-center justify-center gap-3">
            <button
              title="Play"
              onClick={handlePlay}
              disabled={isRunning}
              className={
                'w-8 h-8 rounded-full flex' +
                ' items-center justify-center cursor-pointer'
              }
              style={{
                ...CTRL_BTN,
                opacity: isRunning ? 0.4 : 1,
                cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
            <button
              title="Pause"
              onClick={handlePause}
              disabled={!isRunning}
              className={
                'w-8 h-8 rounded-full flex' +
                ' items-center justify-center cursor-pointer'
              }
              style={{
                ...CTRL_BTN,
                opacity: isRunning ? 1 : 0.4,
                cursor: isRunning ? 'pointer' : 'not-allowed',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          </div>

          <div className="mt-1 text-xs flex items-center gap-2">
            {isStandby || !isRunning ? (
              <span className="text-yellow-400">⏸ {isStandby ? 'Standby' : 'Paused'}</span>
            ) : (
              <>
                {BARS.map(bar => (
                  <div
                    key={bar.id}
                    style={{
                      width: 3,
                      height: bar.h,
                      borderRadius: 2,
                      background: '#34d399',
                      opacity: 0.7,
                    }}
                  />
                ))}
                <span className="text-emerald-400 ml-1">
                  Listening...
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
