/**
 * DashboardOverview - OmniBoard Center Content
 *
 * Hero: APEX Agent (25%, left) | OmniSlate (50%, center) | APEX Ecosystems (25%, right)
 * OmniSlate = prompt bar + TTS recording + health-colored context tiles
 *
 * Mic exclusion: when OmniSlate mic is recording, Agent shows "Standby"
 *                when OmniSlate mic stops, Agent returns to "Listening..."
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Blocks } from 'lucide-react';
import { useOmniModal } from '../../../../src/stores/omniModalStore';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import { APP_REGISTRY, type AppRegistryEntry } from '../../../../packages/core/src/registry';

/* ── Real app logos via Clearbit ── */
const LOGO = (domain: string) => `https://logo.clearbit.com/${domain}`;

/* ── Data ── */

const HIDDEN_APPS = new Set(['OmniBoard', 'OmniPort', 'Maestro']);


interface DashboardOverviewProps {
  readonly demoMode: boolean;
  readonly appHealth: 'green' | 'yellow' | 'red';
  readonly setAppHealth: (health: 'green' | 'yellow' | 'red') => void;
  readonly ecoAppsVisible: boolean;
  readonly setEcoAppsVisible: (visible: boolean) => void;
}

interface ContextItem {
  readonly name: string;
  readonly health: 'green' | 'yellow' | 'red';
  readonly insight: string;
}

const INITIAL_CONTEXT: readonly ContextItem[] = APP_REGISTRY
  .filter((entry: AppRegistryEntry) => !HIDDEN_APPS.has(entry.label))
  .slice(0, 3)
  .map((entry: AppRegistryEntry) => ({
  name: entry.label,
  health: entry.healthContext.health,
  insight: entry.healthContext.insight,
}));

const HC = {
  green:  { border: 'rgba(52,211,153,0.5)',  bg: 'rgba(52,211,153,0.06)',  text: '#34d399', shadow: '0 0 12px rgba(52,211,153,0.25)' },
  yellow: { border: 'rgba(250,204,21,0.5)',  bg: 'rgba(250,204,21,0.06)',  text: '#facc15', shadow: '0 0 12px rgba(250,204,21,0.25)' },
  red:    { border: 'rgba(239,68,68,0.5)',   bg: 'rgba(239,68,68,0.06)',   text: '#ef4444', shadow: '0 0 12px rgba(239,68,68,0.25)' },
} as const;


const APPS = APP_REGISTRY
  .filter((entry: AppRegistryEntry) => !HIDDEN_APPS.has(entry.label))
  .map((entry: AppRegistryEntry) => ({
  name: entry.label,
  cat: entry.category,
  logo: LOGO(entry.logoDomain),
  synced: `${entry.dashboard.syncedMinutesAgo}m`,
  status: entry.dashboard.status,
}));

const ECOSYSTEM = APPS.slice(0, 3);


function deriveHealth(items: readonly ContextItem[]): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}

const O = '#c2501f'; // burnt orange

/* ── Component ── */

export const DashboardOverview = memo(function DashboardOverview({
  demoMode,
  appHealth,
  setAppHealth,
  ecoAppsVisible,
  setEcoAppsVisible,
}: DashboardOverviewProps) {
  const navigate = useNavigate();
  const omniModal = useOmniModal();
  const [context, setContext] = useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [traceLogs, setTraceLogs] = useState<readonly string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const health = appHealth === 'green' ? deriveHealth(context) : appHealth;
  const s = HC[health];

  const handleCleanSlate = useCallback(() => { setContext([]); setActiveInsight(null); }, []);
  const toggleInsight = useCallback((n: string) => setActiveInsight(p => p === n ? null : n), []);

  const addTraceLog = useCallback((message: string) => {
    setTraceLogs((prev) => [message, ...prev].slice(0, 4));
  }, []);

  useEffect(() => {
    setEcoAppsVisible(ECOSYSTEM.length > 0);
  }, [setEcoAppsVisible]);

  const handleCommandSubmit = useCallback(() => {
    if (!prompt.trim()) return;

    if (demoMode) {
      setAppHealth('yellow');
      addTraceLog('SIM_MODE_BYPASS: live Edge Functions skipped.');
      window.setTimeout(() => {
        setAppHealth('green');
        addTraceLog('SIM_MODE_SUCCESS_TRACE: deterministic sync resolved in 2500ms.');
        setPrompt('');
      }, 2500);
      return;
    }

    addTraceLog(`QUEUED: ${prompt.trim()}`);
    setPrompt('');
  }, [addTraceLog, demoMode, prompt, setAppHealth]);

  // ────────────────────────────────────────────────
  // TTS Voice Recording - record-then-send (NOT real-time)
  // Mutual exclusion: recording ON → Agent "Standby"
  // ────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaStreamRef.current = stream;

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      };

      mediaRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch {
      addTraceLog('Microphone access denied. Voice capture unavailable.');
    }
  }, [addTraceLog]);

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // Agent status derives from recording state
  const agentStatus = isRecording ? 'standby' : 'listening';

  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ═══════ HERO TRI-PANE — Kinetic Architecture ═══════ */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 w-full mt-6 relative z-10">

        {/* ── LEFT PANE: APEX Agent (col-span-3) ── */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1 }}
          whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 170, damping: 26, mass: 1 } }}
          className="lg:col-span-3 order-2 lg:order-1 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            padding: 24,
            borderRadius: 24,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          {/* SVG Noise Layer */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }}
          />
          {/* APEX Agent - Vertical Widget Layout */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full gap-4">
            {/* Header: Agent label + status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-widest uppercase text-gray-400">APEX Agent</span>
              <span className="chip-live" style={agentStatus === 'standby' ? {
                background: 'rgba(250,204,21,0.1)', color: '#facc15',
                borderColor: 'rgba(250,204,21,0.2)',
              } : undefined}>
                {agentStatus === 'listening' ? 'Active' : 'Standby'}
              </span>
            </div>

            {/* Session Timer */}
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Session</span>
              <span className="text-xl font-extrabold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>00:00</span>
            </div>

            {/* Avatar Orb */}
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

            {/* Play/Pause Controls - horizontal row */}
            <div className="flex flex-row items-center justify-center gap-3">
              <button title="Play" className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', transition: 'all 0.2s' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </button>
              <button title="Pause" className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', transition: 'all 0.2s' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              </button>
            </div>

            {/* Listening Status */}
            <div className="mt-1 text-xs flex items-center gap-2">
              {agentStatus === 'listening' ? (
                <>
                  {[{id: 'b1', h: 6}, {id: 'b2', h: 10}, {id: 'b3', h: 16}, {id: 'b4', h: 10}, {id: 'b5', h: 6}].map((bar) => (
                    <div key={bar.id} style={{ width: 3, height: bar.h, borderRadius: 2, background: '#34d399', opacity: 0.7 }} />
                  ))}
                  <span className="text-emerald-400 ml-1">Listening...</span>
                </>
              ) : (
                <span className="text-yellow-400">⏸ Standby</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── CENTER PANE: OmniSlate (col-span-6) ── */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1, delay: 0.05 }}
          whileHover={{ scale: 1.005, transition: { type: 'spring', stiffness: 170, damping: 26, mass: 1 } }}
          className="lg:col-span-6 order-1 lg:order-2 z-[9999] pointer-events-auto flex flex-col justify-end relative overflow-hidden"
          style={{
            padding: 28,
            borderRadius: 24,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          {/* SVG Noise Layer */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }}
          />
          {/* OmniSLATE badge — top-left */}
          <span style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000, padding: '8px 14px', fontSize: 11.77, fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.15em', textTransform: 'uppercase' }}>OmniSlate</span>
          {/* CleanSlate + Lightbulb — top-right */}
          <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
            <button type="button" onClick={handleCleanSlate} style={{
              fontSize: 11.77, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
              background: `rgba(194,80,31,0.06)`, border: `1px solid rgba(194,80,31,0.2)`,
              color: '#f97316', cursor: 'pointer', fontFamily: 'inherit',
            }}>CleanSlate</button>
            {health !== 'green' && (
              <button type="button" onClick={() => setActiveInsight(p => p ? null : '__global__')} title="View health insights" style={{
                width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                background: s.bg, border: `1px solid ${s.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={lightbulbIcon} alt="Insights" style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <div className="relative z-10 flex flex-col gap-3">

            {/* Insight panel */}
            {activeInsight === '__global__' && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 8,
                background: s.bg, border: `1px solid ${s.border}`,
                fontSize: 12.84, color: s.text, lineHeight: 1.5,
              }}>
                {context.filter(c => c.health !== 'green').map(c => (
                  <div key={c.name} style={{ marginBottom: 4 }}><strong>{c.name}:</strong> {c.insight}</div>
                ))}
              </div>
            )}

            {/* Context tiles */}
            {context.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <AnimatePresence>
                {context.map((ctx) => {
                  const ch = HC[ctx.health];
                  return (
                    <motion.div
                      key={ctx.name}
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
                      <button type="button" onClick={() => toggleInsight(ctx.name)} style={{
                        fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 10,
                        background: ch.bg, border: `1.5px solid ${ch.border}`, color: ch.text,
                        cursor: 'pointer', boxShadow: ch.shadow, fontFamily: 'inherit',
                      }}>{ctx.name}</button>
                      {activeInsight === ctx.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 10,
                            padding: '8px 12px', borderRadius: 8, minWidth: 220,
                            background: '#0f172a', border: `1px solid ${ch.border}`,
                            fontSize: 12, color: '#cbd5e1', lineHeight: 1.5,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                          }}
                        >
                          <img src={lightbulbIcon} alt="" style={{ width: 12, height: 12, marginRight: 4, verticalAlign: 'middle' }} />
                          {ctx.insight}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
                </AnimatePresence>
                <button type="button" style={{
                  fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 10,
                  background: `rgba(194,80,31,0.06)`, border: `1px solid rgba(194,80,31,0.2)`,
                  color: '#f97316', cursor: 'pointer', fontFamily: 'inherit',
                }}>+ Add context</button>
              </div>
            )}

            {/* Prompt bar + TTS mic */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
              <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask APEX Agent" style={{
                flex: 1, height: 44, borderRadius: 12, padding: '0 20px',
                background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.1)`,
                color: '#dfe6fe', fontSize: 15, outline: 'none', fontFamily: 'inherit',
                fontWeight: 500, transition: 'all 0.3s ease'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              />

              {/* TTS Record button */}
              <button
                type="button"
                onClick={toggleRecording}
                title={isRecording ? 'Stop recording' : 'Record voice message'}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isRecording ? 'rgba(239,68,68,0.15)' : `rgba(194,80,31,0.08)`,
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(194,80,31,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                  boxShadow: isRecording ? '0 0 16px rgba(239,68,68,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isRecording ? (
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
                {isRecording && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    fontSize: 9.63, fontWeight: 700, color: '#ef4444',
                    background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 6, padding: '1px 4px',
                  }}>{recordingDuration}s</span>
                )}
              </button>

              {/* Attach */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `rgba(194,80,31,0.08)`, border: `1px solid rgba(194,80,31,0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, color: '#94a3b8', cursor: 'pointer',
              }}>+</div>

              {/* Send */}
              <button type="button" onClick={handleCommandSubmit} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `linear-gradient(135deg, #f97316, ${O})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 0 16px rgba(194,80,31,0.3)',
              }}>
                <span style={{ fontSize: 12, color: '#dfe6fe' }}>▶</span>
              </button>
            </div>

            {traceLogs[0] && (
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: traceLogs[0].includes('COMPLETE') ? '#34d399' : '#facc15', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {traceLogs[0]}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── RIGHT PANE: APEX Ecosystems (col-span-3) ── */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1, delay: 0.1 }}
          whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 170, damping: 26, mass: 1 } }}
          className="lg:col-span-3 order-3 lg:order-3 flex flex-col relative overflow-hidden"
          style={{
            padding: 24,
            borderRadius: 24,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          {/* SVG Noise Layer */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }}
          />
          <div className="relative z-10 w-full">
            <div style={{ fontSize: 19, fontWeight: 800, color: '#dfe6fe', marginBottom: 2, letterSpacing: '-0.02em' }}>APEX Ecosystems</div>
            <div style={{ fontSize: 11.77, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Connected Modules</div>
            <div className="flex flex-col gap-2.5 w-full">
              {ecoAppsVisible && ECOSYSTEM.map((app) => (
                <motion.div
                  key={app.name}
                  className="flex flex-row items-center justify-between w-full p-3 rounded-xl overflow-hidden gap-2"
                  style={{
                    background: 'rgba(0,0,0,0.20)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'grab', touchAction: 'none',
                  }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.4}
                  whileHover={{ scale: 1.02, translateX: 4, rotate: 0.5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Left: Module + category */}
                  <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
                    <div className="flex flex-col min-w-0">
                      <span className="text-white text-sm font-semibold truncate">{app.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded w-max mt-0.5" style={{
                        background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)',
                        fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{app.cat}</span>
                    </div>
                  </div>
                  {/* Right: status */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-white font-bold text-sm tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{app.status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      {/* ═══════ INTEGRATED APPS ═══════ */}
      <div className="apps-hex" style={{ padding: '8px 16px 24px 16px', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 19.26, fontWeight: 800, color: '#dfe6fe', letterSpacing: '-0.02em' }}>Integrated Apps</span>
            <span style={{ fontSize: 12.84, fontWeight: 700, color: '#a1a1aa', fontFamily: 'Space Grotesk, sans-serif' }}>ALL SYSTEMS ({APPS.length})</span>
          </div>
          <span style={{ fontSize: 12.84, color: '#f97316', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {APPS.map((app) => (
            <motion.div 
              key={app.name} 
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                borderRadius: 16, background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.05)`, cursor: 'grab',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 15px rgba(0,0,0,0.4)`,
                touchAction: 'none',
                height: 92,
                transition: 'all 0.3s ease-out',
                position: 'relative'
              }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              whileHover={{ scale: 1.03, borderColor: 'rgba(255,255,255,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 25px rgba(0,0,0,0.6)', translateY: -2 }}
              whileTap={{ scale: 0.98, cursor: 'grabbing' }}
              onClick={(e) => {
                if (app.status === 'Partial') {
                  e.stopPropagation();
                  omniModal.invoke({
                    id: `auth-${app.name.toLowerCase()}`,
                    provider: app.name,
                    type: 'oauth',
                    title: `${app.name} Authentication`,
                    description: `Connect APEX OmniHub to ${app.name} to sync ${app.cat} data seamlessly.`,
                    onComplete: async (payload) => {
                      console.warn(`${app.name} integration complete:`, payload);
                    },
                    onCancel: () => {
                      console.warn(`User dismissed the ${app.name} flow.`);
                    },
                  });
                } else {
                  navigate('/omnidash/omniport');
                }
              }}
            >
              {app.logo ? (
                <img src={app.logo} alt={app.name} style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: '#09090b', objectFit: 'contain', padding: 6,
                  border: `1px solid rgba(255,255,255,0.1)`,
                }} />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#f97316',
                }}>
                  <Blocks size={20} strokeWidth={2.5} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16.05, fontWeight: 800, color: '#dfe6fe', letterSpacing: '-0.01em' }}>{app.name}</span>
                  <span className="chip-live" style={{
                    position: 'absolute', top: 16, right: 16,
                    ...(app.status === 'Partial' ? {
                      background: 'rgba(250,204,21,0.12)', color: '#facc15',
                      borderColor: 'rgba(250,204,21,0.3)',
                    } : {})
                  }}>{app.status}</span>
                </div>
                <div style={{ fontSize: 11.770000000000001, color: '#a1a1aa', marginTop: 4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{app.cat}</div>
                {app.synced && <div style={{ fontSize: 11.235000000000001, color: '#71717a', marginTop: 2, fontFamily: 'Space Grotesk, sans-serif' }}>SYNC: {app.synced}</div>}
              </div>
              {app.status === 'Partial' && (
                <button type="button" style={{
                  position: 'absolute', bottom: 16, right: 16,
                  fontSize: 10.700000000000001, fontWeight: 800, padding: '6px 14px', borderRadius: 8,
                  background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.3)`,
                  color: '#f97316', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>Sync</button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* REMOVED: Original APEX Ecosystem — moved above IntegratedApps (Mutation 2) */}
    </div>
  );
});
