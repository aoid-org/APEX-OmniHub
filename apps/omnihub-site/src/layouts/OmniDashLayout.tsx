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

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
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

export function OmniDashLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { name: 'Overview', path: '/omnidash', icon: Home },
    { name: 'Pipeline', path: '/omnidash/pipeline', icon: TrendingUp },
    { name: 'KPIs', path: '/omnidash/kpis', icon: Target },
    { name: 'Ops', path: '/omnidash/ops', icon: AlertTriangle },
    { name: 'Integrations', path: '/omnidash/integrations', icon: Plug },
    { name: 'Events', path: '/omnidash/events', icon: Activity },
    { name: 'Entities', path: '/omnidash/entities', icon: Database },
    { name: 'Runs', path: '/omnidash/runs', icon: PlayCircle },
    { name: 'Approvals', path: '/omnidash/approvals', icon: ShieldCheck },
    { name: 'Workflows', path: '/omnidash/workflows', icon: GitBranch },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#030303] text-white font-sans">
      
      {/* Mobile Header & Nav */}
      <div className="md:hidden border-b border-white/10 p-4 flex justify-between items-center bg-[#030303] sticky top-0 z-50">
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
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                    isActive(item.path) ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
              <Link
                to="/apex"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive('/apex') ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5" />
                  Connect AI
                </div>
                <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-gray-400">
                  Optional
                </span>
              </Link>
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
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.path) ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 mt-6 border-t border-white/10 space-y-1">
          <Link
             to="/apex"
             className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
               isActive('/apex') ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'
             }`}
           >
             <div className="flex items-center gap-3">
               <Brain className="w-4 h-4 text-purple-400" />
               Connect AI
             </div>
             <span className="text-[10px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded-sm text-gray-400">
               Optional
             </span>
          </Link>

          <div className="h-4" />
          <div className="border-t border-white/10 pt-4" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
