import { useState, useEffect, useCallback, useRef } from "react";
import { useDemoMode } from "../src/contexts/DemoModeContext";
import { useNavigate, useLocation } from "react-router-dom";
import { ModuleRenderer } from "./components/ModuleRenderer";
import { SystemHealthRow } from "./components/SystemHealthRow";
import { OmniTraceFeed } from "./components/OmniTraceFeed";
import { SentinelPanel } from "./components/SentinelPanel";
import { DraggableWidget } from './DraggableWidget';
import { useLayoutPersistence } from "./hooks/useLayoutPersistence";
import { useDashboardData } from "./hooks/useDashboardData";
import { useViewport } from "./hooks/useViewport";
import {
  SystemHealthOverview,
  AgentActivityTimeline,
  GuardianAlertFeed,
  ManModeReviewQueue,
  OmniRouteTraffic,
  WorkflowStatusBoard,
  SystemSparklines
} from './components/M03Panels';
import { useOmniModal, type OmniModalConfig } from '@/stores/omniModalStore';
import { useNotificationStore } from '../src/stores/notificationStore';
import { queryAgentRegistry, invokeMcpIntent } from '@/omnihub-gateway/mcp-client';
import { OmniSpatialHost } from '@/dashboard/components/OmniSpatialHost';
import { OmniMobileBottomNav, type MobileTab } from '@/dashboard/components/OmniMobileBottomNav';
import { OmniMobileDrawer } from '@/dashboard/components/OmniMobileDrawer';
import { supabase } from '@/lib/supabase';
import {
  OMNIDASH_SIDEBAR_WIDGETS,
  type OmniDashSidebarWidget,
} from '@/contracts/omnidash-sidebar-widgets';
import { toast } from 'sonner';

import imgWordmark from "../../../src/assets/omnidash/omnidash-logo.png";
import imgIcons from "../../../src/assets/omnidash/icons.png";
import imgApexWm from "../../../src/assets/omnidash/apex_omnihub_wordmark.png";
import { AVATAR_PATH_MAP } from './contracts/agentAvatars';
import { T, StatusDot, GlassCard, SectionLabel } from './designSystem';

// ─── TypeScript Interfaces ───────────────────────────────────────────────────
import type { CSSProperties, Dispatch, SetStateAction, RefObject } from "react";

interface AppIconProps {
  idx: number;
  size?: number;
  style?: CSSProperties;
}

interface IconBadgeProps {
  idx: number;
  size?: number;
  style?: CSSProperties;
}

type NavEntry = OmniDashSidebarWidget;

interface NavItemProps {
  n: NavEntry;
  isActive: boolean;
  onClick: () => void;
}


import type { DashboardNavSection } from "./types/dashboard.types";

interface OmniDashSidebarProps {
  activeNav: string;
  setActiveNav: Dispatch<SetStateAction<string>>;
  canvasRef: RefObject<HTMLDivElement>;
}

interface OmniDashHeaderProps {
  tick: number;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  invoke: (config: OmniModalConfig) => void;
}

export type OmniHealthState = 'green' | 'yellow' | 'red';

export interface OmniContextApp {
  id: string;
  label: string;
  health: OmniHealthState;
  iconIdx?: number;
}

interface AgentWidgetProps {
  tick: number;
}



// ─── APEX Brand Assets ────────────────────────────────────────────────────────
const IMG_BADGE = "/assets/apex-core-badge.svg";
const IMG_WORDMARK = imgWordmark;
// Avatar served from public/avatars/ — NOT a bundled import
const IMG_AVATAR = AVATAR_PATH_MAP.Default;
const IMG_ICONS = imgIcons;

const IMG_APEX_WM = imgApexWm;

// ─── Design System ────────────────────────────────────────────────────────────
// Tokens (T) and primitives (StatusDot, GlassCard, SectionLabel) are imported
// from ./designSystem so panel modules can share them without a circular import.

function getHealthPalette(health: OmniHealthState): {
  bg: string;
  border: string;
  color: string;
} {
  if (health === "red") {
    return { bg: `${T.red}22`, border: `${T.red}66`, color: T.red };
  }
  if (health === "yellow") {
    return { bg: `${T.warn}22`, border: `${T.warn}66`, color: T.warn };
  }
  return { bg: `${T.green}22`, border: `${T.green}66`, color: T.green };
}

function inferContextHealth(id: string, includeSecurity: boolean): OmniHealthState {
  if (id.includes("awaiting")) return "red";
  if (id.includes("trace") || id.includes("ops") || (includeSecurity && id.includes("security"))) {
    return "yellow";
  }
  return "green";
}

// ─── Icon Sprite (9-icon grid from app_icons.png: 3x3, source 1024x1024) ─────
// Row 0: Brain(0), Shield(1), Photo(2)
// Row 1: Database(3), CPU(4), Mind(5)
// Row 2: Play(6), Clock(7), Folder(8)
const SPRITE_COLS = 3;


const AppIcon = ({ idx, size = 28, style = {} }: AppIconProps) => {
  const col = idx % SPRITE_COLS;
  const row = Math.floor(idx / SPRITE_COLS);
  // Scale: rendered cell = size, so full sprite = size * SPRITE_COLS
  const fullSize = size * SPRITE_COLS;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      backgroundImage: `url(${IMG_ICONS})`,
      backgroundSize: `${fullSize}px ${fullSize}px`,
      backgroundPosition: `-${col * size}px -${row * size}px`,
      backgroundRepeat: "no-repeat",
      imageRendering: "auto",
      ...style
    }} />
  );
};


// ─── IconBadge — unified white-border icon wrapper ───────────────────────────
const IconBadge = ({ idx, size = 19, style = {} }: IconBadgeProps) => (
  <div style={{
    width: size + 14, height: size + 14, borderRadius: 10, flexShrink: 0,
    display:"flex", alignItems:"center", justifyContent:"center",
    background: "linear-gradient(145deg, #1a2236, #0e1525)",
    border: "2.5px solid rgba(255,255,255,0.82)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
    ...style,
  }}>
    <AppIcon idx={idx} size={size} />
  </div>
);
// ─── Helpers ─────────────────────────────────────────────────────────────────
const pulse = `@keyframes apexPulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:.5; transform:scale(.85); }
}`;
const shimmer = `@keyframes apexShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}`;
const fadeIn = `@keyframes apexFadeIn {
  from { opacity:0; transform:translateY(6px); }
  to   { opacity:1; transform:translateY(0); }
}`;
const navGlow = `@keyframes navGlow {
  0%,100% { box-shadow: 0 0 18px ${T.orange}30, inset 0 0 12px ${T.orange}10; }
  50%      { box-shadow: 0 0 28px ${T.orange}55, inset 0 0 20px ${T.orange}18; }
}`;
const ringRotate = `@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}`;
const ringBreath = `@keyframes ringBreath {
  0%,100% { opacity: 0.12; transform: scale(1);    }
  50%      { opacity: 0.32; transform: scale(1.04); }
}`;
const ringBreath2 = `@keyframes ringBreath2 {
  0%,100% { opacity: 0.08; transform: scale(1);    }
  50%      { opacity: 0.22; transform: scale(1.06); }
}`;
const scanLine = `@keyframes scanLine {
  0% { top: 0%; } 100% { top: 100%; }
}`;

// StatusDot, GlassCard, SectionLabel are imported from ./designSystem above.
// DraggableWidget is imported from ./DraggableWidget (extracted for testability).

// ─── NavItem ──────────────────────────────────────────────────────────────────
// ALL tiles use OmniBoard's exact look as the base.
// isActive = brighter border + stronger glow only.
const NavItem = ({ n, isActive, onClick }: NavItemProps) => {
  const [hov, setHov] = useState<boolean>(false);
    const borderColors = {
      active: `${T.orange}66`,
      hover: `${T.orange}44`,
      base: `${T.orange}28`
    };
    const bgOpacities = {
      active: "20",
      hover: "16",
      base: "10"
    };
    
    const resolveShadow = (isActive: boolean, hov: boolean) => {
      if (isActive) return `0 0 0 1px ${T.orange}22, 0 4px 16px ${T.orange}28, 0 2px 6px rgba(0,0,0,.5)`;
      if (hov) return `0 0 0 1px ${T.orange}18, 0 4px 14px ${T.orange}20, 0 2px 4px rgba(0,0,0,.4)`;
      return `0 0 0 1px ${T.orange}10, 0 2px 10px ${T.orange}14, 0 1px 3px rgba(0,0,0,.35)`;
    };

    const resolveBorder = (isActive: boolean, hov: boolean) => {
      if (isActive) return `2.5px solid rgba(255,255,255,0.90)`;
      if (hov) return `2.5px solid rgba(255,255,255,0.70)`;
      return `2.5px solid rgba(255,255,255,0.55)`;
    };

    const resolveFilter = (isActive: boolean, hov: boolean) => {
      if (isActive) return `drop-shadow(0 0 4px ${T.orange}bb) brightness(1.15)`;
      if (hov) return `drop-shadow(0 0 2px ${T.orange}55) brightness(1.05)`;
      return `drop-shadow(0 0 1px ${T.orange}55) brightness(0.9)`;
    };

    const resolveState = (active: boolean, hover: boolean, map: { active: string; hover: string; base: string }) => {
      if (active) return map.active;
      if (hover) return map.hover;
      return map.base;
    };
  return (
    <button
      className="omni-nav-item"
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData(
          'application/apex-tile',
          JSON.stringify({ id: n.id, label: n.label, iconIdx: n.iconIdx }),
        )
      }
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"7px 10px", borderRadius:11,
        width:"100%", textAlign:"left", cursor:"pointer",
        transition:"all .18s ease",
        fontSize:14.1,
        // ── OmniBoard baseline applied to every tile ──────────────────────
        border: `1px solid ${resolveState(isActive, hov, borderColors)}`,
        background: `linear-gradient(100deg, ${T.orange}${resolveState(isActive, hov, bgOpacities)} 0%, ${T.card} 60%)`,
        color: isActive ? T.t1 : T.t2,
        fontWeight: isActive ? 600 : 400,
        boxShadow: resolveShadow(isActive, hov),
      }}>

  {/* Icon badge — iOS-style white frame, orange glow on active */}
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isActive
          ? `linear-gradient(145deg, #1e2a3e, #111d30)`
          : `linear-gradient(145deg, #1a2236, #0e1525)`,
        border: resolveBorder(isActive, hov),
        boxShadow: isActive
          ? `0 0 10px ${T.orange}30, 0 2px 8px rgba(0,0,0,0.5)`
          : `0 2px 6px rgba(0,0,0,0.4)`,
        transition:"all .18s ease",
      }}>
        <AppIcon idx={n.iconIdx} size={21} style={{
          filter: resolveFilter(isActive, hov),
          transition:"filter .18s",
        }} />
      </div>

      <span>{n.label}</span>

      {isActive && (
        <div style={{
          marginLeft:"auto", width:5, height:5, borderRadius:"50%",
          background:T.orange, flexShrink:0,
          boxShadow:`0 0 6px ${T.orange}`,
          animation:"apexPulse 2.8s ease-in-out infinite",
        }} />
      )}
    </button>
  );
};

// ─── Shell: Sidebar ──────────────────────────────────────────────────────────
const OmniDashSidebar = ({ activeNav, setActiveNav, canvasRef }: OmniDashSidebarProps) => {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState<boolean>(false);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      globalThis.location.href = '/login';
    } catch {
      setSigningOut(false);
    }
  }, [signingOut]);

  const handleNav = (widget: OmniDashSidebarWidget) => {
    setActiveNav(widget.label);

    if (!widget.moduleKey) {
      canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      navigate('/omnidash');
      return;
    }

    navigate(`/omnidash/${widget.moduleKey}`);
  };

  return (
    <div className="omni-sidebar" style={{
      width:228, flexShrink:0,
      background:`linear-gradient(180deg, ${T.surface} 0%, ${T.bg} 100%)`,
      borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column",
      padding:"10px 10px 0",
      gap:3,
      overflowY:"auto",
    }}>
      {OMNIDASH_SIDEBAR_WIDGETS.map((widget) => (
        <NavItem
          key={widget.id}
          n={widget}
          isActive={activeNav === widget.label}
          onClick={() => handleNav(widget)}
        />
      ))}

      {/* Status Footer */}
      <div className="omni-sidebar-footer" style={{ marginTop:"auto", padding:"16px 12px 20px", borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <StatusDot color={T.green} />
          <span style={{ fontSize:11.9, color:T.t2, fontWeight:500 }}>All Systems Operational</span>
        </div>
        <div style={{ fontSize:10.8, color:T.t3 }}>APEX Business Systems Ltd.</div>
        <div style={{ fontSize:9.8, color:T.t4, marginTop:2 }}>Edmonton, AB · Canada</div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            marginTop:12, width:"100%",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7,
            padding:"7px 0", borderRadius:10,
            background:"rgba(249,115,22,0.06)", border:`1px solid ${T.orange}26`,
            color: signingOut ? T.t3 : "rgba(249,115,22,0.75)",
            fontSize:11.9, fontWeight:600, cursor: signingOut ? "not-allowed" : "pointer",
            letterSpacing:"0.04em", transition:"all .18s",
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ animation: signingOut ? "spin 1s linear infinite" : "none" }}>
            {signingOut
              ? <><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></>
              : <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>
            }
          </svg>
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
};

// ─── Shell: Header ────────────────────────────────────────────────────────────
const OmniDashHeader = ({ tick, isDark, setIsDark, invoke }: OmniDashHeaderProps) => {
  const [orgOpen, setOrgOpen] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<string | null>(() => localStorage.getItem('omni_ai_provider'));
  const pulse = tick % 2 === 0;

  const handleOmniSkills = () => {
    invoke({
      id: 'header-omniskills',
      provider: 'omnidash',
      type: 'module',
      title: 'OmniSkills',
      contextData: { moduleKey: 'omniskills' },
      onComplete: async () => { toast.success('OmniSkills configured'); },
      onCancel: () => {},
    });
  };

  const handleConnectAI = async () => {
    // APEX-DEV: Requesting directly from central Agent Card Registry per gateway mandate
    const items = await queryAgentRegistry();
    invoke({
      id: 'header-connect-ai',
      provider: 'omnidash',
      type: 'selection',
      title: 'Connect AI Provider',
      description: 'Select an AI provider to integrate with your APEX workspace.',
      schema: { items },
      onComplete: async (result: Record<string, unknown>) => {
        if (typeof result.selectedId === 'string') {
          const selected = items.find(i => i.id === result.selectedId);
          if (selected) {
            setAiProvider(selected.label);
            localStorage.setItem('omni_ai_provider', selected.label);
          }
        }
      },
      onCancel: () => {},
    });
  };

  const notifications = useNotificationStore(state => state.notifications);
  const unreadCount = useNotificationStore(state => state.getUnreadCount());
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);

  const handleBell = () => {
    if (notifications.length === 0) {
      invoke({
        id: 'header-notifications',
        provider: 'omnidash',
        type: 'selection',
        title: 'Notifications',
        description: 'You have no pending notifications or approvals.',
        schema: {
          items: [],
        },
        onComplete: async () => {},
        onCancel: () => {},
      });
      return;
    }

    invoke({
      id: 'header-notifications',
      provider: 'omnidash',
      type: 'selection',
      title: 'Notifications',
      description: 'Recent activity across your APEX workspace.',
      schema: {
        items: notifications.map(n => ({
          id: n.id,
          label: n.label,
          badge: n.badge
        }))
      },
      onComplete: async () => { 
        markAllAsRead();
        toast.info('Notifications marked read'); 
      },
      onCancel: () => {},
    });
  };
  return (
    <div style={{
      height:58, flexShrink:0,
      background:`${T.surface}f0`,
      borderBottom:`1px solid ${T.border}`,
      backdropFilter:"blur(20px)",
      display:"flex", alignItems:"center",
      padding:"0 20px 0 12px", gap:0,
      zIndex:100,
    }}>
      {/* Wordmark */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", marginRight:10 }}>
        <img
          src={IMG_WORDMARK}
          alt="APEX-OmniHub"
          style={{ height:30, width:210, objectFit:"contain", display:"block" }}
        />
      </div>

      {/* OmniSkills */}
      <button onClick={handleOmniSkills} style={{
        display:"flex", alignItems:"center", gap:7, flexShrink:0,
        background:T.card, border:`1px solid ${T.border}`,
        borderRadius:10, padding:"0 11px", height:44,
        color:T.t1, fontSize:13, cursor:"pointer", fontWeight:500,
        whiteSpace:"nowrap", marginRight:10,
        transition:"border-color .15s, background .15s",
      }}>
        <IconBadge idx={0} size={17} />
        OmniSkills
      </button>

      {/* Search — takes all remaining center space, max 360px */}
      <div className="omni-header-search" style={{ flex:1, display:"flex", justifyContent:"center", marginRight:10 }}>
        <div style={{
          display:"flex", alignItems:"center", gap:9,
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:10, padding:"0 12px",
          width:"100%", maxWidth:360, height:44,
          color:T.t2, fontSize:13,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span style={{color:T.t3, flex:1}}>Search OmniHub…</span>
          <span style={{fontSize:10.3,color:T.t4,background:T.surface,padding:"2px 5px",borderRadius:5,fontWeight:600}}>⌘K</span>
        </div>
      </div>

      {/* Right actions — functional buttons */}
      <div className="omni-header-actions" style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
        {/* Org Selector */}
        <div style={{ position:"relative" }}>
          <button id="org-selector-btn" onClick={() => setOrgOpen(o => !o)} style={{
            display:"flex", alignItems:"center", gap:6,
            background:T.card, border:`1px solid ${orgOpen ? T.orange+"66" : T.border}`,
            borderRadius:10, padding:"0 10px", height:34,
            color:T.t1, fontSize:12.4, cursor:"pointer", fontWeight:500,
            whiteSpace:"nowrap", maxWidth:170, overflow:"hidden",
            transition:"border-color .15s",
          }}>
            <img src={IMG_BADGE} alt="Org Badge" style={{width:16,height:16,objectFit:"contain",flexShrink:0}} />
            <span style={{ maxWidth:105, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>APEX Business Systems</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transition:"transform .2s", transform: orgOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          {orgOpen && (
            <div style={{
              position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200,
              background:T.card, border:`1px solid ${T.border}`,
              borderRadius:12, minWidth:210, overflow:"hidden",
              boxShadow:`0 8px 32px rgba(0,0,0,.5)`,
              animation:"apexFadeIn .15s ease",
            }}>
              <div style={{ padding:"10px 14px 8px", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11.9, fontWeight:700, color:T.t1 }}>APEX Business Systems</div>
                <div style={{ fontSize:10.3, color:T.t3, marginTop:2 }}>Edmonton, AB · Enterprise</div>
              </div>
              {[
                { label:"Workspace Settings", icon:"⚙️", action: () => { setOrgOpen(false); invoke({ id:'org-settings', provider:'omnidash', type:'module', title:'Settings', contextData:{ moduleKey:'settings' }, onComplete: async () => { toast.success('Settings updated'); }, onCancel: () => {} }); } },
                { label:"Billing & Plans", icon:"💳", action: () => { setOrgOpen(false); invoke({ id:'org-billing', provider:'omnidash', type:'module', title:'Billing', contextData:{ moduleKey:'billing' }, onComplete: async () => { toast.success('Billing changes applied'); }, onCancel: () => {} }); } },
                { label:"Invite Members", icon:"👥", action: () => { setOrgOpen(false); invoke({ id:'org-invite', provider:'omnidash', type:'form', title:'Invite Team Member', schema: { fields: [{ key:'email', label:'Email Address', type:'email', placeholder:'teammate@company.com', required:true }, { key:'role', label:'Role', type:'text', placeholder:'e.g. Admin, Viewer' }] }, onComplete: async (result) => { toast.success(`Invitation sent successfully to ${(result.data as Record<string, string>)?.email || 'team member'}.`); }, onCancel: () => {} }); } },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{
                  display:"flex", alignItems:"center", gap:10,
                  width:"100%", padding:"9px 14px", textAlign:"left",
                  background:"none", border:"none", cursor:"pointer",
                  color:T.t1, fontSize:13.5, transition:"background .12s",
                }}>
                  <span style={{ fontSize:15 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zero Trust */}
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          border:`1px solid ${T.green}44`,
          background:`${T.green}12`,
          borderRadius:10, padding:"0 11px", height:34,
          color:T.green, fontSize:12.4, fontWeight:700,
          whiteSpace:"nowrap",
        }}>
          <div style={{
            width:6, height:6, borderRadius:"50%", background:T.green, flexShrink:0,
            boxShadow:`0 0 ${pulse?8:4}px ${T.green}`,
            transition:"box-shadow .5s",
          }} />
          Zero Trust Active
        </div>

        {/* Connect AI */}
        <button onClick={handleConnectAI} style={{
          background:`linear-gradient(135deg, ${T.orange} 0%, ${T.orangeDim} 100%)`,
          border:"none", borderRadius:10, padding:"0 13px", height:34,
          color:"#fff", fontSize:12.4, fontWeight:700,
          cursor:"pointer", boxShadow:`0 4px 16px ${T.orange}44`,
          whiteSpace:"nowrap",
          transition:"opacity .15s",
        }}>
          {aiProvider || 'Connect AI'}
        </button>

        {/* Divider — separates action buttons from icon tray */}
        <div style={{ width:1, height:28, background:T.border, flexShrink:0, marginLeft:2, marginRight:2 }} />

        {/* Theme Toggle — Sun/Moon */}
        <button onClick={() => setIsDark(d => !d)} style={{
          width:34, height:34, borderRadius:9, flexShrink:0,
          background:T.card, border:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", color: isDark ? T.warn : T.blue,
          transition:"color .2s",
        }}>
          {isDark
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
          }
        </button>

        {/* Bell */}
        <button onClick={handleBell} style={{
          width:34, height:34, borderRadius:9, flexShrink:0,
          background:T.card, border:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", color:T.t2, position:"relative",
          transition:"border-color .15s",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <div style={{
              position:"absolute", top:-4, right:-4, minWidth:16, height:16, 
              borderRadius:8, background:T.orange, border:`2px solid ${T.surface}`,
              color:"#fff", fontSize:9, fontWeight:800, display:"flex",
              alignItems:"center", justifyContent:"center", padding:"0 4px"
            }}>
              {unreadCount}
            </div>
          )}
        </button>

        {/* Avatar */}
        <div style={{
          width:34, height:34, borderRadius:9, flexShrink:0,
          background:`linear-gradient(135deg,${T.blue},${T.orange})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:"#fff",fontSize:11.9,fontWeight:800,
          boxShadow:`0 2px 8px ${T.blue}44`,
          cursor:"pointer",
        }}>JR</div>
      </div>
    </div>
  );
};

// ─── Widget: APEX Agent ───────────────────────────────────────────────────────
const AgentWidget = ({ tick: _tick }: AgentWidgetProps) => {
  const { demoMode, autoPilot, setAutoPilot } = useDemoMode();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (demoMode) {
      const interval = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(interval);
    } else {
      setSeconds(0);
    }
  }, [demoMode]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const handlePlayPause = () => setAutoPilot(!autoPilot);
  const handleReset = () => { setAutoPilot(false); setSeconds(0); };
  const isRunning = autoPilot;

  return (
    <GlassCard style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header — unified 44px */}
      <div style={{ height:44, padding:"0 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <SectionLabel>APEX Agent</SectionLabel>
        <StatusDot color={isRunning ? T.green : T.warn} />
      </div>

      {/* Session Timer — compact */}
      <div style={{ textAlign:"center", padding:"8px 16px 4px" }}>
        <div style={{ fontSize:8.7, color:T.t3, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>SESSION</div>
        <div style={{
          fontSize:19.5, fontWeight:700, letterSpacing:"0.06em",
          fontVariantNumeric:"tabular-nums",
          background:`linear-gradient(135deg,${T.t1},${T.t2})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>{mm}:{ss}</div>
      </div>

      {/* Avatar + orbital ring visualizer */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"relative", width:136, height:136, display:"flex", alignItems:"center", justifyContent:"center" }}>

          {/* Breathing ring — outermost, slowest */}
          <div style={{
            position:"absolute",
            width:130, height:130, borderRadius:"50%",
            border:`1px solid ${T.orange}`,
            animation:"ringBreath2 3.8s ease-in-out infinite",
            transformOrigin:"center",
          }} />

          {/* Breathing ring — mid */}
          <div style={{
            position:"absolute",
            width:116, height:116, borderRadius:"50%",
            border:`1.5px solid ${T.orange}`,
            animation:"ringBreath 2.6s ease-in-out infinite 0.4s",
            transformOrigin:"center",
          }} />

          {/* Rotating comet arc — CSS-native 60fps */}
          <div style={{
            position:"absolute",
            width:108, height:108,
            borderRadius:"50%",
            animation:"ringRotate 2.8s linear infinite",
            transformOrigin:"center",
          }}>
            <svg width="108" height="108" viewBox="0 0 108 108" style={{ display:"block" }}>
              <defs>
                <linearGradient id="cometGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={T.orange} stopOpacity="0"/>
                  <stop offset="60%"  stopColor={T.orange} stopOpacity="0.6"/>
                  <stop offset="100%" stopColor={T.orange} stopOpacity="1"/>
                </linearGradient>
              </defs>
              {/* Arc using strokeDasharray — shows ~35% of circumference as the comet tail */}
              <circle
                cx="54" cy="54" r="50"
                fill="none"
                stroke="url(#cometGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="110 205"
                strokeDashoffset="0"
              />
            </svg>
          </div>

          {/* Counter-rotating inner comet — cyan, slower */}
          <div style={{
            position:"absolute",
            width:92, height:92,
            borderRadius:"50%",
            animation:"ringRotate 4.4s linear infinite reverse",
            transformOrigin:"center",
          }}>
            <svg width="92" height="92" viewBox="0 0 92 92" style={{ display:"block" }}>
              <defs>
                <linearGradient id="cometGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={T.cyan} stopOpacity="0"/>
                  <stop offset="70%"  stopColor={T.cyan} stopOpacity="0.35"/>
                  <stop offset="100%" stopColor={T.cyan} stopOpacity="0.7"/>
                </linearGradient>
              </defs>
              <circle
                cx="46" cy="46" r="42"
                fill="none"
                stroke="url(#cometGrad2)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="70 194"
                strokeDashoffset="0"
              />
            </svg>
          </div>

          {/* Avatar */}
          <div style={{
            width:80, height:80, borderRadius:"50%",
            overflow:"hidden", position:"relative", zIndex:1,
            border:`2px solid ${T.orange}55`,
            boxShadow:`0 0 14px ${T.orange}28, 0 0 28px ${T.orange}12`,
          }}>
            <img src={IMG_AVATAR} alt="APEX Agent" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy" decoding="async" />
          </div>
        </div>
      </div>

      {/* Controls — Start/Pause + Reset, pinned to bottom */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, padding:"12px 16px 16px", flexShrink:0 }}>
        {/* Play / Pause */}
        <button
          onClick={handlePlayPause}
          title={isRunning ? "Pause" : "Start"}
          style={{
            width:44, height:44, borderRadius:12,
            border:`1px solid ${T.orange}88`,
            background: isRunning ? `${T.orange}28` : `${T.orange}18`,
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer", color:T.orange,
            boxShadow: isRunning ? `0 0 10px ${T.orange}44` : "none",
            transition:"all .2s",
          }}
        >
          {isRunning
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          }
        </button>
        {/* Reset */}
        <button
          onClick={handleReset}
          title="Reset"
          style={{
            height:44, borderRadius:12, padding:"0 14px",
            border:`1px solid ${T.border}`,
            background:T.surface,
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            cursor:"pointer", color:T.t2,
            fontSize:11.4, fontWeight:600, letterSpacing:"0.04em",
            transition:"all .2s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/>
          </svg>
          RES.
        </button>
      </div>
    </GlassCard>
  );
};

const ContextDroplet = ({ app, onRemove }: { app: OmniContextApp, onRemove: () => void }) => {
  const [hov, setHov] = useState(false);
  const palette = getHealthPalette(app.health);
  const icon = app.iconIdx === undefined
    ? <span style={{fontSize:13}}>{app.label.charAt(0).toUpperCase()}</span>
    : <AppIcon idx={app.iconIdx} size={16} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />;

  return (
    <button
      onClick={onRemove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={`Remove ${app.label}`}
      style={{
        width: 28, height: 28, borderRadius: 8,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: palette.color,
        fontSize: 14, fontWeight: 700,
        boxShadow: `inset 0 0 10px rgba(0,0,0,0.5)`,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.15s ease",
        transform: hov ? "scale(1.05)" : "scale(1)",
      }}
    >
      <div style={{ opacity: hov ? 0.15 : 1, transition: "opacity 0.15s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      {hov && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
      )}
    </button>
  );
};

const OmniSlateWidget = () => {
  const { demoMode } = useDemoMode();
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);

  useEffect(() => {
    if (demoMode && messages.length === 0) {
      setMessages([
        { role: 'assistant', text: 'APEX Agent initialized. Demo Mode active. How can I assist you with your operations today?' },
        { role: 'user', text: 'Show me the latest Salesforce integration status.' },
        { role: 'assistant', text: 'Salesforce sync completed 5 minutes ago. 48 records updated. No errors detected.' }
      ]);
    } else if (!demoMode && messages.length > 0 && messages[0].text.includes('Demo Mode active')) {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, messages.length]);
  const [loading, setLoading] = useState<boolean>(false);
  const [contextApps, setContextApps] = useState<OmniContextApp[]>([]);
  const [showContext, setShowContext] = useState<boolean>(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const q = input.trim(); setInput(""); setLoading(true);
    setMessages(m => [...m, {role:"user", text:q}]);
    
    try {
      const res = await invokeMcpIntent({ prompt: q, context: {} });
      setMessages(m => [...m, {role:"assistant", text: res.reply }]);
    } catch (err) {
      console.error('[OmniSlateWidget] mcp-client invocation failed:', err);
      setMessages(m => [...m, {role:"assistant", text:`[System Error]: Failed to contact APEX Agent. Guardian audit logged.`}]);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const stop = useCallback(() => {
    setLoading(false);
    setMessages(m => m.length > 0 && m.at(-1)?.role === 'user'
      ? [...m, {role:"assistant", text:"— Response stopped by user."}]
      : m
    );
  }, []);

  // Seed / clear demo conversation when demo mode toggles
  useEffect(() => {
    if (isDemoMode && messages.length === 0) {
      setMessages([...DEMO_SLATE_MESSAGES]);
    }
  // messages intentionally excluded — we only seed when the feed is empty
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode]);

  const fillSuggestion = () => {
    setInput(isDemoMode ? DEMO_TRY_SUGGESTION : "Summarize all open workflows and flag anything stalled over 24 hours.");
  };

  const addContextApp = useCallback(
    (id: string, label: string, iconIdx: number | undefined, includeSecurity: boolean) => {
      setContextApps(prev => {
        if (prev.some(a => a.id === id)) return prev;
        const health = inferContextHealth(id, includeSecurity);
        return [...prev, { id, label, health, iconIdx }];
      });
    },
    [],
  );

  useEffect(() => {
    const handleWidgetDrop = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; label: string; iconIdx?: number }>;
      const { id, label, iconIdx } = customEvent.detail;
      addContextApp(id, label, iconIdx, false);
    };
    globalThis.addEventListener("omnislate-drop", handleWidgetDrop);
    return () => globalThis.removeEventListener("omnislate-drop", handleWidgetDrop);
  }, [addContextApp]);

  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const handleRemoveContextApp = useCallback((appId: string) => {
    setContextApps(prev => prev.filter(a => a.id !== appId));
  }, []);

  let aggregateHealth: string | null = null;
  if (contextApps.length > 0) {
    if (contextApps.some(a => a.health === "red")) {
      aggregateHealth = T.red;
    } else if (contextApps.some(a => a.health === "yellow")) {
      aggregateHealth = T.warn;
    } else {
      aggregateHealth = T.green;
    }
  }
  const contextAccent = aggregateHealth ?? T.orange;
  const contextBackground = `${contextAccent}22`;
  const contextBorderColor = aggregateHealth ? `${aggregateHealth}aa` : `${T.orange}44`;
  const contextBorder = `1px solid ${contextBorderColor}`;
  const contextBoxShadow = aggregateHealth ? `0 0 8px ${aggregateHealth}44` : "none";

  return (
    <GlassCard glow style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"visible" }}>
      {/* Header — unified 44px */}
      <div style={{
        height:44, padding:"0 16px", flexShrink:0,
        borderBottom:`1px solid ${T.borderGlow}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:`linear-gradient(90deg,${T.orange}08,transparent)`,
      }}>
        <SectionLabel>OmniSlate</SectionLabel>
        <div style={{display:"flex",gap:8, position:"relative"}}>
          <button onClick={() => setMessages([])} style={{
            fontSize:11.9,fontWeight:600,color:T.orange,
            background:`${T.orange}15`,border:`1px solid ${T.orange}44`,
            borderRadius:8,padding:"3px 10px",cursor:"pointer",
          }}>CleanSlate</button>

          <button
            type="button"
            onMouseEnter={() => setShowContext(true)}
            onMouseLeave={() => setShowContext(false)}
            onFocus={() => setShowContext(true)}
            onBlur={() => setShowContext(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fillSuggestion();
              }
            }}
            onClick={fillSuggestion}
            title={aggregateHealth ? "View Context" : "Fill suggestion"}
            style={{ position: "relative", background: "none", border: "none", padding: 0 }}
          >
            <div
              style={{
                width:26,height:26,borderRadius:8,
                background: contextBackground,
                border: contextBorder,
                color: contextAccent,
                cursor:"pointer",fontSize:14.1,display:"flex",alignItems:"center",justifyContent:"center",
                transition: "all .2s ease",
                boxShadow: contextBoxShadow,
              }}
            >
              💡
            </div>

            {/* Non-intrusive Context Tooltip on Hover */}
            {showContext && contextApps.length > 0 && (
               <div style={{
                 position: "absolute", top: "100%", right: 0, marginTop: 8,
                 background: T.card, border: `1px solid ${aggregateHealth}66`,
                 borderRadius: 12, padding: 10, width: 240, zIndex: 100,
                 boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 12px ${aggregateHealth}22`,
                 display: "flex", flexDirection: "column", gap: 6,
               }}>
                 <div style={{ fontSize: 9.8, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                   Context Sources
                 </div>
                 {contextApps.map(app => {
                   const palette = getHealthPalette(app.health);
                   return (
                     <div key={app.id} style={{
                       fontSize: 11.2, fontWeight: 600, padding: "5px 8px", borderRadius: 6,
                       background: palette.bg.replace("22", "1a"),
                       color: palette.color,
                       border: `1px solid ${palette.color}44`,
                       display: "flex", alignItems: "center", gap: 6
                     }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                      <div style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.label}</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveContextApp(app.id); }} 
                       title="Remove context"
                       style={{
                         background: "none", border: "none", color: "currentColor", cursor: "pointer", 
                         opacity: 0.6, padding: 0, display: "flex", alignItems: "center"
                       }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                   );
                 })}
                </div>
             )}
          </button>
        </div>
      </div>
      {/* Canvas — shows demo seed or live conversation */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10, minHeight:0 }}>
        {messages.length === 0 && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:12, color:T.t4, fontStyle:"italic" }}>
              {isDemoMode ? "Starting demo session…" : "Start a session to begin"}
            </span>
          </div>
        )}
        {/* TRY chip — visible when demo mode has a seeded conversation */}
        {isDemoMode && messages.length > 0 && !loading && (
          <button
            type="button"
            onClick={fillSuggestion}
            style={{
              alignSelf:"flex-start",
              background:`${T.blue}18`,
              border:`1px solid ${T.blue}44`,
              borderRadius:20, padding:"5px 12px",
              color:T.blue, fontSize:11.5, fontWeight:600,
              cursor:"pointer", transition:"all .15s",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%",
            }}
          >
            TRY: {DEMO_TRY_SUGGESTION.slice(0, 48)}…
          </button>
        )}
        {messages.map((m) => (
          <div key={`${m.role}-${m.text.slice(0, 32)}`} style={{
            display:"flex", gap:10, justifyContent: m.role==="user"?"flex-end":"flex-start",
            animation:"apexFadeIn .3s ease",
          }}>
            {m.role==="assistant" && (
              <div style={{width:26,height:26,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`1px solid ${T.orange}66`}}>
                <img src={IMG_AVATAR} alt="AI Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy" decoding="async" />
              </div>
            )}
            <div style={{
              maxWidth:"78%",
              background: m.role==="user"
                ? `linear-gradient(135deg,${T.orange}22,${T.blue}18)`
                : `${T.surface}cc`,
              border:`1px solid ${m.role==="user"?T.orange+"33":T.border}`,
              borderRadius: m.role==="user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              padding:"9px 13px", fontSize:14.1, color:T.t1, lineHeight:1.5,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{display:"flex",gap:5,alignItems:"center",padding:"4px 8px"}}>
            {[0,1,2].map(i => (
              <div key={`dot-${i}`} style={{
                width:6,height:6,borderRadius:"50%",background:T.orange,
                animation:`apexPulse 1.2s ease ${i*0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Uniform Context Icons Map */}
      {contextApps.length > 0 && (
        <div style={{ padding: "0 14px", display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {contextApps.map(app => (
            <ContextDroplet
              key={app.id}
              app={app}
              onRemove={() => handleRemoveContextApp(app.id)}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding:"0 14px 14px",
        display:"flex", gap:10, alignItems:"center",
      }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && send()}
          placeholder="Ask APEX Agent anything…"
          style={{
            flex:1, background:`${T.surface}cc`,
            border:`1px solid ${T.border}`,
            borderRadius:12, padding:"11px 15px",
            color:T.t1, fontSize:14.6,
            outline:"none", transition:"border-color .15s",
          }}
        />
        {/* Play / Stop icon buttons only — no text labels */}
        <button onClick={send} title="Execute" style={{
          width:44, height:44, borderRadius:12, flexShrink:0,
          background:`linear-gradient(135deg,${T.orange},${T.orangeDim})`,
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 4px 14px ${T.orange}44`,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button
          onClick={stop}
          title="Stop"
          disabled={!loading}
          style={{
            width:44, height:44, borderRadius:12, flexShrink:0,
            background: loading ? `${T.orange}12` : T.surface,
            border:`1px solid ${loading ? T.orange+"55" : T.border}`,
            cursor: loading ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all .2s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={loading ? T.orange : T.t3}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
        </button>
      </div>
    </GlassCard>
  );
};

// ─── Shared tile dimensions (used by both APEX Ecosystem and Integrated Apps)
const APP_TILE_STYLE: React.CSSProperties = {
  borderRadius:14,
  padding:"18px 14px",
  display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10,
  cursor:"pointer", transition:"all .2s",
  minHeight:72,
};

// ─── Widget: APEX Ecosystem ───────────────────────────────────────────────────
const EcosystemWidget = () => {
  const { invoke } = useOmniModal();

  const handleAddApp = () => {
    invoke({
      id: 'ecosystem-add-apex-app',
      provider: 'omnidash',
      type: 'selection',
      title: 'Connect APEX App',
      description: 'Select an APEX module to activate in your ecosystem.',
      schema: {
        items: [
          { id: 'omnihub', label: 'APEX-OmniHub', category: 'platform' },
          { id: 'aspiral', label: 'aSpiral', category: 'crm' },
          { id: 'tradeline', label: 'TradeLine 24/7', category: 'finance' },
          { id: 'armageddon', label: 'Armageddon Test Suite', category: 'testing' },
        ],
      },
      onComplete: async (_result: Record<string, unknown>) => {},
      onCancel: () => {},
    });
  };

  return (
  <GlassCard style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
    <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${T.border}` }}>
      <SectionLabel>APEX Ecosystem</SectionLabel>
    </div>
    <div style={{ padding:"14px", flex:1 }}>
      {/* APEX app tile — brilliant accent treatment */}
      <button 
        draggable
        onDragStart={(e) => e.dataTransfer.setData('application/apex-tile', JSON.stringify({ id: 'ecosystem', label: 'APEX Ecosystem' }))}
        onClick={handleAddApp} style={{
        ...APP_TILE_STYLE,
        width:"100%",
        background:`linear-gradient(135deg, ${T.orange}28 0%, ${T.orange}14 100%)`,
        border:`1px solid ${T.orange}66`,
        boxShadow:`0 0 18px ${T.orange}22, inset 0 1px 0 ${T.orange}22`,
        color:T.orange,
        fontWeight:700, fontSize:14.6, letterSpacing:"0.01em",
      }}>
        <span style={{
          width:26, height:26, borderRadius:7,
          background:`${T.orange}30`, border:`1.5px solid ${T.orange}77`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18, color:T.orange, flexShrink:0,
          boxShadow:`0 0 8px ${T.orange}44`,
        }}>+</span>{" "}
        Add APEX App
      </button>
    </div>
  </GlassCard>
  );
};

// ─── Widget: Integrated Apps ──────────────────────────────────────────────────
const IntegratedAppsWidget = () => {
  const { invoke } = useOmniModal();

  const INTEGRATIONS = [
    { id: 'salesforce', label: 'Salesforce CRM — Real-time pipeline sync' },
    { id: 'slack', label: 'Slack — Team notifications & alerts' },
    { id: 'quickbooks', label: 'QuickBooks — Accounting & invoicing' },
    { id: 'github', label: 'GitHub — Code repositories & CI/CD' },
    { id: 'stripe', label: 'Stripe — Payment processing & billing' },
    { id: 'google-workspace', label: 'Google Workspace — Docs, Sheets, Drive' },
    { id: 'hubspot', label: 'HubSpot — Marketing & lead management' },
    { id: 'jira', label: 'Jira — Project tracking & sprints' },
    { id: 'shopify', label: 'Shopify — E-commerce storefront' },
    { id: 'twilio', label: 'Twilio — SMS, calls & communications' },
  ];

  const handleConnectApp = (slot: number) => {
    invoke({
      id: `integrated-app-connect-${slot}`,
      provider: 'omnidash',
      type: 'selection',
      title: 'Connect Integration',
      description: 'Choose a third-party application to connect to your APEX workspace.',
      schema: { items: INTEGRATIONS },
      onComplete: async (_result: Record<string, unknown>) => {},
      onCancel: () => {},
    });
  };

  return (
  <GlassCard style={{ padding:"16px" }}>
    <div style={{ marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <SectionLabel>Integrated Apps</SectionLabel>
      <button
        onClick={() => handleConnectApp(0)}
        style={{
          background: T.cyan, color: T.bg, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 4, cursor: "pointer", border: "none"
        }}
      >
        + Connect App
      </button>
    </div>
    {/* 4 columns — same tile size as EcosystemWidget tiles */}
    <div className="omni-grid-apps" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
      {[1,2,3,4].map(i => (
        <button
          key={`integrated-app-ph-${i}`}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/apex-tile', JSON.stringify({ id: `awaiting-${i}`, label: `Awaiting Node ${i}` }))}
          onClick={() => handleConnectApp(i)}
          title="Connect app"
          style={{
            ...APP_TILE_STYLE,
            background:T.surface,
            border:`1px dashed ${T.border}`,
            opacity:0.55,
            cursor:"pointer",
            transition:"opacity .2s, border-color .2s",
          }}
        >
          <div style={{
            width:22, height:22, borderRadius:6,
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.14)",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
          }}>
            <div style={{width:10,height:10,borderRadius:2,background:"rgba(255,255,255,0.20)"}} />
          </div>
          <div style={{fontSize:13,color:T.t3,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>Awaiting</div>
        </button>
      ))}
    </div>
  </GlassCard>
  );
};

// ─── Main OmniDash Shell ──────────────────────────────────────────────────────
export default function OmniDashShell() {
  const [tick, setTick] = useState<number>(0);
  const { activeNav, setActiveNav, isDark, setIsDark, ops } = useLayoutPersistence();
  const { invoke } = useOmniModal();
  const { isDesktop } = useViewport();
  const [mobileTab, setMobileTab] = useState<MobileTab>("home");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { demoMode } = useDemoMode();
  const location = useLocation();

  const isDemoMode = ops.demo;

  // Real data bridge — fetches settings, KPIs, incidents from Supabase
  const liveDashData = useDashboardData({ enabled: !isDemoMode });

  // Use static demo data if in demo mode to prevent showing empty unauthenticated states
  const dashData = isDemoMode ? {
    settings: { user_id: 'demo', demo_mode: true, anonymize_kpis: false, freeze_mode: false, updated_at: new Date().toISOString() },
    kpiSummary: { tradeline_paid_starts: 142, tradeline_active_pilots: 12, tradeline_churn_risks: 1, flowbills_demos: 0, flowbills_paid_accounts: 0, cash_days_to_cash: 0, ops_sev1_incidents: 0 },
    kpiHistory: [],
    openIncidents: [
      { id: 'inc-1', severity: 'sev2' as const, status: 'open' as const, title: 'Invoice batch #1042 processing delay', occurred_at: new Date().toISOString() },
      { id: 'inc-2', severity: 'sev3' as const, status: 'open' as const, title: 'High memory usage in worker-pool-b', occurred_at: new Date().toISOString() }
    ],
    memoryHealth: null,
    isLoading: false,
    error: null,
    refresh: () => {}
  } : liveDashData;

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const moduleKey = pathParts[2];
    if (moduleKey) {
      const matched = OMNIDASH_SIDEBAR_WIDGETS.find(w => w.moduleKey === moduleKey);
      if (matched) {
        setActiveNav(matched.label);
      }
    } else {
      setActiveNav('OmniBoard');
    }
  }, [location.pathname, setActiveNav]);

  useEffect(() => {
    // Disable the tick interval during automated E2E tests (Playwright sets navigator.webdriver)
    // This prevents aggressive re-renders from detaching DOM nodes during test execution.
    if (
      (typeof navigator !== 'undefined' && navigator.webdriver) ||
      (typeof window !== 'undefined' && (window as unknown as { __PLAYWRIGHT_TEST__?: boolean }).__PLAYWRIGHT_TEST__)
    ) {
      return;
    }
    const id = setInterval(() => setTick(t => t+1), 500);
    return () => clearInterval(id);
  }, []);

  // Close drawer when viewport expands to desktop
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  // Responsive grid columns
  const gridCols = isDesktop ? "220px 1fr 220px" : "1fr";
  const gridHeight = isDesktop ? 300 : undefined;

  return (
    <div style={{
      fontFamily:"'Space Grotesk',sans-serif",
      background: T.bg, color: T.t1,
      width:"100%", height:"100dvh",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');


        ${pulse} ${shimmer} ${fadeIn} ${scanLine} ${navGlow} ${ringRotate} ${ringBreath} ${ringBreath2}
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        button { font-family:'Space Grotesk',sans-serif; }
        input { font-family:'Space Grotesk',sans-serif; }
      `}</style>

      <OmniDashHeader tick={tick} isDark={isDark} setIsDark={setIsDark} invoke={invoke} />

      <div className="omni-shell-main" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Sidebar — desktop only; tablet/mobile use bottom nav */}
        {isDesktop && <OmniDashSidebar activeNav={activeNav} setActiveNav={(nav) => setActiveNav(nav as DashboardNavSection)} canvasRef={canvasRef} />}

        {/* Main Canvas */}
        <div ref={canvasRef} className="omni-canvas-container" style={{
          flex:1, display:"flex", flexDirection:"column",
          overflow:"auto", padding:"16px", gap:14,
          position:"relative",
          background: isDark
            ? `radial-gradient(ellipse at 30% 20%,${T.orange}08 0%,transparent 60%),${T.bg}`
            : `radial-gradient(ellipse at 30% 20%,${T.orange}06 0%,transparent 60%),#e8edf5`,
        }}>
          {/* Blueprint grid background — bottom layer, theme-aware */}
          <div style={{
            position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
            backgroundImage: isDark
              ? `linear-gradient(rgba(30,80,140,0.18) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(30,80,140,0.18) 1px, transparent 1px),
                 linear-gradient(135deg, rgba(249,115,22,0.04) 0%, transparent 55%, rgba(30,80,140,0.10) 100%)`
              : `linear-gradient(rgba(30,80,180,0.10) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(30,80,180,0.10) 1px, transparent 1px),
                 linear-gradient(135deg, rgba(249,115,22,0.03) 0%, transparent 55%, rgba(30,80,180,0.06) 100%)`,
            backgroundSize:"40px 40px, 40px 40px, 100% 100%",
          }} />
          {/* Content — sits above blueprint grid */}
          {activeNav === 'OmniBoard' ? (
            <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:14, flex:1 }}>
            {/* Primary 3-column grid — fixed height, overflow-isolated cells.
                FIX Bug 3+4: minHeight:0 enforces the CSS grid row height contract.
                Each DraggableWidget gets height+overflow:hidden so no child
                (including OmniSlate chat history) can blow out the row or
                dislodge sibling tiles. */}
            <div className="omni-grid-top" style={{ display:"grid", gridTemplateColumns: gridCols, gap:14, height: gridHeight, minHeight:0 }}>
              <DraggableWidget id="widget_agent" style={{ height: isDesktop ? "100%" : 280, overflow:"hidden" }}><AgentWidget tick={tick} /></DraggableWidget>
              <DraggableWidget id="widget_slate" style={{ height: isDesktop ? "100%" : 320, overflow:"hidden" }}><OmniSlateWidget /></DraggableWidget>
              <DraggableWidget id="widget_eco" style={{ height: isDesktop ? "100%" : 200, overflow:"hidden" }}><EcosystemWidget /></DraggableWidget>
            </div>

            {/* Integrated Apps row */}
            <DraggableWidget id="widget_apps"><IntegratedAppsWidget /></DraggableWidget>

            {/* M-03 Observability Panels (5 Rows) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              <DraggableWidget id="m03_1"><SystemHealthOverview /></DraggableWidget>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <DraggableWidget id="m03_2"><AgentActivityTimeline /></DraggableWidget>
                <DraggableWidget id="m03_3"><GuardianAlertFeed /></DraggableWidget>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <DraggableWidget id="m03_4"><ManModeReviewQueue /></DraggableWidget>
                <DraggableWidget id="m03_5"><OmniRouteTraffic /></DraggableWidget>
              </div>
              <DraggableWidget id="m03_6"><WorkflowStatusBoard /></DraggableWidget>
              <DraggableWidget id="m03_7"><SystemSparklines /></DraggableWidget>
              {/* Connect AI */}
              <button
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 ml-2"
                onClick={() => {
                  toast.info('Setup is required', { description: 'Missing API configuration for Connect AI.' });
                }}
                title="Connect AI Provider"
              >
                Connect AI
              </button>
            </div>

            {/* APEX-OmniHub wordmark watermark — above grid, below content */}
            <div style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center",
              pointerEvents:"none", userSelect:"none", minHeight:80,
              position:"relative", zIndex:1,
            }}>
              <img
                src={IMG_APEX_WM}
                alt=""
                style={{
                  width:"55%", maxWidth:380,
                  objectFit:"contain",
                  opacity: isDark ? 0.23 : 0.15,
                  filter: isDark
                    ? "brightness(1.6) saturate(0.4)"
                    : "brightness(0.4) saturate(0.3)",
                }}
              />
            </div>
            </div>
          ) : (
            <div style={{ position:"relative", zIndex:1, flex: 1, display: "flex", flexDirection: "column" }}>
              <ModuleRenderer 
                moduleKey={(OMNIDASH_SIDEBAR_WIDGETS.find(w => w.label === (activeNav as unknown as string))?.moduleKey) as Parameters<typeof ModuleRenderer>[0]['moduleKey']}
                onClose={() => setActiveNav('OmniBoard')}
              />
            </div>
          )}
        </div>

        {/* Right Panel — desktop only; mobile/tablet use OmniMobileDrawer */}
        {isDesktop && (
          <div
            className="omni-right-panel"
            style={{
              width: 340, flexShrink: 0,
              background: `linear-gradient(180deg,${T.surface} 0%,${T.bg} 100%)`,
              borderLeft: `1px solid ${T.border}`,
              overflowY: 'auto', padding: '14px 12px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <SystemHealthRow demoMode={demoMode} kpi={dashData.kpiSummary} />
            <OmniTraceFeed />
            <SentinelPanel />
          </div>
        )}

        {/* Mobile/Tablet — drawer trigger button in header area */}
        {!isDesktop && (
          <button
            type="button"
            className="omni-mobile-drawer-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open insights panel"
            style={{
              position: "fixed",
              top: 10,
              right: 56,
              zIndex: 8000,
              display: "flex",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </button>
        )}
      </div>

      {/* Footer bar — hidden on mobile via CSS */}
      <div className="omni-footer-bar" style={{
        height:28, background:T.surface,
        borderTop:`1px solid ${T.border}`,
        display:"flex", alignItems:"center",
        padding:"0 20px", gap:16,
        fontSize:10.3, color:T.t3,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <StatusDot color={T.green} pulse={false} />
          APEX-OmniHub v2.5.0
        </div>
        <div>© 2026 APEX Business Systems Ltd.</div>
        <div className="footer-right" style={{marginLeft:"auto", display:"flex", gap:14, alignItems:"center"}}>
          <span>Edmonton, AB</span>
          <span style={{color:T.t4}}>|</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><StatusDot color={T.blue} pulse={false} />Guardian: ACTIVE</span>
          <span style={{color:T.t4}}>|</span>
          <span style={{display:"flex",alignItems:"center",gap:5,color:T.green}}><StatusDot color={T.green} pulse={false} />Zero Trust: ON</span>
        </div>
      </div>

      {/* Mobile/Tablet — Insights drawer for right panel content */}
      {!isDesktop && (
        <OmniMobileDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Insights & Controls"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 12px' }}>
            <SystemHealthRow demoMode={demoMode} kpi={dashData.kpiSummary} />
            <OmniTraceFeed />
            <SentinelPanel />
          </div>
        </OmniMobileDrawer>
      )}

      {/* Mobile/Tablet bottom navigation */}
      {!isDesktop && (
        <OmniMobileBottomNav activeTab={mobileTab} setActiveTab={setMobileTab} />
      )}

      {/* OmniSpatialHost — universal modal engine, portal-mounted */}
      <OmniSpatialHost />
    </div>
  );
}

