import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LogOut, ShieldCheck, Home } from 'lucide-react';

export function OmniDashLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-[#030303] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col p-6 hidden md:flex sticky top-0 h-screen">
        <div className="mb-8">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            OmniDash
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            to="/omnidash"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
              isActive('/omnidash') ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            Overview
          </Link>
          <Link
            to="/omnidash/approvals"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
              isActive('/omnidash/approvals') ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Approvals
          </Link>
        </nav>

        <div className="pt-8 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden border-b border-white/10 p-4 flex justify-between items-center bg-[#030303] sticky top-0 z-10">
             <h1 className="text-lg font-bold">OmniDash</h1>
             <button onClick={handleLogout} className="text-gray-400 hover:text-white">
                <LogOut className="w-5 h-5" />
             </button>
             {/* Note: Mobile menu is simplified for now */}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
