import { useState, useEffect, useCallback, useRef } from "react";
import { useOmniDashAction } from '../src/hooks/useOmniDashAction';
import PersonaModal from "./components/PersonaModal";
import ApexAgentAvatar from "./components/ApexAgentAvatar";
import { useNavigate } from 'react-router-dom';

import { DraggableWidget } from './DraggableWidget';
import { useLayoutPersistence } from "./hooks/useLayoutPersistence";
import { APPS } from '@/dashboard/components/DashboardOverview/data';
import { useDashboardData } from "./hooks/useDashboardData";
import { useOmniModal, type OmniModalConfig } from '@/stores/omniModalStore';
import { OmniSpatialHost } from '@/dashboard/components/OmniSpatialHost';
import { supabase } from '../src/lib/supabase';

import imgBadge from "../../../src/assets/omnidash/apex-badge.png";
import imgWordmark from "../../../src/assets/omnidash/omnidash-logo.png";
import imgAvatar from "../../../src/assets/omnidash/avatar-default.png";
import imgIcons from "../../../src/assets/omnidash/icons.png";
import imgApexWm from "../../../src/assets/omnidash/apex_omnihub_wordmark.png";

// ─── TypeScript Interfaces ───────────────────────────────────────────────────
import type { CSSProperties, ReactNode, Dispatch, SetStateAction } from "react";

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

interface StatusDotProps {
  color?: string;
  pulse?: boolean;
}

interface GlassCardProps {
  children?: ReactNode;
  style?: CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

interface SectionLabelProps {
  children: ReactNode;
}

interface NavEntry {
  label: string;
  iconIdx: number;
  active: boolean;
}

interface NavItemProps {
  n: NavEntry;
  isActive: boolean;
  onClick: () => void;
}

interface OpsState {
  demo: boolean;
  autoPilot: boolean;
  guardian: boolean;
  live: boolean;
}

import type { DashboardNavSection } from "./types/dashboard.types";

interface OmniDashSidebarProps {
  activeNav: string;
  setActiveNav: Dispatch<SetStateAction<string>>;
}

interface OmniDashHeaderProps {
  tick: number;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  invoke: (config: OmniModalConfig) => void;
}

interface AgentWidgetProps {
  tick: number;
}

interface ToggleProps {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}

interface OpsControlsPanelProps {
  ops: OpsState;
  setOps: Dispatch<SetStateAction<OpsState>>;
}

// ─── APEX Brand Assets ────────────────────────────────────────────────────────
const IMG_BADGE = imgBadge;
const IMG_WORDMARK = imgWordmark;
const IMG_AVATAR = imgAvatar;
const IMG_ICONS = imgIcons;

const IMG_APEX_WM = imgApexWm;

// ─── Design System ────────────────────────────────────────────────────────────
const T = {
  bg:        "#070B14",
  surface:   "#0B1120",
  card:      "#0E1628",
  cardHover: "#111d33",
  border:    "rgba(255,255,255,0.07)",
  borderGlow:"rgba(249,115,22,0.3)",
  orange:    "#F97316",
  orangeDim: "#C2531A",
  orangeGlow:"rgba(249,115,22,0.15)",
  blue:      "#3B82F6",
  blueDim:   "#1D4ED8",
  blueGlow:  "rgba(59,130,246,0.15)",
  cyan:      "#06B6D4",
  green:     "#22C55E",
  warn:      "#EAB308",
  red:       "#EF4444",
  purple:    "#A855F7",
  t1:        "#F1F5F9",
  t2:        "#94A3B8",
  t3:        "#475569",
  t4:        "#1E293B",
};

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

const StatusDot = ({ color = T.green, pulse: doPulse = true }: StatusDotProps) => (
  <div style={{
    width:8, height:8, borderRadius:"50%", backgroundColor:color,
    flexShrink:0, boxShadow:`0 0 6px ${color}`,
    animation: doPulse ? "apexPulse 2s ease-in-out infinite" : "none",
  }} />
);

const GlassCard = ({ children, style={}, glow = false, onClick }: GlassCardProps) => (
  <div onClick={onClick} onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }} role={onClick ? "button" : "presentation"} tabIndex={onClick ? 0 : undefined} style={{
    background: T.card,
    border: `1px solid ${glow ? T.borderGlow : T.border}`,
    borderRadius: 16,
    boxShadow: glow
      ? `0 0 24px ${T.orangeGlow}, 0 4px 24px rgba(0,0,0,.5)`
      : `0 4px 24px rgba(0,0,0,.4)`,
    backdropFilter: "blur(12px)",
    transition: "all .2s ease",
    ...style,
  }} >
    {children}
  </div>
);



const SectionLabel = ({ children }: SectionLabelProps) => (
  <div style={{
    fontSize:9.8, fontWeight:800, letterSpacing:"0.14em",
    color: T.t3, textTransform:"uppercase", marginBottom:8,
  }}>{children}</div>
);

// DraggableWidget is imported from ./DraggableWidget (extracted for testability).

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { label:"OmniBoard",   iconIdx:0, active:true  },
  { label:"PhysiOmni",   iconIdx:5, active:false },
  { label:"Audits",      iconIdx:1, active:false },
  { label:"Links",       iconIdx:4, active:false },
  { label:"Automations", iconIdx:7, active:false },
  { label:"Workflows",   iconIdx:6, active:false },
  { label:"Files",       iconIdx:8, active:false },
  { label:"Billing",     iconIdx:3, active:false },
  { label:"Settings",    iconIdx:2, active:false },
];

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

  return (
    <button
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
        border: `1px solid ${isActive ? borderColors.active : hov ? borderColors.hover : borderColors.base}`,
        background: `linear-gradient(100deg, ${T.orange}${isActive ? bgOpacities.active : hov ? bgOpacities.hover : bgOpacities.base} 0%, ${T.card} 60%)`,
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

// ─── Module key map: sidebar label → omniModalStore module key
const NAV_MODULE_KEY: Record<string, string> = {
  PhysiOmni:   'physiomni',
  Audits:      'audits',
  Links:       'links',
  Automations: 'automations',
  Workflows:   'workflows',
  Files:       'files',
  Billing:     'billing',
  Settings:    'settings',
};

// ─── Shell: Sidebar ──────────────────────────────────────────────────────────
const OmniDashSidebar = ({ activeNav, setActiveNav }: OmniDashSidebarProps) => {
  const { invoke } = useOmniModal();
  const [signingOut, setSigningOut] = useState<boolean>(false);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch {
      setSigningOut(false);
    }
  }, [signingOut]);

  const navigate = useNavigate();
  const { dispatch } = useOmniDashAction(navigate);

  const handleNav = (label: string) => {
    setActiveNav(label);
    const moduleKey = NAV_MODULE_KEY[label];
    if (!moduleKey) {
      // OmniBoard flow
      dispatch({
        appKey: 'omniboard',
        provider: 'OmniBoard',
        label: 'OmniBoard',
        category: 'control-plane',
        routePath: '/omnidash',
        dashboardStatus: 'Live',
        source: 'module'
      });
      return;
    }
    invoke({
      id: `nav-module-${moduleKey}`,
      provider: 'omnidash',
      type: 'module',
      title: label,
      contextData: { moduleKey },
      onComplete: async () => { setActiveNav('OmniBoard'); },
      onCancel: () => { setActiveNav('OmniBoard'); },
    });
  };

  return (
    <div style={{
      width:228, flexShrink:0,
      background:`linear-gradient(180deg, ${T.surface} 0%, ${T.bg} 100%)`,
      borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column",
      padding:"10px 10px 0",
      gap:3,
      overflowY:"auto",
    }}>
      {NAV.map((n) => (
        <NavItem key={n.label} n={n} isActive={activeNav===n.label} onClick={() => handleNav(n.label)} />
      ))}

      {/* Status Footer */}
      <div style={{ marginTop:"auto", padding:"16px 12px 20px", borderTop:`1px solid ${T.border}` }}>
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
  const navigate = useNavigate();
  const { dispatch } = useOmniDashAction(navigate);
  const [orgOpen, setOrgOpen] = useState<boolean>(false);
  const pulse = tick % 2 === 0;

  const handleOmniSkills = () => {
    invoke({
      id: 'header-omniskills',
      provider: 'omnidash',
      type: 'module',
      title: 'OmniSkills',
      contextData: { moduleKey: 'omniskills' },
      onComplete: async () => {},
      onCancel: () => {},
    });
  };

  const handleConnectAI = () => {
    dispatch({
      appKey: 'omniskills',
      provider: 'OmniSkills',
      label: 'OmniSkills',
      category: 'platform',
      routePath: '/omnidash/omniskills',
      dashboardStatus: 'Partial',
      source: 'integration'
    });
  };

  const handleBell = () => {
    invoke({
      id: 'header-notifications',
      provider: 'omnidash',
      type: 'selection',
      title: 'Notifications',
      description: 'Recent activity across your APEX workspace.',
      schema: {
        items: [
          { id: 'n1', label: 'Salesforce sync completed — 48 records updated', badge: 'INFO' },
          { id: 'n2', label: 'Invoice batch #1042 processed — $24,500 billed', badge: 'SUCCESS' },
          { id: 'n3', label: 'Workflow "Lead Nurture" triggered for 12 contacts', badge: 'INFO' },
          { id: 'n4', label: 'Guardian audit passed — 0 anomalies detected', badge: 'SUCCESS' },
          { id: 'n5', label: 'New integration available: Stripe Billing v3', badge: 'NEW' },
        ],
      },
      onComplete: async () => {},
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
      <div style={{ flex:1, display:"flex", justifyContent:"center", marginRight:10 }}>
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
      <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
        {/* Org Selector */}
        <div style={{ position:"relative" }}>
          <button onClick={() => setOrgOpen(o => !o)} style={{
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
                { label:"Workspace Settings", icon:"⚙️", action: () => { setOrgOpen(false); invoke({ id:'org-settings', provider:'omnidash', type:'module', title:'Settings', contextData:{ moduleKey:'settings' }, onComplete: async () => {}, onCancel: () => {} }); } },
                { label:"Billing & Plans", icon:"💳", action: () => { setOrgOpen(false); invoke({ id:'org-billing', provider:'omnidash', type:'module', title:'Billing', contextData:{ moduleKey:'billing' }, onComplete: async () => {}, onCancel: () => {} }); } },
                { label:"Invite Members", icon:"👥", action: () => { setOrgOpen(false); invoke({ id:'org-invite', provider:'omnidash', type:'form', title:'Invite Team Member', schema: { fields: [{ key:'email', label:'Email Address', type:'email', placeholder:'teammate@company.com', required:true }, { key:'role', label:'Role', type:'text', placeholder:'e.g. Admin, Viewer' }] }, onComplete: async () => {}, onCancel: () => {} }); } },
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
          Connect AI
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
          <div style={{position:"absolute",top:5,right:5,width:6,height:6,borderRadius:"50%",background:T.orange,border:`2px solid ${T.surface}`}} />
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
  const [elapsed, setElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [persona, setPersona] = useState<AgentPersona>(() => {
    return (localStorage.getItem('apex_persona') as AgentPersona) || 'Navigator';
  });

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const handlePlayPause = () => setIsRunning(r => !r);
  const handleReset = () => { setElapsed(0); setIsRunning(false); };

  const handlePersonaSelect = (p: AgentPersona) => {
    setPersona(p);
    localStorage.setItem('apex_persona', p);
    setPersonaOpen(false);
  };

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
            <ApexAgentAvatar size="lg" onClick={() => setPersonaOpen(true)} showStatus={false} />
            <PersonaModal isOpen={personaOpen} currentPersona={persona} onClose={() => setPersonaOpen(false)} onSelect={handlePersonaSelect} />
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

// ─── Widget: OmniSlate ────────────────────────────────────────────────────────
const SLATE_SUGGESTIONS = [
  "Summarize all open workflows and flag anything stalled over 24 hours.",
  "Run a Guardian audit on the last 50 agent actions and highlight anomalies.",
  "Pull Salesforce pipeline for this week and draft an exec summary.",
];

const OmniSlateWidget = () => {
  const [input, setInput] = useState<string>("");
  const [suggIdx, setSuggIdx] = useState<number>(0);
  const [suggVisible, setSuggVisible] = useState<boolean>(true);
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const endRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cycle suggestion every 4s with fade
  useEffect(() => {
    const id = setInterval(() => {
      setSuggVisible(false);
      setTimeout(() => {
        setSuggIdx(i => (i + 1) % SLATE_SUGGESTIONS.length);
        setSuggVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const q = input.trim(); setInput(""); setLoading(true);
    setMessages(m => [...m, {role:"user", text:q}]);
    pendingRef.current = setTimeout(() => {
      setMessages(m => [...m, {role:"assistant", text:`Analyzing: "${q}" — Guardian audit passed. Agent response queued.`}]);
      setLoading(false);
      pendingRef.current = null;
    }, 900);
  }, [input]);

  const stop = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    setLoading(false);
    setMessages(m => m.length > 0 && m[m.length - 1].role === 'user'
      ? [...m, {role:"assistant", text:"— Response stopped by user."}]
      : m
    );
  }, []);

  const fillSuggestion = () => setInput(SLATE_SUGGESTIONS[suggIdx]);

  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  return (
    <GlassCard glow style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header — unified 44px */}
      <div style={{
        height:44, padding:"0 16px", flexShrink:0,
        borderBottom:`1px solid ${T.borderGlow}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:`linear-gradient(90deg,${T.orange}08,transparent)`,
      }}>
        <SectionLabel>OmniSlate</SectionLabel>
        <div style={{display:"flex",gap:8}}>
          <button onClick={() => setMessages([])} style={{
            fontSize:11.9,fontWeight:600,color:T.orange,
            background:`${T.orange}15`,border:`1px solid ${T.orange}44`,
            borderRadius:8,padding:"3px 10px",cursor:"pointer",
          }}>CleanSlate</button>
          <button
            onClick={fillSuggestion}
            title="Fill suggestion"
            style={{
              width:26,height:26,borderRadius:8,
              background:`${T.orange}22`,border:`1px solid ${T.orange}44`,
              color:T.orange,cursor:"pointer",fontSize:14.1,display:"flex",alignItems:"center",justifyContent:"center",
            }}>💡</button>
        </div>
      </div>

      {/* Canvas — empty until user sends */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10, minHeight:0 }}>
        {messages.length === 0 && (
          <div style={{ flex:1 }} />
        )}
        {messages.map((m,i) => (
          <div key={i} style={{
            display:"flex", gap:10, justifyContent: m.role==="user"?"flex-end":"flex-start",
            animation:"apexFadeIn .3s ease",
          }}>
            {m.role==="assistant" && (
              <div style={{width:26,height:26,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`1px solid ${T.orange}66`}}>
                <img src={IMG_AVATAR} alt="AI Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}} />
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

      {/* Cycling suggestion chip */}
      <div style={{
        padding:"0 14px 8px",
        display:"flex", alignItems:"center", gap:8,
      }}>
        <button onClick={fillSuggestion} style={{
          display:"flex", alignItems:"center", gap:8,
          background:`${T.surface}`,
          border:`1px solid ${T.orange}28`,
          borderRadius:10, padding:"7px 12px",
          cursor:"pointer", textAlign:"left", width:"100%",
          transition:"opacity .4s ease, border-color .2s",
          opacity: suggVisible ? 1 : 0,
        }}>
          <span style={{
            fontSize:9.8, fontWeight:800, letterSpacing:"0.12em",
            color:T.orange, textTransform:"uppercase", flexShrink:0,
          }}>Try</span>
          <span style={{
            fontSize:13, color:T.t2, lineHeight:1.4,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            minWidth: 0,
          }}>{SLATE_SUGGESTIONS[suggIdx]}</span>
          <svg style={{flexShrink:0,marginLeft:"auto"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

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
        items: APPS.map(app => ({ id: app.name.toLowerCase().replace(/ /g, '-'), label: app.name, category: app.cat })),
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
      <button onClick={handleAddApp} style={{
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
        }}>+</span>
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
    <div style={{ marginBottom:10 }}>
      <SectionLabel>Integrated Apps</SectionLabel>
    </div>
    {/* 4 columns — same tile size as EcosystemWidget tiles */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
      {[1,2,3,4].map(i => (
        <button
          key={`integrated-app-ph-${i}`}
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

// ─── Right Panel Sections ─────────────────────────────────────────────────────
const SecurityPanel = (_props?: Record<string, unknown>) => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toLocaleTimeString());

  const handleScan = () => {
    if (scanning) return;
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setLastCheck(new Date().toLocaleTimeString());
    }, 1800);
  };

  return (
    <GlassCard style={{ padding:"14px 14px 12px" }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <IconBadge idx={1} size={19} />
        <SectionLabel>Security Audit</SectionLabel>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <StatusDot color={scanning ? T.warn : T.green} />
            <div style={{fontSize:14.1,fontWeight:600,color:T.t1}}>{scanning ? "Scanning…" : "Zero Trust Active"}</div>
          </div>
          <div style={{fontSize:10.8,color:T.t2}}>{scanning ? "Running gateway audit" : "All gateways secured"}</div>
        </div>
      </div>
      <div style={{fontSize:9.8,color:T.t3}}>LAST CHECK: {lastCheck}</div>
      <button
        onClick={handleScan}
        disabled={scanning}
        style={{
          marginTop:10,width:"100%",padding:"8px",
          background: scanning ? `${T.warn}18` : T.surface,
          border:`1px solid ${scanning ? T.warn+"55" : T.border}`,
          borderRadius:10,color: scanning ? T.warn : T.t1,fontSize:13,
          cursor: scanning ? "not-allowed" : "pointer",fontWeight:500,
          display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          transition:"all .2s",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ animation: scanning ? "spin 1s linear infinite" : "none" }}>
          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
        {scanning ? "Scanning…" : "Scan Now"}
      </button>
    </GlassCard>
  );
};

const AnalyticsPanel = () => (
  <GlassCard style={{ padding:"14px" }}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <IconBadge idx={0} size={19} />
      <SectionLabel>Analytics</SectionLabel>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {[
        {val:"0",label:"Events Tracked",color:T.t1},
        {val:"100%",label:"System Health",color:T.green},
        {val:"1 loop",label:"Guardian Loops",color:T.warn},
        {val:"Clean",label:"Stale Checks",color:T.green},
      ].map((s) => (
        <div key={s.label} style={{
          background:T.surface,border:`1px solid ${T.border}`,
          borderRadius:10,padding:"10px 10px",textAlign:"center",
        }}>
          <div style={{fontSize:16.3,fontWeight:700,color:s.color}}>{s.val}</div>
          <div style={{fontSize:9.8,color:T.t2,marginTop:2,lineHeight:1.3}}>{s.label}</div>
        </div>
      ))}
    </div>
  </GlassCard>
);

const TRACE_EVENTS = [
  {color:T.green,  text:"Salesforce sync completed — 48 records"},
  {color:T.warn,   text:"Invoice batch #1042 processed"},
  {color:T.warn,   text:'Workflow "Lead Nurture" triggered'},
  {color:T.purple, text:"QuickBooks reconciliation done"},
  {color:T.green,  text:"Ticket #7291 auto-resolved by agent"},
];

const OmniTracePanel = () => {
  const { invoke } = useOmniModal();

  const handleReplay = () => {
    invoke({
      id: 'omnitrace-replay-workflows',
      provider: 'omnidash',
      type: 'module',
      title: 'Workflows',
      contextData: { moduleKey: 'workflows' },
      onComplete: async () => {},
      onCancel: () => {},
    });
  };

  return (
  <GlassCard style={{ padding:"14px" }}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <IconBadge idx={7} size={19} />
      <SectionLabel>OmniTrace</SectionLabel>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {TRACE_EVENTS.map((e, index) => (
        <div key={`trace-${index}`} style={{display:"flex",alignItems:"flex-start",gap:8}}>
          <div style={{
            width:7,height:7,borderRadius:"50%",background:e.color,
            boxShadow:`0 0 6px ${e.color}`,flexShrink:0,marginTop:4,
          }} />
          <div style={{fontSize:12.5,color:T.t1,lineHeight:1.4}}>{e.text}</div>
        </div>
      ))}
    </div>
    <button
      onClick={handleReplay}
      style={{
        marginTop:12,width:"100%",padding:"8px",
        background:T.surface,border:`1px solid ${T.border}`,
        borderRadius:10,color:T.t2,fontSize:11.9,cursor:"pointer",fontWeight:600,
        letterSpacing:"0.04em",
        transition:"border-color .2s, color .2s",
      }}
    >+ REPLAY WORKFLOWS</button>
  </GlassCard>
  );
};

const Toggle = ({ label, sublabel, value, onChange, color = T.orange }: ToggleProps) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0" }}>
    <div>
      <div style={{ fontSize:13.5, color:T.t1, fontWeight:500 }}>{label}</div>
      {sublabel && <div style={{ fontSize:10.8, color:T.t3, marginTop:1 }}>{sublabel}</div>}
    </div>
    <button onClick={() => onChange(!value)} style={{
      width:40, height:22, borderRadius:11, flexShrink:0,
      background: value ? `linear-gradient(90deg,${color},${color}cc)` : `${T.surface}`,
      border:`1px solid ${value ? color : T.border}`,
      cursor:"pointer", position:"relative", transition:"all .18s",
      boxShadow: value ? `0 0 8px ${color}33` : "none",
    }}>
      <div style={{
        width:14, height:14, borderRadius:"50%", background:"#fff",
        position:"absolute", top:3, transition:"left .18s",
        left: value ? 22 : 3,
        boxShadow:"0 1px 3px rgba(0,0,0,.35)",
      }} />
    </button>
  </div>
);

const OpsControlsPanel = ({ ops, setOps }: OpsControlsPanelProps) => (
  <GlassCard style={{ padding:"14px" }}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
      <IconBadge idx={4} size={19} />
      <SectionLabel>Ops Controls</SectionLabel>
    </div>
    <div style={{ display:"flex", flexDirection:"column", borderTop:`1px solid ${T.border}` }}>
      <Toggle label="Demo Mode"     sublabel="Simulated data feed"        value={ops.demo}     onChange={v=>setOps(o=>({...o,demo:v}))}     color={T.orange} />
      <div style={{height:1,background:T.border}} />
      <Toggle label="Auto-Pilot"    sublabel="Autonomous task handling"     value={ops.autoPilot} onChange={v=>setOps(o=>({...o,autoPilot:v}))} color={T.purple} />
      <div style={{height:1,background:T.border}} />
      <Toggle label="Guardian Mode" sublabel="AI policy enforcement"       value={ops.guardian} onChange={v=>setOps(o=>({...o,guardian:v}))}  color={T.blue}   />
      <div style={{height:1,background:T.border}} />
      <Toggle label="Live Data"     sublabel="Real-time agent feed"        value={ops.live}     onChange={v=>setOps(o=>({...o,live:v}))}      color={T.cyan}   />
    </div>
  </GlassCard>
);

// ─── Main OmniDash Shell ──────────────────────────────────────────────────────
export default function OmniDashShell() {
  const [tick, setTick] = useState<number>(0);
  const { activeNav, setActiveNav, isDark, setIsDark, ops, setOps } = useLayoutPersistence();
  const { invoke } = useOmniModal();

  // Real data bridge — fetches settings, KPIs, incidents from Supabase
  useDashboardData();

  useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      fontFamily:"'Space Grotesk',sans-serif",
      background: T.bg, color: T.t1,
      width:"100%", height:"100vh",
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

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <OmniDashSidebar activeNav={activeNav} setActiveNav={(nav) => setActiveNav(nav as DashboardNavSection)} />

        {/* Main Canvas */}
        <div style={{
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
          <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:14, flex:1 }}>
          {/* Primary 3-column grid — fixed height ~3 ecosystem tiles tall */}
          <div style={{ display:"grid", gridTemplateColumns:"220px 1fr 220px", gap:14, height:300 }}>
            <DraggableWidget><AgentWidget tick={tick} /></DraggableWidget>
            <DraggableWidget><OmniSlateWidget /></DraggableWidget>
            <DraggableWidget><EcosystemWidget /></DraggableWidget>
          </div>

          {/* Integrated Apps row */}
          <DraggableWidget><IntegratedAppsWidget /></DraggableWidget>

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
        </div>

        {/* Right Panel */}
        <div style={{
          width:266, flexShrink:0,
          background:`linear-gradient(180deg,${T.surface} 0%,${T.bg} 100%)`,
          borderLeft:`1px solid ${T.border}`,
          overflowY:"auto", padding:"14px 12px",
          display:"flex", flexDirection:"column", gap:12,
        }}>
          <DraggableWidget><SecurityPanel /></DraggableWidget>
          <DraggableWidget><AnalyticsPanel /></DraggableWidget>
          <DraggableWidget><OmniTracePanel /></DraggableWidget>
          <DraggableWidget><OpsControlsPanel ops={ops} setOps={setOps} /></DraggableWidget>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{
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
        <div style={{marginLeft:"auto", display:"flex", gap:14, alignItems:"center"}}>
          <span>Edmonton, AB</span>
          <span style={{color:T.t4}}>|</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><StatusDot color={T.blue} pulse={false} />Guardian: ACTIVE</span>
          <span style={{color:T.t4}}>|</span>
          <span style={{display:"flex",alignItems:"center",gap:5,color:T.green}}><StatusDot color={T.green} pulse={false} />Zero Trust: ON</span>
        </div>
      </div>

      {/* OmniSpatialHost — universal modal engine, portal-mounted */}
      <OmniSpatialHost />
    </div>
  );
}
