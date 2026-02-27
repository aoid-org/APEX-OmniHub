/**
 * DashboardOverview - OmniBoard Center Content
 *
 * Hero: Agent (30%, left) | Top 3 (20%, right) | OmniSlate (50%, bottom)
 * OmniSlate = prompt bar + TTS recording + health-colored context tiles
 *
 * Mic exclusion: when OmniSlate mic is recording, Agent shows "Standby"
 *                when OmniSlate mic stops, Agent returns to "Listening..."
 */

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import sentinelAvatar from '@/assets/sentinel-avatar-icon.png';
import lightbulbIcon from '@/assets/lightbulb-icon.png';
import ecoAspiralIcon from '@/assets/eco-aspiral-icon.png';
import ecoTradelineIcon from '@/assets/eco-tradeline-icon.png';
import ecoArmageddonIcon from '@/assets/eco-armageddon-icon.png';
import appSalesforce from '@/assets/apps/salesforce.png';
import appHubspot from '@/assets/apps/hubspot.png';
import appQuickbooks from '@/assets/apps/quickbooks.png';
import appNetsuite from '@/assets/apps/netsuite.png';
import appSap from '@/assets/apps/sap.png';
import appGmail from '@/assets/apps/gmail.png';
import appSlack from '@/assets/apps/slack.png';
import appShopify from '@/assets/apps/shopify.png';
import appStripe from '@/assets/apps/stripe.png';
import appZapier from '@/assets/apps/zapier.png';
import appIntercom from '@/assets/apps/intercom.png';
import { useOmniModal } from '@/stores/omniModalStore';
import { useOmniMediaStore } from '@/stores/omniMediaStore';

/* ── Real app logos ── */

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
  { name: 'Salesforce',  cat: 'Sales',      logo: appSalesforce,  synced: '1m',  status: 'Live' as const },
  { name: 'HubSpot',     cat: 'Marketing',  logo: appHubspot,     synced: '3m',  status: 'Live' as const },
  { name: 'QuickBooks',  cat: 'Finance',    logo: appQuickbooks,  synced: '2m',  status: 'Live' as const },
  { name: 'NetSuite',    cat: 'ERP',        logo: appNetsuite,    synced: '1m',  status: 'Partial' as const },
  { name: 'SAP',         cat: 'ERP',        logo: appSap,         synced: '1m',  status: 'Live' as const },
  { name: 'Gmail',       cat: 'Comms',      logo: appGmail,       synced: '9m',  status: 'Live' as const },
  { name: 'Slack',       cat: 'Comms',      logo: appSlack,       synced: '1m',  status: 'Live' as const },
  { name: 'Shopify',     cat: 'Commerce',   logo: appShopify,     synced: '10m', status: 'Partial' as const },
  { name: 'Stripe',      cat: 'Payments',   logo: appStripe,      synced: '2m',  status: 'Live' as const },
  { name: 'Zapier',      cat: 'Automation', logo: appZapier,      synced: '3m',  status: 'Live' as const },
  { name: 'Intercom',    cat: 'Support',    logo: appIntercom,    synced: '3m',  status: 'Partial' as const },
  { name: 'Custom API',  cat: 'HTTP',       logo: lightbulbIcon,  synced: '',    status: 'Live' as const },
] as const;

const ECOSYSTEM = [
  { name: 'aSpiral',          desc: 'Mental Wellness App',    color: '#38bdf8', status: 'Active' as const,  icon: ecoAspiralIcon },
  { name: 'TradeLine 24/7',   desc: 'AI Receptionist',        color: '#f97316', status: 'Active' as const,  icon: ecoTradelineIcon },
  { name: 'Armageddon Test',  desc: 'Chaos Testing Suite', color: '#ef4444', status: 'Standby' as const, icon: ecoArmageddonIcon },
] as const;

/* ── Typography tokens ── */
const T = {
  heading: { fontFamily: 'inherit', fontWeight: 600, color: '#cad2e5' } as const,
  subhead: { fontFamily: 'inherit', fontWeight: 500, color: '#8b97b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em' } as const,
  body:    { fontFamily: 'inherit', fontWeight: 400, color: '#b8c4e0' } as const,
  mono:    { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 } as const,
  label:   { fontFamily: 'inherit', fontWeight: 500, color: '#8b97b8' } as const,
};

function deriveHealth(items: readonly ContextItem[]): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}

const O = '#c2501f'; // burnt orange

/* ── Shared frosted-glass style for all section cards ── */
const FROST = {
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(32px) saturate(180%)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 4px 15px rgba(0,0,0,0.3)',
} as const;

const FROST_HOVER = {
  scale: 1.03,
  borderColor: 'rgba(194, 80, 31, 0.45)',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 0 20px rgba(194,80,31,0.3), 0 8px 25px rgba(0,0,0,0.5)',
  translateY: -2,
} as const;

/* ── Component ── */

export const DashboardOverview = memo(function DashboardOverview() {
  const { invoke } = useOmniModal();
  const mediaStore = useOmniMediaStore();
  const [context] = useState<readonly ContextItem[]>(INITIAL_CONTEXT);
  const [activeInsight] = useState<string | null>(null);
  const [isRecording] = useState(false);
  const [recordingDuration] = useState(0);

  const health = deriveHealth(context);
  const s = HC[health];

  // ────────────────────────────────────────────────
  // Agent status derives from recording state
  const agentStatus = isRecording ? 'standby' : 'listening';

  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ═══════ HERO TRI-PANE — Kinetic Architecture ═══════ */}
      <div className="grid grid-cols-12 gap-4 w-full relative z-10">

        {/* ── LEFT PANE: APEX Agent (col-span-3) ── */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1 }}
          whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 170, damping: 26, mass: 1 } }}
          className="col-span-3 flex flex-col items-center justify-center relative overflow-hidden"
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
              <span style={{ fontSize: 11, ...T.subhead, letterSpacing: '0.15em' }}>APEX Agent</span>
              <span className="chip-live" style={agentStatus === 'standby' ? {
                background: 'rgba(250,204,21,0.1)', color: '#facc15',
                borderColor: 'rgba(250,204,21,0.2)',
              } : undefined}>
                {agentStatus === 'listening' ? 'Active' : 'Standby'}
              </span>
            </div>

            {/* Session Timer */}
            <div className="flex flex-col items-center text-center">
              <span style={{ fontSize: 10, ...T.subhead, letterSpacing: '0.15em' }}>Session</span>
              <span style={{ fontSize: 20, ...T.mono, color: '#cad2e5' }}>00:00</span>
            </div>

            {/* Avatar Orb */}
            <motion.div
              className="agent-orb"
              onClick={() => invoke({ id: 'agent-persona', provider: 'APEX Agent', type: 'selection', title: 'Select Agent Persona' })}
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
              <button title="Play" className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', transition: 'all 0.2s' }} onClick={() => mediaStore.loadMedia({ id: 'agent-vid', type: 'video', url: '/demo/agent.mp4', title: 'Agent Feed' })}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </button>
              <button title="Pause" className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" onClick={() => mediaStore.pause()} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', transition: 'all 0.2s' }}>
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
                  <span style={{ fontSize: 12, color: '#34d399', marginLeft: 6 }}>Listening...</span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: '#facc15' }}>⏸ Standby</span>
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
          className="col-span-6 flex flex-col justify-end relative overflow-hidden"
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
            {/* OmniSlate header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, ...T.subhead, letterSpacing: '0.15em' }}>OmniSlate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {health !== 'green' && (
                  <button type="button" onClick={() => invoke({ id: 'slate-clean', provider: 'OmniSlate', type: 'confirmation', title: 'Purge Slate?' })} title="View health insights" style={{
                    width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                    background: s.bg, border: `1px solid ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img src={lightbulbIcon} alt="Insights" style={{ width: 14, height: 14 }} />
                  </button>
                )}
                <button type="button" onClick={() => invoke({ id: 'slate-clean', provider: 'OmniSlate', type: 'confirmation', title: 'Purge Slate?' })} style={{
                  fontSize: 11, fontWeight: 500, padding: '5px 12px', borderRadius: 8,
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
                      <button type="button" onClick={() => invoke({ id: 'slate-context', provider: 'OmniSlate', type: 'selection', title: 'Manage Context' })} style={{
                        fontSize: 13, fontWeight: 500, padding: '5px 14px', borderRadius: 10,
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
                  fontSize: 13, fontWeight: 500, padding: '5px 14px', borderRadius: 10,
                  background: `rgba(194,80,31,0.06)`, border: `1px solid rgba(194,80,31,0.2)`,
                  color: '#f97316', cursor: 'pointer', fontFamily: 'inherit',
                }}>+ Add context</button>
              </div>
            )}

            {/* Prompt bar + TTS mic */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
              <input type="text" placeholder="Ask APEX Agent to do anything..." onClick={(e) => { e.stopPropagation(); invoke({ id: 'slate-input', provider: 'OmniSlate', type: 'form', title: 'Context Entry' }); }} style={{
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
                onClick={(e) => { e.stopPropagation(); invoke({ id: 'slate-mic', provider: 'System', type: 'confirmation', title: 'Activate Input?' }); }}
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
              <div onClick={(e) => { e.stopPropagation(); invoke({ id: 'slate-mic', provider: 'System', type: 'confirmation', title: 'Activate Input?' }); }} style={{
                width: 28, height: 28, borderRadius: 8,
                background: `rgba(194,80,31,0.08)`, border: `1px solid rgba(194,80,31,0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, color: '#94a3b8', cursor: 'pointer',
              }}>+</div>

              {/* Send */}
              <div onClick={(e) => { e.stopPropagation(); invoke({ id: 'slate-mic', provider: 'System', type: 'confirmation', title: 'Activate Input?' }); }} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `linear-gradient(135deg, #f97316, ${O})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 0 16px rgba(194,80,31,0.3)',
              }}>
                <span style={{ fontSize: 12, color: '#dfe6fe' }}>▶</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT PANE: Top 3 Outcomes (col-span-3) ── */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 1, delay: 0.1 }}
          whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 170, damping: 26, mass: 1 } }}
          className="col-span-3 flex flex-col relative overflow-hidden"
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
            <div style={{ fontSize: 18, ...T.heading, letterSpacing: '-0.02em' }}>Top 3 Outcomes</div>
            <div style={{ fontSize: 11, ...T.subhead, marginBottom: 16 }}>Today&apos;s Focus</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {OUTCOMES.map((o) => (
                <motion.div
                  key={o.rank}
                  onClick={() => invoke({ id: 'outcome-drill', provider: 'Analytics', type: 'form', title: 'Outcome Data' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderRadius: 14, background: 'rgba(0,0,0,0.20)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'grab', touchAction: 'none',
                  }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.4}
                  whileHover={{ scale: 1.02, translateX: 4, rotate: 0.5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span style={{ fontSize: 14, ...T.mono, color: '#5a6380', flexShrink: 0 }}>0{o.rank}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, ...T.heading, lineHeight: 1.3 }}>{o.title}</div>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2,
                      background: `${o.tagColor}18`, color: o.tagColor, border: `1px solid ${o.tagColor}40`,
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{o.tag}</span>
                  </div>
                  <span style={{ fontSize: 14, ...T.mono, color: '#cad2e5', flexShrink: 0 }}>{o.metric}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      {/* ═══════ APEX ECOSYSTEM (directly below hero) ═══════ */}
      <div style={{ padding: '0 0 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 18, ...T.heading, letterSpacing: '-0.02em' }}>APEX Ecosystem</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {ECOSYSTEM.map((p) => {
            const getEcoIdAndTitle = (name: string) => {
              if (name === 'aSpiral') return { id: 'eco-aspiral', title: 'aSpiral Engine Config' };
              if (name.includes('TradeLine')) return { id: 'eco-tradeline', title: 'TradeLine 24/7 Management' };
              return { id: 'eco-armageddon', title: 'Armageddon Suite Config' };
            };
            const ecoAction = getEcoIdAndTitle(p.name);
            return (
            <motion.div
              key={p.name}
              onClick={() => invoke({ id: ecoAction.id, provider: 'APEX Ecosystem', type: 'form', title: ecoAction.title })}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                borderRadius: 16, ...FROST,
                cursor: 'pointer', height: 80,
                transition: 'all 0.3s ease-out',
              }}
              whileHover={FROST_HOVER}
              whileTap={{ scale: 0.98 }}
            >
              <img src={p.icon} alt={p.name} style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                objectFit: 'cover', border: `1px solid ${p.color}40`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, ...T.heading }}>{p.name}</span>
                  <span className="chip-live" style={{
                    flexShrink: 0,
                    ...(p.status === 'Standby' ? {
                      background: 'rgba(250,204,21,0.12)', color: '#facc15',
                      borderColor: 'rgba(250,204,21,0.3)',
                    } : {})
                  }}>{p.status}</span>
                </div>
                <div style={{ fontSize: 11, ...T.label, marginTop: 2 }}>{p.desc}</div>
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>

      {/* ═══════ INTEGRATED APPS ═══════ */}
      <div style={{ padding: '0 0 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 18, ...T.heading, letterSpacing: '-0.02em' }}>Integrated Apps</span>
            <span style={{ fontSize: 12, ...T.mono, color: '#8b97b8' }}>ALL SYSTEMS ({APPS.length})</span>
          </div>
          <span onClick={() => invoke({ id: 'int-manage', provider: 'System', type: 'selection', title: 'Manage Connections' })} style={{ fontSize: 12, color: '#f97316', cursor: 'pointer', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {APPS.map((app) => (
            <motion.div 
              key={app.name} 
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                borderRadius: 16, ...FROST,
                cursor: 'pointer', height: 92,
                transition: 'all 0.3s ease-out',
              }}
              whileHover={FROST_HOVER}
              whileTap={{ scale: 0.98 }}
              onClick={() => invoke({ id: `int-auth-${app.name.toLowerCase()}`, provider: app.name, type: 'oauth', title: `Authenticate ${app.name}` })}
            >
              <img src={app.logo} alt={app.name} style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: '#09090b', objectFit: 'contain', padding: 6,
                border: `1px solid rgba(255,255,255,0.1)`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, ...T.heading }}>{app.name}</span>
                  <span className="chip-live" style={{
                    flexShrink: 0,
                    ...(app.status === 'Partial' ? {
                      background: 'rgba(250,204,21,0.12)', color: '#facc15',
                      borderColor: 'rgba(250,204,21,0.3)',
                    } : {})
                  }}>{app.status}</span>
                </div>
                <div style={{ fontSize: 11, ...T.subhead, marginTop: 4 }}>{app.cat}</div>
                {app.synced && <div style={{ fontSize: 11, ...T.mono, color: '#5a6380', marginTop: 2 }}>SYNC: {app.synced}</div>}
              </div>
              {app.status === 'Partial' && (
                <button type="button" onClick={(e) => { e.stopPropagation(); invoke({ id: `force-sync-${app.name.toLowerCase()}`, provider: app.name, type: 'confirmation', title: `Force Sync Data?` }); }} style={{
                  fontSize: 10, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
                  background: `rgba(249,115,22,0.1)`, border: `1px solid rgba(249,115,22,0.3)`,
                  color: '#f97316', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em',
                  flexShrink: 0,
                }}>Sync</button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
});
