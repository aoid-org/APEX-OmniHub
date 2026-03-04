/**
 * APEX OmniDash Layout - apps/omnihub-site
 * @version 6.0.0 - Custom nav icons, Inter font, burnt orange accents
 *
 * 3-column CSS Grid: 260px | 1fr | 320px
 * Custom APEX-branded 3D nav icons (no Lucide in sidebar)
 * Lucide kept only for header utility icons (Search, Bell, Shield, ChevronDown)
 */

import { useState, useMemo, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, Bell, Shield, ChevronDown, Scan, Sun, Moon, X } from 'lucide-react';
import { DashboardOverview } from '@/pages/DashboardOverview';
import { UniversalModalEngine } from '../../../../src/components/omnidash/media/UniversalModalEngine';
import '@/styles/omnidash-layout.css';

// Custom nav icons
import navOmniboard from '@/assets/nav/omniboard_icon.png';
import navOmniskills from '@/assets/nav/omniskills_icon.png';
import navPhysiomni from '@/assets/nav/physiomni_icon.png';
import navAudits from '@/assets/nav/audits_icon.png';
import navLinks from '@/assets/nav/links_icon.png';
import navAutomations from '@/assets/nav/automations_icon.png';
import navWorkflows from '@/assets/nav/workflows_icon.png';
import navFiles from '@/assets/nav/files_icon.png';
import navBilling from '@/assets/nav/billing_icon.png';
import navSettings from '@/assets/nav/settings_icon.png';
import apexWordmark from '@/assets/apex_omnihub_wordmark.png';
import { APP_REGISTRY, type AppRegistryEntry } from '../../../../packages/core/src/registry';

// ────────────────────────────────────────────────
// Sidebar Navigation Map - custom icon images
// ────────────────────────────────────────────────
const NAV_ICON_MAP: Readonly<Record<string, string>> = {
  omniboard: navOmniboard,
  omniport: navLinks,
  maestro: navAutomations,
  fortress: navAudits,
  orchestrator: navWorkflows,
  omniskills: navOmniskills,
  physiomni: navPhysiomni,
  audits: navAudits,
  links: navLinks,
  automations: navAutomations,
  workflows: navWorkflows,
  files: navFiles,
  billing: navBilling,
  settings: navSettings,
};

const SIDEBAR_NAV = APP_REGISTRY.map((entry: AppRegistryEntry) => ({
  key: entry.key,
  label: entry.label,
  icon: NAV_ICON_MAP[entry.iconAssetKey] ?? navOmniboard,
  to: entry.routePath,
}));

const TRACE_FEED = [
  { color: '#34d399', text: 'Salesforce sync completed - 48 records' },
  { color: '#f97316', text: 'Invoice batch #1042 processed' },
  { color: '#f97316', text: 'Workflow "Lead Nurture" triggered' },
  { color: '#a78bfa', text: 'QuickBooks reconciliation done' },
  { color: '#34d399', text: 'Ticket #7291 auto-resolved by agent' },
];

// ────────────────────────────────────────────────
// Ops Controls toggle
// ────────────────────────────────────────────────
function Toggle({ checked, onChange }: Readonly<{ checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button
      type="button"
      className={`od-toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    />
  );
}

export function OmniDashLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [demoMode, setDemoMode] = useState(true);
  const [connectedEco, setConnectedEco] = useState(true);
  const [anonymizeKpis, setAnonymizeKpis] = useState(false);
  const [freezeMode, setFreezeMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    finally { navigate('/login'); }
  }, [navigate]);

  const initials = useMemo(() => 'JR', []);

  const activeNav = SIDEBAR_NAV.find(
    (n) => n.to === location.pathname || (n.to === '/omnidash' && location.pathname === '/omnidash'),
  )?.key ?? 'omniboard';

  return (
    <div className="omnidash-shell">
      {/* ────── LEFT SIDEBAR ────── */}
      <aside className="od-sidebar">
        <div className="od-sidebar-logo">
          <img src={apexWordmark} alt="APEX OmniHub" style={{ height: 26 }} />
        </div>

        <nav className="od-nav">
          {SIDEBAR_NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`od-nav-item transition-all duration-300 ease-out hover:translate-x-1 ${activeNav === item.key ? ' active' : ''}`}
            >
              <img src={item.icon} alt={item.label} className="nav-icon drop-shadow-md" />
              <span className="font-bold tracking-tight">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="od-sidebar-footer">
          <div className="od-sentry-status">
            <span className="od-sentry-dot" />{' '}
            <span>All Systems Operational</span>
          </div>
          <span>{'APEX Business Systems Ltd. \u00B7 OmniDash Platform'}</span>
          <button
            onClick={handleLogout}
            style={{
              display: 'block', marginTop: 8, fontSize: 13.375,
              color: '#64748b', cursor: 'pointer', background: 'none',
              border: 'none', padding: 0, fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ────── CENTER COLUMN ────── */}
      <div className="od-center">
        <header className="od-header">
          <div className="od-header-search" style={{ flex: 1, maxWidth: 470 }}>
            <Search />
            <input
              type="search"
              placeholder="Search workflows, connectors, traces..."
            />
          </div>

          <div style={{ flex: 1 }} />

          <div className="od-header-actions">
            <button 
              type="button" 
              className="od-avatar" 
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="od-org-badge">
              APEX Business Systems
              <ChevronDown className="h-3 w-3" />
            </div>

            <div className="od-sentry-badge">
              <Shield className="h-3 w-3" />
              Zero Trust Active
            </div>

            <button type="button" onClick={() => navigate('/omnidash/omniport')} className="od-connect-ai">Connect AI</button>

            <button type="button" className="od-avatar" aria-label="Notifications">
              <Bell className="h-3.5 w-3.5" />
            </button>

            <div className="od-avatar" title="User">
              {initials}
            </div>
          </div>
        </header>

        <div className={`od-content ${location.pathname === '/omnidash' ? '' : 'center-content-blur'}`}>
          {/* Dashboard is PERMANENT in the background */}
          <DashboardOverview />
        </div>

        {/* ────── UNIVERSAL SPA MODAL ────── */}
        {location.pathname !== '/omnidash' && (
          <div className="od-modal-overlay">
            <div className="od-modal-content hex-outer">
              <button 
                type="button" 
                className="od-modal-close"
                onClick={() => navigate('/omnidash')}
              >
                <X size={20} />
              </button>
              
              <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
                <Outlet />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────── RIGHT SIDEBAR ────── */}
      <aside className="od-right">
        {/* Ops Controls */}
        <div className="glass transition-all duration-300 ease-out hover:border-white/20 hover:-translate-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Ops Controls</div>
          <div className="od-toggle-row">
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#dfe6fe' }}>Demo Mode</span>
            <Toggle checked={demoMode} onChange={setDemoMode} />
          </div>
          <div className="od-toggle-row">
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#dfe6fe' }}>Connected Ecosystem</span>
            <Toggle checked={connectedEco} onChange={setConnectedEco} />
          </div>
          <div className="od-toggle-row">
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#dfe6fe' }}>Anonymize KPIs</span>
            <Toggle checked={anonymizeKpis} onChange={setAnonymizeKpis} />
          </div>
          <div className="od-toggle-row">
            <span className="font-semibold tracking-tight text-sm" style={{ color: '#dfe6fe' }}>Freeze Mode</span>
            <Toggle checked={freezeMode} onChange={setFreezeMode} />
          </div>
          <div className="mt-4 text-[10px] text-muted-foreground text-center font-mono uppercase tracking-wider">
            Running 24 tasks &middot; 96.8% success
          </div>
        </div>

        {/* OmniTrace */}
        <div className="glass transition-all duration-300 ease-out hover:border-white/20 hover:-translate-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">OmniTrace</div>
          {TRACE_FEED.map((item) => (
            <div key={item.text} className="od-trace-item transition-all duration-300 hover:translate-x-1">
              <span className="od-trace-dot shadow-[0_0_8px_currentColor]" style={{ background: item.color, color: item.color }} />
              <span className="text-xs font-medium tracking-tight" style={{ color: '#dfe6fe' }}>{item.text}</span>
            </div>
          ))}
          <button type="button" className="od-scan-btn mt-3 transition-all duration-300 hover:-translate-y-0.5 shadow-sm">
            ✦ REPLAY WORKFLOWS
          </button>
        </div>

        {/* Analytics */}
        <div className="glass transition-all duration-300 ease-out hover:border-white/20 hover:-translate-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Analytics</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all duration-300 hover:border-white/20 hover:-translate-y-1 shadow-sm">
              <div className="font-mono text-xl font-extrabold" style={{ color: '#dfe6fe' }}>27/50</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Tasks Today</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all duration-300 hover:border-white/20 hover:-translate-y-1 shadow-sm">
              <div className="font-mono text-xl font-extrabold text-[#34d399]">96.8%</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Success Rate</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all duration-300 hover:border-white/20 hover:-translate-y-1 shadow-sm">
              <div className="font-mono text-xl font-extrabold text-[#f97316]">842ms</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Avg. Latency</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all duration-300 hover:border-white/20 hover:-translate-y-1 shadow-sm">
              <div className="font-mono text-xl font-extrabold text-[#4ade80]">$3,240</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Cost Saved</div>
            </div>
          </div>
        </div>

        {/* Security Audit */}
        <div className="glass transition-all duration-300 ease-out hover:border-white/20 hover:-translate-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Security Audit</div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5 text-[#34d399] drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <div>
              <div className="text-sm font-extrabold tracking-tight" style={{ color: '#dfe6fe' }}>Zero Trust Active</div>
              <div className="text-xs font-semibold tracking-tight text-slate-400">All gateways secured</div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-mono">
            LAST SCAN: 12 MIN AGO
          </div>
          <button type="button" className="od-scan-btn transition-all duration-300 hover:-translate-y-0.5 shadow-sm text-xs font-bold tracking-widest uppercase">
            <Scan className="h-3 w-3 mr-1" />
            Scan Now
          </button>
        </div>
      </aside>

      {/* ────── GLOBAL MODAL ENGINE ────── */}
      <UniversalModalEngine />
    </div>
  );
}
