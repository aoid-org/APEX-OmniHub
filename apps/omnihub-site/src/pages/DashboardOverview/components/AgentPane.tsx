import { memo } from 'react';
import { motion } from 'framer-motion';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import { SPRING, GLASS_TILE, CTRL_BTN, BARS } from '../constants';

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

  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={SPRING}
      whileHover={{ scale: 1.01, transition: SPRING }}
      className={
        'apex-hero-tile apex-hero-tile--sm' +
        ' flex flex-col items-center justify-center' +
        ' relative overflow-y-auto overflow-x-hidden'
      }
      style={{ ...GLASS_TILE, padding: 20 }}
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
            00:00
          </span>
        </div>

        <motion.div
          className="agent-orb"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
        >
          <div className="agent-orb-glow" />
          <div className="agent-orb-ring" />
          <div className="agent-orb-ring-2" />
          <div className="agent-orb-ring-3" />
          <div className="agent-orb-avatar">
            <img src={sentinelAvatar} alt="APEX Agent" />
          </div>
        </motion.div>

        <div className="flex flex-row items-center justify-center gap-3">
          <button
            title="Play"
            className={
              'w-8 h-8 rounded-full flex' +
              ' items-center justify-center cursor-pointer'
            }
            style={CTRL_BTN}
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
            className={
              'w-8 h-8 rounded-full flex' +
              ' items-center justify-center cursor-pointer'
            }
            style={CTRL_BTN}
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
          {isStandby ? (
            <span className="text-yellow-400">⏸ Standby</span>
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
  );
});
