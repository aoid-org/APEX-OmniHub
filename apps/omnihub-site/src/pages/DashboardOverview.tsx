/**
 * DashboardOverview — OmniBoard Center Content v6.1.0
 *
 * Hero: Agent (left) | OmniSlate (center, full-width)
 * OmniSlate = cycling suggestions + prompt bar + health-reactive border
 * Integrated Apps = 3-column grid with drag-to-OmniSlate (morphs to brand icon)
 * All tiles uniform height (78px = 92px - 15%)
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import { APP_REGISTRY, type AppRegistryEntry } from '../../../../packages/core/src/registry';
import { OmniTraceFeed } from '@/components/OmniTraceFeed';
import { supabase } from '@/lib/supabase';

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

const PLACEHOLDER_TILES_COUNT = Math.max(0, 3 - APPS.length);


function deriveHealth(items: readonly ContextItem[]): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}

/* ── Component ── */

export const DashboardOverview = memo(function DashboardOverview() {
  const [context, setContext] = useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [slateDropActive, setSlateDropActive] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const slateRef = useRef<HTMLDivElement>(null);

  const health = deriveHealth(context);
  const s = HC[health];

  const handleCleanSlate = useCallback(() => { setContext([]); setActiveInsight(null); }, []);
  const toggleInsight = useCallback((n: string) => setActiveInsight(p => p === n ? null : n), []);

  // ── Add app to OmniSlate context (on drop) ──
  const addToContext = useCallback((app: typeof APPS[0]) => {
    setContext(prev => {
      if (prev.some(c => c.name === app.name)) return prev;
      return [...prev, { name: app.name, health: app.health, insight: app.insight, logo: app.logo }];
    });
    // Trigger a brief "success" flash on the OmniSlate
    setSlateDropActive(true);
    setTimeout(() => setSlateDropActive(false), 400);
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

  // Memoize visible apps: connected = real, disconnected = placeholders
  const visibleApps = useMemo(() => APPS, []);

  /** Execute prompt against the REAL omnilink-agent edge function. */
  const handleAgentExecution = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = promptValue.trim();
    if (!query || agentLoading) return;

    setAgentLoading(true);
    setAgentResponse(null);
    setAgentError(null);

    try {
      const traceId = globalThis.crypto.randomUUID();

      const { data, error } = await supabase.functions.invoke('omnilink-agent', {
        body: { query, traceId },
      });

      if (error) {
        setAgentError(error.message || 'Agent request failed');
        return;
      }

      const responseText = typeof data?.response === 'string'
        ? data.response
        : JSON.stringify(data, null, 2);

      setAgentResponse(responseText);
      setPromptValue('');
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAgentLoading(false);
    }
  }, [promptValue, agentLoading]);

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
              <span className="chip-live">
                Active
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
              {[6, 10, 16, 10, 6].map((h, i) => (
                <div key={`bar-${String(h)}-${String(i)}`} style={{ width: 3, height: h, borderRadius: 2, background: 'var(--health-green)', opacity: 0.7 }} />
              ))}
              <span style={{ color: 'var(--health-green)', marginLeft: 4 }}>Listening...</span>
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
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0 }}
                        layout
                        initial={{ opacity: 0, scale: 0.3, rotate: -12 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.3, rotate: 12 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
                      >
                        {/* Brand icon — morphed from tile on drop */}
                        <button
                          type="button"
                          onClick={() => toggleInsight(ctx.name)}
                          title={ctx.name}
                          style={{
                            position: 'relative',
                            width: 42, height: 42, borderRadius: 12,
                            background: ch.bg, border: `1.5px solid ${ch.border}`,
                            cursor: 'pointer', padding: 0,
                            boxShadow: `${ch.shadow}, 0 2px 8px rgba(0,0,0,0.2)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            minHeight: 'auto', minWidth: 'auto',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <img
                            src={ctx.logo}
                            alt={ctx.name}
                            style={{
                              width: 24, height: 24, borderRadius: 6,
                              objectFit: 'contain',
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {/* Health halo ring */}
                          <div style={{
                            position: 'absolute', inset: -2, borderRadius: 14,
                            border: `1px solid ${ch.border}`,
                            opacity: 0.4,
                            pointerEvents: 'none',
                          }} />
                        </button>
                        {/* Tooltip with insight on click */}
                        {activeInsight === ctx.name && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            style={{
                              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                              marginTop: 8, zIndex: 20,
                              padding: '10px 14px', borderRadius: 12, minWidth: 200, maxWidth: 280,
                              background: 'var(--bg-primary)', border: `1px solid ${ch.border}`,
                              fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(12px)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <img src={ctx.logo} alt="" style={{ width: 14, height: 14, borderRadius: 3 }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{ctx.name}</span>
                              <span style={{ fontSize: 10, color: ch.text, textTransform: 'uppercase' }}>{ctx.health}</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>{ctx.insight}</div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

          </div>

            {/* ═══════ PROMPT BAR — Wired to omnilink-agent edge function ═══════ */}
            <form onSubmit={handleAgentExecution} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={agentLoading ? 'Agent is executing...' : 'Ask APEX Agent anything...'}
                disabled={agentLoading}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', transition: 'border-color 150ms',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              />
              <button
                type="submit"
                disabled={agentLoading || !promptValue.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  background: agentLoading ? 'var(--bg-surface)' : 'var(--accent)',
                  border: 'none', color: '#fff', fontSize: 13,
                  cursor: agentLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: (!promptValue.trim() && !agentLoading) ? 0.5 : 1,
                }}
              >
                {agentLoading ? '⏳' : 'Execute'}
              </button>
            </form>

            {/* Agent Response — real data from omnilink-agent */}
            {agentResponse && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 8, padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.3)',
                  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--health-green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Agent Execution Result</div>
                {agentResponse}
                <button type="button" onClick={() => setAgentResponse(null)} style={{ display: 'block', marginTop: 8, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
              </motion.div>
            )}

            {/* Agent Error */}
            {agentError && (
              <div style={{
                marginTop: 8, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: 12, color: 'var(--health-red)',
              }}>
                ⚠️ {agentError}
                <button type="button" onClick={() => setAgentError(null)} style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
              </div>
            )}

        </motion.div>
      </div>

      {/* ═══════ LIVE TRACE FEED — Real data from omni_run_events via Supabase Realtime ═══════ */}
      <div className="glass" style={{ padding: '12px 16px', borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>OmniTrace</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Live · Supabase Realtime</span>
        </div>
        <OmniTraceFeed />
      </div>

      {/* ═══════ INTEGRATED APPS — Draggable to OmniSlate ═══════ */}
      <div className="apps-hex" style={{ padding: '8px 16px 24px 16px', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14.7, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>Integrated Apps</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ALL SYSTEMS ({visibleApps.length})</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Drag to OmniSlate →</span>
        </div>
        <div className="integrated-grid">
          {visibleApps.map((app) => (
            <motion.div
              key={app.key}
              draggable
              onDragStart={(e) => {
                const event = e as unknown as React.DragEvent;
                if (event.dataTransfer) {
                  event.dataTransfer.setData('text/plain', app.key);
                  event.dataTransfer.effectAllowed = 'copy';
                }
              }}
              className="app-tile glass"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 14,
                cursor: 'grab', userSelect: 'none',
                transition: 'box-shadow 150ms ease, transform 150ms ease',
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.97 }}
            >
              <img
                src={app.logo}
                alt={app.name}
                style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)', padding: 4 }}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-heading)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: (() => { if (app.health === 'green') return 'var(--health-green)'; if (app.health === 'yellow') return 'var(--health-yellow)'; return 'var(--health-red)'; })() }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.cat}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {app.synced}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {/* Fill remaining slots if fewer than 3 apps */}
          {Array.from({ length: PLACEHOLDER_TILES_COUNT }, (_, i) => (
            <div key={`placeholder-${String(i)}`} className="app-tile-placeholder">
              <span style={{ fontSize: 11, letterSpacing: '0.03em' }}>Awaiting OmniBoard Integration</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
