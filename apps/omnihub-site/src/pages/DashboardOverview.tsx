/**
 * DashboardOverview - OmniBoard Center Content
 *
 * Hero: Agent (30%, left) | Top 3 (20%, right) | OmniSlate (50%, bottom)
 * OmniSlate = prompt bar + TTS recording + health-colored context tiles
 *
 * Mic exclusion: when OmniSlate mic is recording, Agent shows "Standby"
 *                when OmniSlate mic stops, Agent returns to "Listening..."
 */

import { memo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import lightbulbIcon from '@/assets/lightbulb-icon.png';

/* ── Real app logos via Clearbit ── */
const LOGO = (domain: string) => `https://logo.clearbit.com/${domain}`;

/* ── Data ── */

const OUTCOMES = [
  { rank: 1, title: 'Close 12 Invoices', tag: 'Finance',  tagColor: '#34d399', metric: '+$24.6K' },
  { rank: 2, title: 'Sync 48 Leads',     tag: 'Sales',    tagColor: '#38bdf8', metric: '+42' },
  { rank: 3, title: 'Resolve 7 Tickets', tag: 'Support',  tagColor: '#f97316', metric: '95%' },
] as const;

interface ContextItem {
  readonly name: string;
  readonly health: 'green' | 'yellow' | 'red';
  readonly insight: string;
}

const INITIAL_CONTEXT: readonly ContextItem[] = [
  { name: 'QuickBooks',  health: 'green',  insight: 'All syncs healthy. Last refresh 2m ago.' },
  { name: 'Salesforce',  health: 'yellow', insight: 'API rate limit at 78%. Consider batching calls.' },
  { name: 'SAP ERP',     health: 'red',    insight: 'Auth token expired. Re-authenticate to restore sync.' },
] as const;

const HC = {
  green:  { border: 'rgba(52,211,153,0.5)',  bg: 'rgba(52,211,153,0.06)',  text: '#34d399', shadow: '0 0 12px rgba(52,211,153,0.25)' },
  yellow: { border: 'rgba(250,204,21,0.5)',  bg: 'rgba(250,204,21,0.06)',  text: '#facc15', shadow: '0 0 12px rgba(250,204,21,0.25)' },
  red:    { border: 'rgba(239,68,68,0.5)',   bg: 'rgba(239,68,68,0.06)',   text: '#ef4444', shadow: '0 0 12px rgba(239,68,68,0.25)' },
} as const;


const APPS = [
  { name: 'Salesforce',  cat: 'Sales',      logo: LOGO('salesforce.com'),  synced: '1m',  status: 'Live' as const },
  { name: 'HubSpot',     cat: 'Marketing',  logo: LOGO('hubspot.com'),     synced: '3m',  status: 'Live' as const },
  { name: 'QuickBooks',  cat: 'Finance',    logo: LOGO('quickbooks.com'),  synced: '2m',  status: 'Live' as const },
  { name: 'NetSuite',    cat: 'ERP',        logo: LOGO('netsuite.com'),    synced: '1m',  status: 'Partial' as const },
  { name: 'SAP',         cat: 'ERP',        logo: LOGO('sap.com'),         synced: '1m',  status: 'Live' as const },
  { name: 'Gmail',       cat: 'Comms',      logo: LOGO('gmail.com'),       synced: '9m',  status: 'Live' as const },
  { name: 'Slack',       cat: 'Comms',      logo: LOGO('slack.com'),       synced: '1m',  status: 'Live' as const },
  { name: 'Shopify',     cat: 'Commerce',   logo: LOGO('shopify.com'),     synced: '10m', status: 'Partial' as const },
  { name: 'Stripe',      cat: 'Payments',   logo: LOGO('stripe.com'),      synced: '2m',  status: 'Live' as const },
  { name: 'Zapier',      cat: 'Automation', logo: LOGO('zapier.com'),      synced: '3m',  status: 'Live' as const },
  { name: 'Intercom',    cat: 'Support',    logo: LOGO('intercom.com'),    synced: '3m',  status: 'Partial' as const },
  { name: 'Custom API',  cat: 'HTTP',       logo: '',                      synced: '',    status: 'Live' as const },
] as const;

const ECOSYSTEM = [
  { name: 'aSpiral',          desc: 'AI Workforce Engine',    color: '#38bdf8', status: 'Active' },
  { name: 'TradeLine 24/7',   desc: 'Real-Time Trading',      color: '#f97316', status: 'Active' },
  { name: 'Armageddon Test',  desc: 'Chaos Engineering Suite', color: '#ef4444', status: 'Standby' },
] as const;

function deriveHealth(items: readonly ContextItem[]): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}

const O = '#c2501f'; // burnt orange

/* ── Component ── */

export const DashboardOverview = memo(function DashboardOverview() {
  const navigate = useNavigate();
  const [context, setContext] = useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);

  const health = deriveHealth(context);
  const s = HC[health];

  const handleCleanSlate = useCallback(() => { setContext([]); setActiveInsight(null); }, []);
  const toggleInsight = useCallback((n: string) => setActiveInsight(p => p === n ? null : n), []);

  // ────────────────────────────────────────────────
  // TTS Voice Recording - record-then-send (NOT real-time)
  // Mutual exclusion: recording ON → Agent "Standby"
  // ────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
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
      // Mic permission denied - fail silently
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
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

      {/* ═══════ HERO HEX ═══════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '17fr 8fr',
        gridTemplateRows: 'auto auto',
        gridTemplateAreas: `"agent outcomes" "slate slate"`,
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(24px)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 24,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.8)`,
        overflow: 'hidden',
        clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)',
      }}>

        {/* ── AGENT (top-left, 30%) ── */}
        <div style={{
          gridArea: 'agent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 27, borderRight: `1px solid rgba(255,255,255,0.05)`,
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
          background: `radial-gradient(ellipse at center, rgba(194,80,31,0.1) 0%, transparent 60%)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 13.91, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a1a1aa' }}>APEX Agent</span>
            <span className="chip-live" style={agentStatus === 'standby' ? {
              background: 'rgba(250,204,21,0.1)', color: '#facc15',
              borderColor: 'rgba(250,204,21,0.2)',
            } : undefined}>
              {agentStatus === 'listening' ? 'Active' : 'Standby'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 27 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10.7, fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Session</span>
              <span style={{ fontSize: 25.68, fontWeight: 800, color: '#dfe6fe', fontFamily: 'JetBrains Mono, monospace' }}>00:00</span>
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
              <div className="agent-orb-avatar">
                <img src={sentinelAvatar} alt="APEX Agent" />
              </div>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button title="Play" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </button>
              <button title="Pause" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              </button>
              <button title="Mute" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
              </button>
            </div>
          </div>
          {/* Mic status - mutually exclusive with OmniSlate recording */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8 }}>
            {agentStatus === 'listening' ? (
              <>
                {[{id: 'b1', h: 6}, {id: 'b2', h: 10}, {id: 'b3', h: 16}, {id: 'b4', h: 10}, {id: 'b5', h: 6}].map((bar) => (
                  <div key={bar.id} style={{ width: 3, height: bar.h, borderRadius: 2, background: '#34d399', opacity: 0.7 }} />
                ))}
                <span style={{ fontSize: 12.84, color: '#34d399', marginLeft: 6 }}>Listening...</span>
              </>
            ) : (
              <span style={{ fontSize: 12.84, color: '#facc15' }}>⏸ OmniSlate recording - agent on standby</span>
            )}
          </div>
        </div>

        {/* ── TOP 3 OUTCOMES (top-right, 20%) ── */}
        <div style={{
          gridArea: 'outcomes',
          display: 'flex', flexDirection: 'column', padding: 27,
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
        }}>
          <div style={{ fontSize: 19.26, fontWeight: 800, color: '#dfe6fe', marginBottom: 2, letterSpacing: '-0.02em' }}>Top 3 Outcomes</div>
          <div style={{ fontSize: 11.770000000000001, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 17 }}>Today's Focus</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
            {OUTCOMES.map((o) => (
              <motion.div 
                key={o.rank} 
                className="outcome-cube"
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.4}
                whileHover={{ scale: 1.02, translateX: 4, rotate: 0.5 }}
                whileTap={{ scale: 0.98 }}
                style={{ cursor: 'grab', touchAction: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16.05, fontWeight: 800, color: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}>0{o.rank}</span>
                  <span style={{ fontSize: 15.729000000000001, fontWeight: 800, color: '#e0e7ff', flex: 1, letterSpacing: '-0.01em' }}>{o.title}</span>
                  <span style={{
                    fontSize: 11.235000000000001, padding: '4px 10px', borderRadius: 6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: `${o.tagColor}18`, color: o.tagColor, border: `1px solid ${o.tagColor}40`
                  }}>{o.tag}</span>
                  <span style={{ fontSize: 16.799, fontWeight: 800, color: '#dfe6fe', fontFamily: 'JetBrains Mono, monospace' }}>{o.metric}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── OMNISLATE (bottom, 50%) - prompt + recording + context ── */}
        <div style={{ gridArea: 'slate', padding: 34, display: 'flex', flexDirection: 'column', gap: 12, background: `radial-gradient(ellipse at bottom, rgba(194,80,31,0.06) 0%, transparent 80%)` }}>
          <div style={{
            flex: 1, borderRadius: 16, padding: 20,
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid rgba(255,255,255,0.08)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), ${s.shadow}`,
            display: 'flex', flexDirection: 'column',
            transition: 'all 0.3s ease-out',
          }}>
            {/* OmniSlate header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.770000000000001, fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.15em', textTransform: 'uppercase' }}>OmniSlate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {health !== 'green' && (
                  <button type="button" onClick={() => setActiveInsight(p => p ? null : '__global__')} title="View health insights" style={{
                    width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                    background: s.bg, border: `1px solid ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img src={lightbulbIcon} alt="Insights" style={{ width: 14, height: 14 }} />
                  </button>
                )}
                <button type="button" onClick={handleCleanSlate} style={{
                  fontSize: 11.770000000000001, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                  background: `rgba(194,80,31,0.06)`, border: `1px solid rgba(194,80,31,0.2)`,
                  color: '#f97316', cursor: 'pointer', fontFamily: 'inherit',
                }}>CleanSlate</button>
              </div>
            </div>

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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
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
                        fontSize: 13.482000000000001, fontWeight: 700, padding: '5px 14px', borderRadius: 10,
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
                            fontSize: 12.305000000000001, color: '#cbd5e1', lineHeight: 1.5,
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
                  fontSize: 13.482000000000001, fontWeight: 700, padding: '5px 14px', borderRadius: 10,
                  background: `rgba(194,80,31,0.06)`, border: `1px solid rgba(194,80,31,0.2)`,
                  color: '#f97316', cursor: 'pointer', fontFamily: 'inherit',
                }}>+ Add context</button>
              </div>
            )}

            {/* Prompt bar + TTS mic button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
              <input type="text" placeholder="Ask APEX Agent to do anything..." style={{
                flex: 1, height: 46, borderRadius: 12, padding: '0 20px',
                background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.1)`,
                color: '#dfe6fe', fontSize: 15.729000000000001, outline: 'none', fontFamily: 'inherit',
                fontWeight: 500, transition: 'all 0.3s ease'
              }} 
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              />

              {/* TTS Record button - mutual exclusion with Agent mic */}
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
                  /* Stop icon (square) */
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
                ) : (
                  /* Mic icon */
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

              {/* Attach button */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `rgba(194,80,31,0.08)`, border: `1px solid rgba(194,80,31,0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17.12, color: '#94a3b8', cursor: 'pointer',
              }}>+</div>

              {/* Send button */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `linear-gradient(135deg, #f97316, ${O})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 0 16px rgba(194,80,31,0.3)',
              }}>
                <span style={{ fontSize: 12.84, color: '#dfe6fe' }}>▶</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ APEX ECOSYSTEM (swapped from bottom — Mutation 2) ═══════ */}
      <h2 style={{ fontSize: 19.26, fontWeight: 800, color: '#f97316', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0 0' }}>APEX Ecosystem</h2>
      <div className="eco-hex" style={{ padding: '32px' }}>
        {ECOSYSTEM.map((p) => (
          <motion.div
            key={p.name}
            className="eco-cube"
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.15}
            whileHover={{ scale: 1.05, translateY: -5, boxShadow: `0 10px 30px rgba(194,80,31,0.1)` }}
            whileTap={{ scale: 0.95 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 17.12, fontWeight: 800, color: p.color, letterSpacing: '-0.02em' }}>{p.name}</span>
              <span style={{
                position: 'absolute', top: 12, right: 12,
                fontSize: 10.700000000000001, fontWeight: 800, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: p.status === 'Active' ? 'rgba(52,211,153,0.1)' : 'rgba(161,161,170,0.1)',
                color: p.status === 'Active' ? '#4ade80' : '#a1a1aa',
                border: `1px solid ${p.status === 'Active' ? 'rgba(52,211,153,0.2)' : 'rgba(161,161,170,0.2)'}`,
              }}>{p.status}</span>
            </div>
            <div style={{ fontSize: 13.91, color: '#a1a1aa', fontWeight: 600 }}>{p.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* ═══════ INTEGRATED APPS ═══════ */}
      <div className="apps-hex" style={{ padding: '8px 32px 24px 32px', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 19.26, fontWeight: 800, color: '#dfe6fe', letterSpacing: '-0.02em' }}>Integrated Apps</span>
            <span style={{ fontSize: 12.84, fontWeight: 700, color: '#a1a1aa', fontFamily: 'JetBrains Mono, monospace' }}>ALL SYSTEMS ({APPS.length})</span>
          </div>
          <span style={{ fontSize: 12.84, color: '#f97316', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
              onClick={() => navigate('/omnidash/omniport')}
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
                  fontSize: 19.26, fontWeight: 800, color: '#f97316',
                }}>{app.name[0]}</div>
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
                {app.synced && <div style={{ fontSize: 11.235000000000001, color: '#71717a', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>SYNC: {app.synced}</div>}
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
