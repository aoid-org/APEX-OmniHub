/**
 * APEX OmniDash Layout — apps/omnihub-site
 * @version 2.0.0
 * @lastVerified 2026-02-21
 * @guardedBy APEX Regression Shield v1
 *
 * IMMUTABLE SECTIONS (requires explicit CTO approval to modify):
 * - Nav items list: any addition/removal must be reviewed
 * - ProtectedRoute wrapping: must never be removed
 * - supabase.auth.signOut() on logout: must never be bypassed
 *
 * DO NOT:
 * - Reduce nav items below 10 entries
 * - Import from src/ paths (wrong monorepo app)
 * - Import shadcn components from '@/components/ui/'
 * - Remove mobile hamburger menu
 *
 * OWNED BY: APEX Business Systems Ltd.
 * UNAUTHORIZED CHANGES WILL BE REVERTED.
 */

import { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2,
  LogOut, 
  ShieldCheck, 
  Home, 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  Plug, 
  Activity, 
  Database, 
  PlayCircle, 
  GitBranch,
  Brain,
  Menu,
  X
} from 'lucide-react';

import { DashboardOverview } from '@/pages/DashboardOverview';

// ----------------------------------------------------------------------------
// STRICT SPA CONSOLIDATION: No nested folders, no pages.
// All sub-views are generated inline for the omnihub-site placeholder app.
// ----------------------------------------------------------------------------
const ComingSoonPanel = ({ title, desc, icon: Icon }: { title: string; desc: string; icon: React.ElementType }) => (
  <div className="p-8 h-full flex flex-col">
    <div className="flex items-center gap-3 mb-8">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        <Icon className="w-6 h-6 text-purple-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-gray-400 text-sm">{desc}</p>
      </div>
    </div>
    
    <div className="bg-[#0a0a0a]/50 border border-white/5 rounded-xl p-8 text-center max-w-md mx-auto mt-20 backdrop-blur-md">
      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2 tracking-tight">Coming Soon</h3>
      <p className="text-sm text-gray-400">Integration with APEX Core modules is in progress.</p>
    </div>
  </div>
);

type PanelKey = 
  | 'pipeline' | 'kpis' | 'ops' | 'integrations'
  | 'events' | 'entities' | 'runs' | 'approvals' | 'workflows' 
  | null;

const PANEL_LABELS: Record<Exclude<PanelKey, null>, string> = {
  pipeline: 'Pipeline',
  kpis: 'KPIs',
  ops: 'Ops Console',
  integrations: 'Integrations',
  events: 'Events',
  entities: 'Entities',
  runs: 'Runs',
  approvals: 'Approvals',
  workflows: 'Workflow Studio',
};

const PanelFallback = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export function OmniDashLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Strict SPA Dialog Controller
  const [activePanel, setActivePanel] = useState<PanelKey>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', key: null, icon: Home },
    { name: 'Pipeline', key: 'pipeline', icon: TrendingUp },
    { name: 'KPIs', key: 'kpis', icon: Target },
    { name: 'Ops', key: 'ops', icon: AlertTriangle },
    { name: 'Integrations', key: 'integrations', icon: Plug },
    { name: 'Events', key: 'events', icon: Activity },
    { name: 'Entities', key: 'entities', icon: Database },
    { name: 'Runs', key: 'runs', icon: PlayCircle },
    { name: 'Approvals', key: 'approvals', icon: ShieldCheck },
    { name: 'Workflows', key: 'workflows', icon: GitBranch },
  ];

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'pipeline':     return <ComingSoonPanel title="Pipeline" desc="Deal tracking and revenue pipeline" icon={TrendingUp} />;
      case 'kpis':         return <ComingSoonPanel title="KPIs" desc="Key performance indicators" icon={Target} />;
      case 'ops':          return <ComingSoonPanel title="Ops Console" desc="System operations center" icon={AlertTriangle} />;
      case 'integrations': return <ComingSoonPanel title="Integrations" desc="Third-party service connections" icon={Plug} />;
      case 'events':       return <ComingSoonPanel title="Events" desc="System and audit events" icon={Activity} />;
      case 'entities':     return <ComingSoonPanel title="Entities" desc="Data models and graph relations" icon={Database} />;
      case 'runs':         return <ComingSoonPanel title="Runs" desc="Workflow execution history" icon={PlayCircle} />;
      case 'approvals':    return <ComingSoonPanel title="Approvals" desc="Governance and security gates" icon={ShieldCheck} />;
      case 'workflows':    return <ComingSoonPanel title="Workflow Studio" desc="Visual automation builder" icon={GitBranch} />;
      default:             return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#030303] text-white font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex justify-between items-center px-4 py-4 sticky top-0 z-50 bg-[#030303] border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            OmniDash
          </h1>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] bg-[#030303] z-40 overflow-y-auto border-b border-white/10">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key || 'overview'}
                  onClick={() => {
                    setActivePanel(item.key as PanelKey);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors w-full text-left ${
                    activePanel === item.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
              <button
                onClick={() => {
                  navigate('/apex');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors text-gray-400 hover:bg-white/5 hover:text-white w-full`}
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5" />
                  Connect AI
                </div>
                <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-gray-400">
                  Optional
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors rounded-lg"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-white/10 flex-col p-6 hidden md:flex sticky top-0 h-screen overflow-y-auto">
        <div className="mb-8 flex items-center gap-3">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            OmniDash
          </h1>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key || 'overview'}
                onClick={() => setActivePanel(item.key as PanelKey)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${
                  activePanel === item.key ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 mt-6 border-t border-white/10 space-y-1">
            <button
               onClick={() => navigate('/apex')}
               className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-gray-400 hover:bg-white/5 hover:text-white w-full`}
             >
             <div className="flex items-center gap-3">
               <Brain className="w-4 h-4 text-purple-400" />
               Connect AI
             </div>
             <span className="text-[10px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded-sm text-gray-400">
               Optional
             </span>
          </button>

          <div className="h-4" />
          <div className="border-t border-white/10 pt-4" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content — Static Background */}
      <main className="flex-1 overflow-auto relative z-0">
        <DashboardOverview />
      </main>

      {/* Strict SPA Overlay — Apple-grade Framer Motion Custom Dialog */}
      <AnimatePresence>
        {activePanel !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl h-full max-h-[90vh] bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-[#030303]/80 backdrop-blur-xl shrink-0 flex justify-between items-center z-10">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {PANEL_LABELS[activePanel]}
                </h2>
                <button 
                  onClick={() => setActivePanel(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
                <Suspense fallback={<PanelFallback />}>
                  {renderPanelContent()}
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
