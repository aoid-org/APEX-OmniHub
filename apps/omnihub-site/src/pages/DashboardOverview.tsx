/**
 * DashboardOverview — OmniBoard Centre Content
 *
 * Canvas Architecture (DnD-Ready, SonarQube A-grade):
 *   - Zero CSS Grid. Flexbox + calc() widths only.
 *   - Hero row: Agent (25%) | OmniSlate (50%) | Ecosystems (25%)
 *   - Apps row: exactly 4 tiles across, uniform 150px height
 *   - Gaps: 24px hero canvas | 16px apps row
 *
 * Mic exclusion: recording ON → Agent shows "Standby"
 *                recording OFF → Agent returns to "Listening..."
 */

import {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Blocks } from 'lucide-react';
import { useOmniDashAction } from '../hooks/useOmniDashAction';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../packages/core/src/registry';

/* ── Real app logos via Clearbit ── */
const LOGO = (domain: string) =>
  `https://logo.clearbit.com/${domain}`;

/* ── Hidden apps ── */
const HIDDEN_APPS = new Set(['OmniBoard', 'OmniPort', 'Maestro']);

/* ── Framer Motion spring config (reused, no inline duplication) ── */
const SPRING = {
  type: 'spring',
  stiffness: 170,
  damping: 26,
  mass: 1,
} as const;

/* ── Health colour map ── */
const HC = {
  green: {
    border: 'rgba(52,211,153,0.5)',
    bg: 'rgba(52,211,153,0.06)',
    text: '#34d399',
    shadow: '0 0 12px rgba(52,211,153,0.25)',
  },
  yellow: {
    border: 'rgba(250,204,21,0.5)',
    bg: 'rgba(250,204,21,0.06)',
    text: '#facc15',
    shadow: '0 0 12px rgba(250,204,21,0.25)',
  },
  red: {
    border: 'rgba(239,68,68,0.5)',
    bg: 'rgba(239,68,68,0.06)',
    text: '#ef4444',
    shadow: '0 0 12px rgba(239,68,68,0.25)',
  },
} as const;

/* ── Design tokens ── */
const APEX_ORANGE = '#c2501f';
const FONT_SG = 'Space Grotesk, sans-serif';

/* ── Shared glass tile surface ── */
const GLASS_TILE = {
  borderRadius: 24,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(32px) saturate(180%)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow:
    'inset 0 1px 1px rgba(255,255,255,0.25),' +
    ' 0 10px 30px rgba(0,0,0,0.2)',
};

/* ── Shared button style variants ── */
const CTRL_BTN = {
  background: 'rgba(249,115,22,0.1)',
  border: '1px solid rgba(249,115,22,0.3)',
  color: '#f97316',
  transition: 'all 0.2s',
};

const ORANGE_GHOST = {
  background: 'rgba(194,80,31,0.06)',
  border: '1px solid rgba(194,80,31,0.2)',
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/* ── Static listening-bar geometry ── */
const BARS = [
  { id: 'b0', h: 6 },
  { id: 'b1', h: 10 },
  { id: 'b2', h: 16 },
  { id: 'b3', h: 10 },
  { id: 'b4', h: 6 },
] as const;

/* ════════════════════════════════════════════
   DATA TYPES
   ════════════════════════════════════════════ */

type HealthStatus = 'green' | 'yellow' | 'red';

interface DashboardOverviewProps {
  readonly demoMode: boolean;
  readonly appHealth: HealthStatus;
  readonly setAppHealth: (v: HealthStatus) => void;
  readonly ecoAppsVisible: boolean;
  readonly setEcoAppsVisible: (v: boolean) => void;
}

interface ContextItem {
  readonly name: string;
  readonly health: HealthStatus;
  readonly insight: string;
}

interface AppEntry {
  readonly name: string;
  readonly cat: string;
  readonly logo: string;
  readonly synced: string;
  readonly status: string;
}

/* ════════════════════════════════════════════
   DATA DERIVATION (module-level, computed once)
   ════════════════════════════════════════════ */

const INITIAL_CONTEXT: readonly ContextItem[] = APP_REGISTRY
  .filter((e: AppRegistryEntry) => !HIDDEN_APPS.has(e.label))
  .slice(0, 3)
  .map((e: AppRegistryEntry) => ({
    name: e.label,
    health: e.healthContext.health,
    insight: e.healthContext.insight,
  }));

const APPS: readonly AppEntry[] = APP_REGISTRY
  .filter((e: AppRegistryEntry) => !HIDDEN_APPS.has(e.label))
  .map((e: AppRegistryEntry) => ({
    name: e.label,
    cat: e.category,
    logo: LOGO(e.logoDomain),
    synced: `${e.dashboard.syncedMinutesAgo}m`,
    status: e.dashboard.status,
  }));

const ECOSYSTEM = APPS.slice(0, 3);

function deriveHealth(
  items: readonly ContextItem[],
): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}

/* ════════════════════════════════════════════
   SUB-COMPONENT: AgentPane (left 25%)
   SonarQube scope: low cognitive complexity
   ════════════════════════════════════════════ */

interface AgentPaneProps {
  readonly agentStatus: 'listening' | 'standby';
}

const AgentPane = memo(function AgentPane({
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
        ' relative overflow-hidden'
      }
      style={{ ...GLASS_TILE, padding: 24 }}
    >
      <div className="apex-noise-layer" />
      <div
        className={
          'relative z-10 flex flex-col' +
          ' items-center justify-center h-full w-full gap-4'
        }
      >
        {/* Header: label + status chip */}
        <div className="flex items-center gap-2">
          <span
            className={
              'text-xs font-extrabold tracking-widest' +
              ' uppercase text-gray-400'
            }
          >
            APEX Agent
          </span>
          <span className="chip-live" style={chipOverride}>
            {isStandby ? 'Standby' : 'Active'}
          </span>
        </div>

        {/* Session timer */}
        <div className="flex flex-col items-center text-center">
          <span
            className={
              'text-[10px] font-extrabold text-gray-400' +
              ' uppercase tracking-widest'
            }
          >
            Session
          </span>
          <span
            className="text-xl font-extrabold text-white"
            style={{ fontFamily: FONT_SG }}
          >
            00:00
          </span>
        </div>

        {/* Avatar orb */}
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
          <div className="agent-orb-avatar">
            <img src={sentinelAvatar} alt="APEX Agent" />
          </div>
        </motion.div>

        {/* Playback controls */}
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

        {/* Listening / standby indicator */}
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

/* ════════════════════════════════════════════
   SUB-COMPONENT: ContextTile (inside OmniSlate)
   ════════════════════════════════════════════ */

interface ContextTileProps {
  readonly ctx: ContextItem;
  readonly activeInsight: string | null;
  readonly onToggle: (name: string) => void;
}

const ContextTile = memo(function ContextTile({
  ctx,
  activeInsight,
  onToggle,
}: ContextTileProps) {
  const ch = HC[ctx.health];
  const isOpen = activeInsight === ctx.name;

  return (
    <motion.div
      style={{ position: 'relative' }}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      drag
      dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
      dragElastic={0.5}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
    >
      <button
        type="button"
        onClick={() => onToggle(ctx.name)}
        style={{
          fontSize: 13,
          fontWeight: 700,
          padding: '5px 14px',
          borderRadius: 10,
          background: ch.bg,
          border: `1.5px solid ${ch.border}`,
          color: ch.text,
          cursor: 'pointer',
          boxShadow: ch.shadow,
          fontFamily: 'inherit',
        }}
      >
        {ctx.name}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            zIndex: 10,
            padding: '8px 12px',
            borderRadius: 8,
            minWidth: 220,
            background: '#0f172a',
            border: `1px solid ${ch.border}`,
            fontSize: 12,
            color: '#cbd5e1',
            lineHeight: 1.5,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={lightbulbIcon}
            alt=""
            style={{
              width: 12,
              height: 12,
              marginRight: 4,
              verticalAlign: 'middle',
            }}
          />
          {ctx.insight}
        </motion.div>
      )}
    </motion.div>
  );
});

/* ════════════════════════════════════════════
   SUB-COMPONENT: RecordButton
   ════════════════════════════════════════════ */

interface RecordButtonProps {
  readonly isRecording: boolean;
  readonly duration: number;
  readonly onToggle: () => void;
}

const RecordButton = memo(function RecordButton({
  isRecording,
  duration,
  onToggle,
}: RecordButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isRecording ? 'Stop recording' : 'Record voice message'}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: isRecording
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(194,80,31,0.08)',
        border: `1px solid ${
          isRecording
            ? 'rgba(239,68,68,0.4)'
            : 'rgba(194,80,31,0.2)'
        }`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isRecording
          ? '0 0 16px rgba(239,68,68,0.3)'
          : 'none',
        transition: 'all 0.2s',
      }}
    >
      {isRecording ? (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: '#ef4444',
          }}
        />
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
      {isRecording && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            fontSize: 9.63,
            fontWeight: 700,
            color: '#ef4444',
            background: '#0f172a',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6,
            padding: '1px 4px',
          }}
        >
          {duration}s
        </span>
      )}
    </button>
  );
});

/* ════════════════════════════════════════════
   SUB-COMPONENT: OmniSlatePane (centre 50%)
   ════════════════════════════════════════════ */

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

const PROMPT_STYLE_BASE = {
  height: 44,
  borderRadius: 12,
  padding: '0 20px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#dfe6fe',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  fontWeight: 500,
  transition: 'all 0.3s ease',
  flex: 1,
};

const OmniSlatePane = memo(function OmniSlatePane({
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
  const traceColor =
    traceLogs[0]?.includes('COMPLETE') ? '#34d399' : '#facc15';

  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...SPRING, delay: 0.05 }}
      whileHover={{ scale: 1.005, transition: SPRING }}
      className={
        'apex-hero-tile apex-hero-tile--lg' +
        ' z-[9999] pointer-events-auto' +
        ' flex flex-col justify-end relative overflow-hidden'
      }
      style={{ ...GLASS_TILE, padding: 28 }}
    >
      <div className="apex-noise-layer" />

      {/* OmniSlate badge */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1000,
          padding: '8px 14px',
          fontSize: 11.77,
          fontWeight: 800,
          color: '#a1a1aa',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        OmniSlate
      </span>

      {/* Top-right: CleanSlate + lightbulb */}
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

      <div className="relative z-10 flex flex-col gap-3">
        {/* Global insight panel */}
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

        {/* Context tiles */}
        {context.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 8,
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

        {/* Prompt bar */}
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => onPromptChange(e.target.value)}
            onFocus={(e: FocusEvent<HTMLInputElement>) => {
              e.currentTarget.style.borderColor =
                'rgba(255,255,255,0.25)';
              e.currentTarget.style.background =
                'rgba(255,255,255,0.05)';
            }}
            onBlur={(e: FocusEvent<HTMLInputElement>) => {
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
          {/* Attach */}
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
          {/* Send */}
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

        {traceLogs[0] && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              fontWeight: 700,
              color: traceColor,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {traceLogs[0]}
          </div>
        )}
      </div>
    </motion.div>
  );
});

/* ════════════════════════════════════════════
   SUB-COMPONENT: EcosystemPane (right 25%)
   ════════════════════════════════════════════ */

interface EcosystemPaneProps {
  readonly ecoAppsVisible: boolean;
}

const ECO_ROW_STYLE = {
  background: 'rgba(0,0,0,0.20)',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'grab',
  touchAction: 'none' as const,
};

const CAT_BADGE_STYLE = {
  background: 'rgba(249,115,22,0.1)',
  color: '#f97316',
  border: '1px solid rgba(249,115,22,0.25)',
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const EcosystemPane = memo(function EcosystemPane({
  ecoAppsVisible,
}: EcosystemPaneProps) {
  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...SPRING, delay: 0.1 }}
      whileHover={{ scale: 1.01, transition: SPRING }}
      className={
        'apex-hero-tile apex-hero-tile--sm' +
        ' flex flex-col relative overflow-hidden'
      }
      style={{ ...GLASS_TILE, padding: 24 }}
    >
      <div className="apex-noise-layer" />
      <div className="relative z-10 w-full">
        <div
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: '#dfe6fe',
            marginBottom: 2,
            letterSpacing: '-0.02em',
          }}
        >
          APEX Ecosystems
        </div>
        <div
          style={{
            fontSize: 11.77,
            fontWeight: 700,
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 16,
          }}
        >
          Connected Modules
        </div>
        <div className="flex flex-col gap-2.5 w-full">
          {ecoAppsVisible &&
            ECOSYSTEM.map(app => (
              <motion.div
                key={app.name}
                className={
                  'flex flex-row items-center' +
                  ' justify-between w-full p-3' +
                  ' rounded-xl overflow-hidden gap-2'
                }
                style={ECO_ROW_STYLE}
                drag
                dragConstraints={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
                dragElastic={0.4}
                whileHover={{ scale: 1.02, translateX: 4, rotate: 0.5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="flex flex-row items-center gap-2 min-w-0 flex-1"
                >
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-white text-sm font-semibold truncate"
                    >
                      {app.name}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded w-max mt-0.5"
                      style={CAT_BADGE_STYLE}
                    >
                      {app.cat}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className="text-white font-bold text-sm tracking-tight"
                    style={{ fontFamily: FONT_SG }}
                  >
                    {app.status}
                  </span>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </motion.div>
  );
});

/* ════════════════════════════════════════════
   SUB-COMPONENT: AppTile
   ════════════════════════════════════════════ */

interface AppTileProps {
  readonly app: AppEntry;
  readonly onClick: () => void;
}

const APP_TILE_SURFACE = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '16px 20px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'grab',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.05),' +
    ' 0 4px 15px rgba(0,0,0,0.4)',
  touchAction: 'none' as const,
  transition: 'all 0.3s ease-out',
  position: 'relative' as const,
};

const APP_LOGO_STYLE = {
  width: 44,
  height: 44,
  borderRadius: 12,
  flexShrink: 0,
  background: '#09090b',
  objectFit: 'contain' as const,
  padding: 6,
  border: '1px solid rgba(255,255,255,0.1)',
};

const APP_LOGO_FALLBACK = {
  width: 44,
  height: 44,
  borderRadius: 12,
  flexShrink: 0,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f97316',
};

const APP_TILE_HOVER = {
  scale: 1.03,
  borderColor: 'rgba(255,255,255,0.15)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.1),' +
    ' 0 8px 25px rgba(0,0,0,0.6)',
  translateY: -2,
};

const PARTIAL_CHIP = {
  background: 'rgba(250,204,21,0.12)',
  color: '#facc15',
  borderColor: 'rgba(250,204,21,0.3)',
};

const SYNC_BTN_STYLE = {
  position: 'absolute' as const,
  bottom: 16,
  right: 16,
  fontSize: 10.7,
  fontWeight: 800,
  padding: '6px 14px',
  borderRadius: 8,
  background: 'rgba(249,115,22,0.1)',
  border: '1px solid rgba(249,115,22,0.3)',
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const AppTile = memo(function AppTile({ app, onClick }: AppTileProps) {
  const isPartial = app.status === 'Partial';
  const chipPos = { position: 'absolute' as const, top: 16, right: 16 };
  const chipStyle = isPartial
    ? { ...chipPos, ...PARTIAL_CHIP }
    : chipPos;

  return (
    <motion.div
      className="apex-app-tile"
      style={APP_TILE_SURFACE}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileHover={APP_TILE_HOVER}
      whileTap={{ scale: 0.98, cursor: 'grabbing' }}
      onClick={onClick}
    >
      {app.logo ? (
        <img src={app.logo} alt={app.name} style={APP_LOGO_STYLE} />
      ) : (
        <div style={APP_LOGO_FALLBACK}>
          <Blocks size={20} strokeWidth={2.5} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span
            style={{
              fontSize: 16.05,
              fontWeight: 800,
              color: '#dfe6fe',
              letterSpacing: '-0.01em',
            }}
          >
            {app.name}
          </span>
          <span className="chip-live" style={chipStyle}>
            {app.status}
          </span>
        </div>
        <div
          style={{
            fontSize: 11.77,
            color: '#a1a1aa',
            marginTop: 4,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {app.cat}
        </div>
        {app.synced && (
          <div
            style={{
              fontSize: 11.24,
              color: '#71717a',
              marginTop: 2,
              fontFamily: FONT_SG,
            }}
          >
            SYNC: {app.synced}
          </div>
        )}
      </div>
      {isPartial && (
        <button type="button" style={SYNC_BTN_STYLE}>
          Sync
        </button>
      )}
    </motion.div>
  );
});

/* ════════════════════════════════════════════
   MAIN COMPONENT — thin orchestrator, low cognitive complexity
   ════════════════════════════════════════════ */

export const DashboardOverview = memo(function DashboardOverview({
  demoMode,
  appHealth,
  setAppHealth,
  ecoAppsVisible,
  setEcoAppsVisible,
}: DashboardOverviewProps) {
  const { handleAppInteraction } = useOmniDashAction();

  const [context, setContext] =
    useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight, setActiveInsight] =
    useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [traceLogs, setTraceLogs] = useState<readonly string[]>([]);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRef.current?.state === 'recording') {
        mediaRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  /* Ecosystem visibility sync */
  useEffect(() => {
    setEcoAppsVisible(ECOSYSTEM.length > 0);
  }, [setEcoAppsVisible]);

  const health =
    appHealth === 'green' ? deriveHealth(context) : appHealth;
  const agentStatus = isRecording ? 'standby' : 'listening';

  const addTraceLog = useCallback((message: string) => {
    setTraceLogs((prev: readonly string[]) => [message, ...prev].slice(0, 4));
  }, []);

  const handleCleanSlate = useCallback(() => {
    setContext([]);
    setActiveInsight(null);
  }, []);

  const handleToggleInsight = useCallback((name: string) => {
    setActiveInsight((prev: string | null) => (prev === name ? null : name));
  }, []);

  const handleToggleGlobalInsight = useCallback(() => {
    setActiveInsight((prev: string | null) => (prev ? null : '__global__'));
  }, []);

  const handleCommandSubmit = useCallback(() => {
    if (!prompt.trim()) return;
    if (demoMode) {
      setAppHealth('yellow');
      addTraceLog('SIM_MODE_BYPASS: live Edge Functions skipped.');
      setTimeout(() => {
        setAppHealth('green');
        addTraceLog(
          'SIM_MODE_SUCCESS_TRACE: sync resolved in 2500ms.',
        );
        setPrompt('');
      }, 2500);
      return;
    }
    addTraceLog(`QUEUED: ${prompt.trim()}`);
    setPrompt('');
  }, [addTraceLog, demoMode, prompt, setAppHealth]);

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      mediaStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaStreamRef.current = stream;
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      };
      mediaRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((d: number) => d + 1);
      }, 1000);
    } catch {
      addTraceLog(
        'Microphone access denied. Voice capture unavailable.',
      );
    }
  }, [addTraceLog]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const handleAppClick = useCallback(
    (app: AppEntry) => () => {
      handleAppInteraction({
        id: app.name.toLowerCase().replace(/\s+/g, '-'),
        provider: app.name,
        category: app.cat,
        status: app.status,
      });
    },
    [handleAppInteraction],
  );

  return (
    <div className="apex-canvas">

      {/* ── Hero Row: Agent | OmniSlate | Ecosystems ── */}
      <div className="apex-hero-row">
        <AgentPane agentStatus={agentStatus} />
        <OmniSlatePane
          context={context}
          health={health}
          activeInsight={activeInsight}
          prompt={prompt}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          traceLogs={traceLogs}
          onCleanSlate={handleCleanSlate}
          onToggleGlobalInsight={handleToggleGlobalInsight}
          onToggleInsight={handleToggleInsight}
          onPromptChange={setPrompt}
          onCommandSubmit={handleCommandSubmit}
          onToggleRecording={handleToggleRecording}
        />
        <EcosystemPane ecoAppsVisible={ecoAppsVisible} />
      </div>

      {/* ── Integrated Apps: forced 4-across, 150px height ── */}
      <div className="apex-apps-section apps-hex">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <span
              style={{
                fontSize: 19.26,
                fontWeight: 800,
                color: '#dfe6fe',
                letterSpacing: '-0.02em',
              }}
            >
              Integrated Apps
            </span>
            <span
              style={{
                fontSize: 12.84,
                fontWeight: 700,
                color: '#a1a1aa',
                fontFamily: FONT_SG,
              }}
            >
              ALL SYSTEMS ({APPS.length})
            </span>
          </div>
          <span
            style={{
              fontSize: 12.84,
              color: '#f97316',
              cursor: 'pointer',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Manage →
          </span>
        </div>

        {/* calc(25% - 12px) × 4 = exactly 4 across, 16px gaps */}
        <div className="apex-apps-row">
          {APPS.map(app => (
            <AppTile
              key={app.name}
              app={app}
              onClick={handleAppClick(app)}
            />
          ))}
        </div>
      </div>

    </div>
  );
});
