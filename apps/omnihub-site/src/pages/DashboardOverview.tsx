/**
 * DashboardOverview — OmniBoard Center Content v1.4.2
 *
 * Hero: Agent (left) | OmniSlate (center, full-width)
 * OmniSlate = cycling suggestions + prompt bar + health-reactive border
 * Integrated Apps = 3-column grid with drag-to-OmniSlate (morphs to brand icon)
 * All tiles uniform height (78px = 92px - 15%)
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Blocks, Plus } from 'lucide-react';
import { useOmniModal } from '../../../../src/stores/omniModalStore';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import { APP_REGISTRY, type AppRegistryEntry } from '../../../../packages/core/src/registry';

/* ── Real app logos via Clearbit ── */
const LOGO = (domain: string) => `https://logo.clearbit.com/${domain}`;

/* ── Data ── */

interface ContextItem {
  readonly name: string;
  readonly health: 'green' | 'yellow' | 'red';
  readonly insight: string;
  readonly logo: string;
}

const INITIAL_CONTEXT: readonly ContextItem[] = APP_REGISTRY.slice(0, 3).map((entry: AppRegistryEntry) => ({
  name: entry.label,
  health: entry.healthContext.health,
  insight: entry.healthContext.insight,
  logo: LOGO(entry.logoDomain),
}));

const HC = {
  green:  { border: 'rgba(52,211,153,0.5)',  bg: 'rgba(52,211,153,0.06)',  text: '#34d399', shadow: '0 0 12px rgba(52,211,153,0.25)' },
  yellow: { border: 'rgba(250,204,21,0.5)',  bg: 'rgba(250,204,21,0.06)',  text: '#facc15', shadow: '0 0 12px rgba(250,204,21,0.25)' },
  red:    { border: 'rgba(239,68,68,0.5)',   bg: 'rgba(239,68,68,0.06)',   text: '#ef4444', shadow: '0 0 12px rgba(239,68,68,0.25)' },
} as const;

const APPS = APP_REGISTRY.map((entry: AppRegistryEntry) => ({
  key: entry.key,
  name: entry.label,
  cat: entry.category,
  logo: LOGO(entry.logoDomain),
  synced: `${entry.dashboard.syncedMinutesAgo}m`,
  status: entry.dashboard.status,
  health: entry.healthContext.health,
  insight: entry.healthContext.insight,
}));

const PLACEHOLDER_TILES = [
  { id: 'placeholder-1', label: 'Awaiting OmniBoard Integration' },
  { id: 'placeholder-2', label: 'Awaiting OmniBoard Integration' },
  { id: 'placeholder-3', label: 'Awaiting OmniBoard Integration' },
];

/* Cycling prompt suggestions */
const SUGGESTIONS = [
  'Sync all Salesforce leads and update pipeline',
  'Generate compliance report for Q1 audit',
  'Optimize workflow execution for billing module',
] as const;

function deriveHealth(items: readonly ContextItem[]): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}

/* ── Component ── */

export const DashboardOverview = memo(function DashboardOverview() {
  const navigate = useNavigate();
  const omniModal = useOmniModal();
  const [context, setContext] = useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [slateDropActive, setSlateDropActive] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const slateRef = useRef<HTMLDivElement>(null);

  const health = deriveHealth(context);
  const s = HC[health];

  // Cycle suggestions every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex(i => (i + 1) % SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCleanSlate = useCallback(() => { setContext([]); setActiveInsight(null); }, []);
  const toggleInsight = useCallback((n: string) => setActiveInsight(p => p === n ? null : n), []);

  // ── Add app to OmniSlate context (on drop) ──
  const addToContext = useCallback((app: typeof APPS[0]) => {
    setContext(prev => {
      if (prev.some(c => c.name === app.name)) return prev;
      return [...prev, { name: app.name, health: app.health, insight: app.insight, logo: app.logo }];
    });
  }, []);

  // ── Handle drop on OmniSlate ──
  const handleSlateDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSlateDropActive(false);
    const appKey = e.dataTransfer.getData('text/plain');
    const app = APPS.find(a => a.key === appKey);
    if (app) addToContext(app);
  }, [addToContext]);

  const handleSlateDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSlateDropActive(true);
  }, []);

  const handleSlateDragLeave = useCallback(() => {
    setSlateDropActive(false);
  }, []);

  // ── TTS Voice Recording ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
      mediaRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => { setRecordingDuration(d => d + 1); }, 1000);
    } catch { /* Mic permission denied */ }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const agentStatus = isRecording ? 'standby' : 'listening';

  // ── "+" button context flow ──
  const handleAddContext = useCallback(() => {
    omniModal.invoke({
      id: 'add-context',
      provider: 'APEX',
      type: 'oauth',
      title: 'Add Context',
      description: 'Select an app or file to add to your OmniSlate context.',
      onComplete: async () => { /* noop */ },
      onCancel: () => { /* noop */ },
    });
  }, [omniModal]);

  // Memoize visible apps: connected = real, disconnected = placeholders
  const visibleApps = useMemo(() => APPS, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ═══════ HERO BI-PANE ═══════ */}
      <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 16 }}>

        {/* ── LEFT PANE: APEX Agent ── */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1 }}
          className="glass hero-agent-pane"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden', position: 'relative' }}
        >
          <div className="noise-overlay" />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* Agent label + status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>APEX Agent</span>
              <span className="chip-live" style={agentStatus === 'standby' ? {
                background: 'rgba(250,204,21,0.1)', color: '#facc15', borderColor: 'rgba(250,204,21,0.2)',
              } : undefined}>
                {agentStatus === 'listening' ? 'Active' : 'Standby'}
              </span>
            </div>

            {/* Session Timer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Session</span>
              <span style={{ fontSize: 20, color: 'var(--text-heading)' }}>00:00</span>
            </div>

            {/* Avatar Orb */}
            <motion.div className="agent-orb" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <div className="agent-orb-glow" />
              <div className="agent-orb-ring" />
              <div className="agent-orb-ring-2" />
              <div className="agent-orb-avatar">
                <img src={sentinelAvatar} alt="APEX Agent" />
              </div>
            </motion.div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button title="Play" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: 'var(--accent)', transition: 'all var(--duration-hover) var(--ease-apple)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </button>
              <button title="Pause" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: 'var(--accent)', transition: 'all var(--duration-hover) var(--ease-apple)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              </button>
            </div>

            {/* Listening Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              {agentStatus === 'listening' ? (
                <>
                  {[6, 10, 16, 10, 6].map((h, i) => (
                    <div key={`bar-${String(h)}-${String(i)}`} style={{ width: 3, height: h, borderRadius: 2, background: 'var(--health-green)', opacity: 0.7 }} />
                  ))}
                  <span style={{ color: 'var(--health-green)', marginLeft: 4 }}>Listening...</span>
                </>
              ) : (
                <span style={{ color: 'var(--health-yellow)' }}>⏸ Standby</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── CENTER PANE: OmniSlate ── */}
        <motion.div
          layout
          ref={slateRef}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1, delay: 0.05 }}
          className={`omnislate-container omnislate-health-${health}${slateDropActive ? ' omnislate-drop-active' : ''}`}
          onDrop={handleSlateDrop}
          onDragOver={handleSlateDragOver}
          onDragLeave={handleSlateDragLeave}
        >
          <div className="noise-overlay" />
          {/* OmniSlate badge */}
          <span style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, padding: '8px 14px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>OmniSlate</span>
          {/* CleanSlate + Lightbulb */}
          <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
            <button type="button" onClick={handleCleanSlate} style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 8,
              background: 'rgba(194,80,31,0.06)', border: '1px solid var(--border-glow)',
              color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit',
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

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
            {/* Insight panel */}
            {activeInsight === '__global__' && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 8,
                background: s.bg, border: `1px solid ${s.border}`,
                fontSize: 12, color: s.text, lineHeight: 1.5,
              }}>
                {context.filter(c => c.health !== 'green').map(c => (
                  <div key={c.name} style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-heading)' }}>{c.name}:</span> {c.insight}</div>
                ))}
              </div>
            )}

            {/* Context tiles — now show brand icons when dropped */}
            {context.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <AnimatePresence>
                  {context.map((ctx) => {
                    const ch = HC[ctx.health];
                    return (
                      <motion.div
                        key={ctx.name}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                      >
                        {/* Brand icon morphed from tile drop */}
                        <img src={ctx.logo} alt={ctx.name} className="context-brand-icon" />
                        <button type="button" onClick={() => toggleInsight(ctx.name)} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 8,
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
                              background: 'var(--bg-primary)', border: `1px solid ${ch.border}`,
                              fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
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
              </div>
            )}

            {/* Prompt suggestion cycling bar */}
            <div className="prompt-suggestion-bar">
              <span className="prompt-suggestion-label">Action:</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={suggestionIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {SUGGESTIONS[suggestionIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Prompt bar + TTS mic + "+" trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="text" placeholder="Ask APEX Agent" style={{
                flex: 1, height: 44, borderRadius: 12, padding: '0 20px',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', fontSize: 15, outline: 'none', fontFamily: 'inherit',
                transition: 'all var(--duration-hover) var(--ease-apple)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-glow-hover)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              />

              {/* "+" PRIMARY trigger for add-context */}
              <button
                type="button"
                onClick={handleAddContext}
                title="Add files/context"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(194,80,31,0.08)', border: '1px solid var(--border-glow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--accent)',
                  transition: 'all var(--duration-hover) var(--ease-apple)',
                }}
              >
                <Plus size={18} />
              </button>

              {/* TTS Record button */}
              <button
                type="button"
                onClick={toggleRecording}
                title={isRecording ? 'Stop recording' : 'Record voice message'}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(194,80,31,0.08)',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'var(--border-glow)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                  boxShadow: isRecording ? '0 0 16px rgba(239,68,68,0.3)' : 'none',
                  transition: 'all var(--duration-hover) var(--ease-apple)',
                }}
              >
                {isRecording ? (
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
                {isRecording && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    fontSize: 9, color: '#ef4444',
                    background: 'var(--bg-primary)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 6, padding: '1px 4px',
                  }}>{recordingDuration}s</span>
                )}
              </button>

              {/* Send */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 0 16px rgba(194,80,31,0.3)',
              }}>
                <span style={{ fontSize: 12, color: '#fff' }}>▶</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════ INTEGRATED APPS — 3-Column Grid ═══════ */}
      <div className="apps-hex" style={{ padding: '8px 16px 24px 16px', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14.7, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>Integrated Apps</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ALL SYSTEMS ({visibleApps.length})</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage →</span>
        </div>
        <div className="integrated-grid">
          {visibleApps.map((app) => (
            <div
              key={app.key}
              className={`app-tile${mobileExpanded === app.key ? ' mobile-expanded' : ''}`}
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', app.key); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
              onClick={() => {
                // Mobile: toggle expand
                setMobileExpanded(prev => prev === app.key ? null : app.key);
                if (app.status === 'Partial') {
                  omniModal.invoke({
                    id: `auth-${app.name.toLowerCase()}`,
                    provider: app.name,
                    type: 'oauth',
                    title: `${app.name} Authentication`,
                    description: `Connect APEX OmniHub to ${app.name} to sync ${app.cat} data seamlessly.`,
                    onComplete: async (payload) => { console.warn(`${app.name} integration complete:`, payload); },
                    onCancel: () => { console.warn(`User dismissed the ${app.name} flow.`); },
                  });
                } else {
                  navigate('/omnidash/omniport');
                }
              }}
            >
              {app.logo ? (
                <img src={app.logo} alt={app.name} className="app-tile-icon" />
              ) : (
                <div className="app-tile-icon-placeholder">
                  <Blocks size={18} strokeWidth={2.5} />
                </div>
              )}
              <div className="app-tile-info tile-text-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="app-tile-name">{app.name}</span>
                </div>
                <div className="app-tile-cat">{app.cat}</div>
                <div className="app-tile-sync">SYNC: {app.synced}</div>
              </div>
              <span className={`health-dot health-dot-${app.health}`} />
              {/* Status chip */}
              <span className="chip-live" style={{
                position: 'absolute', top: 10, right: 10,
                ...(app.status === 'Partial' ? {
                  background: 'rgba(250,204,21,0.12)', color: '#facc15', borderColor: 'rgba(250,204,21,0.3)',
                } : {})
              }}>{app.status}</span>
            </div>
          ))}

          {/* Placeholder tiles */}
          {PLACEHOLDER_TILES.map((p) => (
            <div key={p.id} className="app-tile-placeholder">
              <span style={{ fontSize: 11, letterSpacing: '0.03em' }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
